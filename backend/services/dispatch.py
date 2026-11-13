import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from sqlalchemy import text

from backend.config import PRIORITY_RANK
from backend.models import (
    Assignment,
    DispatchLog,
    Handler,
    QueueItem,
    Report,
    RoutingRule,
    StationZoneRoute,
    StatusHistory,
)

# In-process lock paired with SQLite BEGIN IMMEDIATE transaction for safe concurrency
_dispatch_lock = threading.Lock()


def generate_report_code() -> str:
    stamp = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = uuid.uuid4().hex[:6].upper()
    return f"MP-{stamp}-{suffix}"


def serialize_report(report: Report, include_private: bool = False) -> Dict[str, Any]:
    assignment_data = None
    if report.assignment:
        a = report.assignment
        assignment_data = {
            "id": a.id,
            "handler_id": a.handler_id,
            "handler_code": a.handler.handler_code if a.handler else None,
            "handler_name": a.handler.name if a.handler else None,
            "target_label": a.target_label,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
            "assignment_status": a.assignment_status,
            "is_backup": a.is_backup,
            "reason": a.reason,
        }

    queue_data = None
    if report.queue_item:
        q = report.queue_item
        queue_data = {
            "id": q.id,
            "queue_type": q.queue_type,
            "priority": q.priority,
            "state": q.state,
            "reason": q.reason,
            "queued_at": q.queued_at.isoformat() if q.queued_at else None,
        }

    data = {
        "id": report.id,
        "report_code": report.unique_report_code,
        "station_code": report.normalized_station_code,
        "original_station_code": report.original_station_code,
        "anomaly_code": report.anomaly_code,
        "location_detail": report.location_detail,
        "description": report.description,
        "urgency": report.urgency,
        "category": report.category,
        "matched_rule_id": report.matched_rule_id,
        "priority": report.priority,
        "zone": report.zone,
        "validation_status": report.validation_status,
        "validation_message": report.validation_message,
        "status": report.status,
        "is_demo": report.is_demo,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
        "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
        "assignment": assignment_data,
        "queue_item": queue_data,
        "status_history": [
            {
                "id": sh.id,
                "old_status": sh.old_status,
                "new_status": sh.new_status,
                "actor_id": sh.actor_id,
                "timestamp": sh.timestamp.isoformat() if sh.timestamp else None,
                "note": sh.note,
            }
            for sh in (report.status_history or [])
        ],
        "dispatch_logs": [
            {
                "id": dl.id,
                "routing_key": dl.routing_key,
                "zone": dl.zone,
                "category": dl.category,
                "priority": dl.priority,
                "target": dl.target,
                "rule_matched": dl.rule_matched,
                "decision": dl.decision,
                "reason": dl.reason,
                "timestamp": dl.timestamp.isoformat() if dl.timestamp else None,
            }
            for dl in (report.dispatch_logs or [])
        ],
    }

    if include_private:
        data["reporter_name"] = report.reporter_name
        data["reporter_contact"] = report.reporter_contact
    else:
        # Public tracking never leaks contact info
        data["reporter_name"] = report.reporter_name.split(" ")[0] + " (Verified)" if report.reporter_name else "Passenger"

    return data


def _pick_handler(candidates, category: str) -> Optional[Handler]:
    """
    Deterministic handler selection:
    1. Specialization match first (exact category match > General)
    2. Least-loaded (lowest active_load)
    3. Remaining capacity (highest headroom)
    4. Stable tie-breaker: handler_code ascending
    """
    if not candidates:
        return None
    candidates.sort(
        key=lambda h: (
            0 if h.specialization == category else (1 if h.specialization == "General" else 2),
            h.active_load,
            h.handler_code,
        )
    )
    return candidates[0]


def dispatch_and_persist_report(
    session,
    *,
    reporter_name: str,
    reporter_contact: str,
    original_station_code: str,
    normalized_station_code: str,
    original_anomaly_code: str,
    normalized_anomaly_code: str,
    location_detail: str,
    description: str,
    urgency: str,
    category: str,
    matched_rule_id: str,
    priority: str,
    classification_reason: str,
) -> Dict[str, Any]:
    """
    Transaction-safe routing & dispatch engine.
    Prevents duplicate assignments and over-capacity handler loads under simultaneous submissions.
    """
    routing_key = normalized_station_code[:5]
    now = datetime.now(timezone.utc)

    with _dispatch_lock:
        # Acquire SQLite immediate write lock so concurrent processes cannot oversubscribe a handler
        session.execute(text("BEGIN IMMEDIATE"))
        try:
            station_route = (
                session.query(StationZoneRoute)
                .filter(
                    StationZoneRoute.station_prefix == routing_key,
                    StationZoneRoute.enabled.is_(True),
                )
                .first()
            )
            detected_zone = station_route.zone if station_route else "Unknown"

            report = Report(
                unique_report_code=generate_report_code(),
                reporter_name=reporter_name.strip(),
                reporter_contact=reporter_contact.strip(),
                original_station_code=original_station_code,
                normalized_station_code=normalized_station_code,
                original_anomaly_code=original_anomaly_code,
                anomaly_code=normalized_anomaly_code,
                location_detail=location_detail.strip(),
                description=description.strip(),
                urgency=urgency,
                category=category,
                matched_rule_id=matched_rule_id,
                priority=priority,
                zone=detected_zone,
                validation_status="Accepted",
                validation_message="DFA and Regex validation passed.",
                status="Pending",
                is_demo=False,
                created_at=now,
                updated_at=now,
            )
            session.add(report)
            session.flush()

            session.add(
                StatusHistory(
                    report_id=report.id,
                    old_status=None,
                    new_status="Pending",
                    actor_id="system:intake",
                    timestamp=now,
                    note=f"Report validated and classified ({classification_reason}).",
                )
            )

            decision = ""
            target_label = ""
            reason = ""
            assigned_handler: Optional[Handler] = None
            is_backup = False

            # RULE 1: MEDICAL EMERGENCY OVERRIDE -> ALWAYS Central Emergency Line regardless of corridor/unknown zone
            if category == "Medical":
                effective_zone = "Central"
                med_handlers = (
                    session.query(Handler)
                    .filter(
                        Handler.enabled.is_(True),
                        Handler.availability == "Available",
                        Handler.zone == "Central",
                        Handler.specialization.in_(["Medical", "General"]),
                        Handler.active_load < Handler.capacity_limit,
                    )
                    .all()
                )
                chosen = _pick_handler(med_handlers, "Medical")
                if chosen:
                    chosen.active_load += 1
                    assigned_handler = chosen
                    target_label = f"Central Emergency Line — {chosen.name}"
                    decision = "MedicalEmergencyOverride"
                    reason = (
                        f"Medical override triggered from zone '{detected_zone}': "
                        f"routed directly to Central Emergency Line ({chosen.handler_code})."
                    )
                    report.status = "Assigned"
                    session.add(
                        Assignment(
                            report_id=report.id,
                            handler_id=chosen.id,
                            target_label=target_label,
                            assigned_at=now,
                            assignment_status="Active",
                            is_backup=False,
                            reason=reason,
                        )
                    )
                    session.add(
                        StatusHistory(
                            report_id=report.id,
                            old_status="Pending",
                            new_status="Assigned",
                            actor_id="system:emergency-override",
                            timestamp=now,
                            note=reason,
                        )
                    )
                else:
                    target_label = "Central Emergency Line (Direct Escalation)"
                    decision = "MedicalEmergencyEscalated"
                    reason = (
                        f"Medical override triggered from zone '{detected_zone}': "
                        "all Central Medical handlers busy/full; escalated directly to Central Emergency Line."
                    )
                    session.add(
                        Assignment(
                            report_id=report.id,
                            handler_id=None,
                            target_label=target_label,
                            assigned_at=now,
                            assignment_status="Escalated",
                            is_backup=False,
                            reason=reason,
                        )
                    )
                    session.add(
                        QueueItem(
                            report_id=report.id,
                            queue_type="Escalated",
                            priority=priority,
                            priority_rank=PRIORITY_RANK.get(priority, 0),
                            queued_at=now,
                            state="Queued",
                            reason=reason,
                        )
                    )

                session.add(
                    DispatchLog(
                        report_id=report.id,
                        routing_key=routing_key,
                        zone=effective_zone,
                        category=category,
                        priority=priority,
                        target=target_label,
                        rule_matched=matched_rule_id,
                        decision=decision,
                        reason=reason,
                        timestamp=now,
                    )
                )

            # RULE 2: UNKNOWN STATION PREFIX -> Central Fallback / Correction Queue (do not guess corridor)
            elif detected_zone == "Unknown":
                target_label = "Central Fallback / Correction Queue"
                decision = "UnknownZoneFallback"
                reason = (
                    f"Station prefix '{routing_key}' is not mapped in the corridor routing table; "
                    "sent to Central Fallback / Correction Queue without guessing a corridor."
                )
                session.add(
                    QueueItem(
                        report_id=report.id,
                        queue_type="FallbackCorrection",
                        priority=priority,
                        priority_rank=PRIORITY_RANK.get(priority, 3),
                        queued_at=now,
                        state="Queued",
                        reason=reason,
                    )
                )
                session.add(
                    DispatchLog(
                        report_id=report.id,
                        routing_key=routing_key,
                        zone="Unknown",
                        category=category,
                        priority=priority,
                        target=target_label,
                        rule_matched=matched_rule_id,
                        decision=decision,
                        reason=reason,
                        timestamp=now,
                    )
                )

            # RULE 3: STANDARD CORRIDOR DISPATCH (East, West, Central)
            else:
                routing_rule = (
                    session.query(RoutingRule)
                    .filter(
                        RoutingRule.zone == detected_zone,
                        RoutingRule.category == category,
                        RoutingRule.enabled.is_(True),
                    )
                    .first()
                )

                # Step A: Eligible Primary Handlers in the corridor
                primary_candidates = (
                    session.query(Handler)
                    .filter(
                        Handler.enabled.is_(True),
                        Handler.availability == "Available",
                        Handler.zone == detected_zone,
                        Handler.specialization.in_([category, "General"]),
                        Handler.active_load < Handler.capacity_limit,
                    )
                    .all()
                )
                chosen = _pick_handler(primary_candidates, category)

                if chosen:
                    chosen.active_load += 1
                    assigned_handler = chosen
                    target_label = f"{chosen.name} ({chosen.team})"
                    decision = "AssignedPrimary"
                    reason = (
                        f"Routed via {routing_key} -> {detected_zone} Corridor; "
                        f"selected least-loaded eligible handler {chosen.handler_code} "
                        f"(load {chosen.active_load}/{chosen.capacity_limit})."
                    )
                    report.status = "Assigned"
                    session.add(
                        Assignment(
                            report_id=report.id,
                            handler_id=chosen.id,
                            target_label=target_label,
                            assigned_at=now,
                            assignment_status="Active",
                            is_backup=False,
                            reason=reason,
                        )
                    )
                    session.add(
                        StatusHistory(
                            report_id=report.id,
                            old_status="Pending",
                            new_status="Assigned",
                            actor_id="system:dispatcher",
                            timestamp=now,
                            note=reason,
                        )
                    )
                else:
                    # Step B: Eligible Backup Handler (same zone any specialization, or cross-zone backup target)
                    backup_candidates = (
                        session.query(Handler)
                        .filter(
                            Handler.enabled.is_(True),
                            Handler.availability == "Available",
                            Handler.active_load < Handler.capacity_limit,
                            Handler.zone == detected_zone,
                        )
                        .all()
                    )
                    if not backup_candidates and routing_rule and routing_rule.backup_target:
                        backup_candidates = (
                            session.query(Handler)
                            .filter(
                                Handler.enabled.is_(True),
                                Handler.availability == "Available",
                                Handler.active_load < Handler.capacity_limit,
                                Handler.team == routing_rule.backup_target,
                            )
                            .all()
                        )

                    backup_chosen = _pick_handler(backup_candidates, category)
                    if backup_chosen:
                        backup_chosen.active_load += 1
                        assigned_handler = backup_chosen
                        is_backup = True
                        target_label = f"{backup_chosen.name} ({backup_chosen.team}) [BACKUP]"
                        decision = "AssignedBackup"
                        reason = (
                            f"No primary {category} handler available in {detected_zone} Corridor; "
                            f"dispatched to backup handler {backup_chosen.handler_code} "
                            f"(load {backup_chosen.active_load}/{backup_chosen.capacity_limit})."
                        )
                        report.status = "Assigned"
                        session.add(
                            Assignment(
                                report_id=report.id,
                                handler_id=backup_chosen.id,
                                target_label=target_label,
                                assigned_at=now,
                                assignment_status="Active",
                                is_backup=True,
                                reason=reason,
                            )
                        )
                        session.add(
                            QueueItem(
                                report_id=report.id,
                                queue_type="Backup",
                                priority=priority,
                                priority_rank=PRIORITY_RANK.get(priority, 3),
                                queued_at=now,
                                state="Dispatched",
                                reason=reason,
                            )
                        )
                        session.add(
                            StatusHistory(
                                report_id=report.id,
                                old_status="Pending",
                                new_status="Assigned",
                                actor_id="system:backup-dispatcher",
                                timestamp=now,
                                note=reason,
                            )
                        )
                    elif routing_rule and routing_rule.escalation_target:
                        # Step C: Escalate to Control Room Target
                        target_label = routing_rule.escalation_target
                        decision = "EscalatedToControlRoom"
                        reason = (
                            f"All primary and backup handlers in {detected_zone} Corridor are unavailable or at full capacity; "
                            f"escalated to {target_label}."
                        )
                        session.add(
                            QueueItem(
                                report_id=report.id,
                                queue_type="Escalated",
                                priority=priority,
                                priority_rank=PRIORITY_RANK.get(priority, 3),
                                queued_at=now,
                                state="Queued",
                                reason=reason,
                            )
                        )
                    else:
                        # Step D: Waiting Queue
                        target_label = f"{detected_zone} Corridor Waiting Queue"
                        decision = "QueuedWaiting"
                        reason = (
                            f"All handlers in {detected_zone} Corridor at capacity and no escalation target configured; "
                            "placed in deterministic priority waiting queue."
                        )
                        session.add(
                            QueueItem(
                                report_id=report.id,
                                queue_type="Waiting",
                                priority=priority,
                                priority_rank=PRIORITY_RANK.get(priority, 3),
                                queued_at=now,
                                state="Queued",
                                reason=reason,
                            )
                        )

                session.add(
                    DispatchLog(
                        report_id=report.id,
                        routing_key=routing_key,
                        zone=detected_zone,
                        category=category,
                        priority=priority,
                        target=target_label,
                        rule_matched=matched_rule_id,
                        decision=decision,
                        reason=reason,
                        timestamp=now,
                    )
                )

            session.commit()
            session.refresh(report)
            return {
                "report": serialize_report(report, include_private=True),
                "dispatch_summary": {
                    "routing_key": routing_key,
                    "zone": detected_zone,
                    "routed_zone": "Central" if category == "Medical" else detected_zone,
                    "medical_override": category == "Medical",
                    "decision": decision,
                    "target": target_label,
                    "is_backup": is_backup,
                    "handler_code": assigned_handler.handler_code if assigned_handler else None,
                    "reason": reason,
                },
            }
        except Exception:
            session.rollback()
            raise
