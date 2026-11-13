from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from sqlalchemy import desc

from backend.config import VALID_CATEGORIES, VALID_CORRIDORS, VALID_PRIORITIES
from backend.database import SessionLocal
from backend.models import (
    AnomalyMapping,
    Assignment,
    DispatchLog,
    Handler,
    QueueItem,
    Report,
    RoutingRule,
    StationZoneRoute,
    StatusHistory,
)
from backend.routes.auth import require_role

routing_bp = Blueprint("routing", __name__, url_prefix="/api/routing")


@routing_bp.route("/table", methods=["GET"])
@require_role("handler", "admin")
def get_routing_table():
    with SessionLocal() as session:
        stations = session.query(StationZoneRoute).order_by(StationZoneRoute.zone, StationZoneRoute.station_prefix).all()
        rules = session.query(RoutingRule).order_by(RoutingRule.zone, RoutingRule.priority).all()
        mappings = session.query(AnomalyMapping).order_by(AnomalyMapping.anomaly_code).all()

        return jsonify(
            {
                "stations": [
                    {
                        "id": s.id,
                        "station_prefix": s.station_prefix,
                        "station_label": s.station_label,
                        "zone": s.zone,
                        "control_room": s.control_room,
                        "is_demo_config": s.is_demo_config,
                        "enabled": s.enabled,
                    }
                    for s in stations
                ],
                "rules": [
                    {
                        "id": r.id,
                        "zone": r.zone,
                        "category": r.category,
                        "priority": r.priority,
                        "target_team": r.target_team,
                        "backup_target": r.backup_target,
                        "escalation_target": r.escalation_target,
                        "enabled": r.enabled,
                    }
                    for r in rules
                ],
                "anomaly_mappings": [
                    {
                        "id": m.id,
                        "anomaly_code": m.anomaly_code,
                        "pattern_regex": m.pattern_regex,
                        "category": m.category,
                        "rule_id": m.rule_id,
                        "priority_rank": m.priority_rank,
                        "default_priority": m.default_priority,
                        "description": m.description,
                        "is_demo_mapping": m.is_demo_mapping,
                        "enabled": m.enabled,
                    }
                    for m in mappings
                ],
            }
        )


@routing_bp.route("/logs", methods=["GET"])
@require_role("handler", "admin")
def get_dispatch_logs():
    limit = min(int(request.args.get("limit", 100)), 250)
    with SessionLocal() as session:
        logs = (
            session.query(DispatchLog, Report.unique_report_code)
            .join(Report, DispatchLog.report_id == Report.id)
            .order_by(desc(DispatchLog.timestamp), desc(DispatchLog.id))
            .limit(limit)
            .all()
        )
        return jsonify(
            {
                "logs": [
                    {
                        "id": dl.id,
                        "report_id": dl.report_id,
                        "report_code": report_code,
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
                    for dl, report_code in logs
                ]
            }
        )


@routing_bp.route("/queues", methods=["GET"])
@require_role("handler", "admin")
def get_queues():
    """Returns queues ordered deterministically: priority_rank ASC, queued_at ASC, report_id ASC."""
    with SessionLocal() as session:
        items = (
            session.query(QueueItem, Report)
            .join(Report, QueueItem.report_id == Report.id)
            .order_by(QueueItem.priority_rank.asc(), QueueItem.queued_at.asc(), QueueItem.report_id.asc())
            .all()
        )
        return jsonify(
            {
                "queues": [
                    {
                        "id": q.id,
                        "report_id": q.report_id,
                        "report_code": r.unique_report_code,
                        "station_code": r.normalized_station_code,
                        "zone": r.zone,
                        "category": r.category,
                        "queue_type": q.queue_type,
                        "priority": q.priority,
                        "priority_rank": q.priority_rank,
                        "state": q.state,
                        "reason": q.reason,
                        "queued_at": q.queued_at.isoformat() if q.queued_at else None,
                    }
                    for q, r in items
                ]
            }
        )


@routing_bp.route("/rules/<int:rule_id>", methods=["PUT"])
@require_role("admin")
def update_routing_rule(rule_id: int):
    data = request.get_json(silent=True) or {}
    with SessionLocal() as session:
        rule = session.query(RoutingRule).filter(RoutingRule.id == rule_id).first()
        if not rule:
            return jsonify({"error": f"Routing rule {rule_id} not found."}), 404

        if "priority" in data and data["priority"] in VALID_PRIORITIES:
            rule.priority = data["priority"]
        if "target_team" in data and str(data["target_team"]).strip():
            rule.target_team = str(data["target_team"]).strip()[:120]
        if "backup_target" in data:
            rule.backup_target = str(data["backup_target"]).strip()[:120]
        if "escalation_target" in data:
            rule.escalation_target = str(data["escalation_target"]).strip()[:120]
        if "enabled" in data:
            rule.enabled = bool(data["enabled"])

        session.commit()
        session.refresh(rule)
        return jsonify(
            {
                "message": f"Routing rule {rule.zone} / {rule.category} updated.",
                "rule": {
                    "id": rule.id,
                    "zone": rule.zone,
                    "category": rule.category,
                    "priority": rule.priority,
                    "target_team": rule.target_team,
                    "backup_target": rule.backup_target,
                    "escalation_target": rule.escalation_target,
                    "enabled": rule.enabled,
                },
            }
        )


@routing_bp.route("/stations", methods=["POST"])
@require_role("admin")
def add_station_route():
    data = request.get_json(silent=True) or {}
    prefix = (data.get("station_prefix") or "").strip().upper()
    label = (data.get("station_label") or "").strip()
    zone = (data.get("zone") or "").strip().title()
    control_room = (data.get("control_room") or "").strip()

    if len(prefix) != 5 or not prefix.startswith("STA") or not prefix[3:].isalpha():
        return jsonify({"error": "Station prefix must be STA + 2 uppercase letters (e.g., STANE)."}), 400
    if zone not in VALID_CORRIDORS:
        return jsonify({"error": f"Zone must be one of: {', '.join(VALID_CORRIDORS)}."}), 400

    with SessionLocal() as session:
        if session.query(StationZoneRoute).filter(StationZoneRoute.station_prefix == prefix).first():
            return jsonify({"error": f"Station prefix '{prefix}' already exists."}), 409
        route = StationZoneRoute(
            station_prefix=prefix,
            station_label=label or f"{prefix} Station",
            zone=zone,
            control_room=control_room or f"{zone} Corridor Control Room",
            is_demo_config=False,
            enabled=True,
        )
        session.add(route)
        session.commit()
        session.refresh(route)
        return jsonify({"station": {"id": route.id, "station_prefix": route.station_prefix, "zone": route.zone}}), 201


@routing_bp.route("/stations/<int:station_id>", methods=["PATCH"])
@require_role("admin")
def toggle_station_route(station_id: int):
    data = request.get_json(silent=True) or {}
    with SessionLocal() as session:
        route = session.query(StationZoneRoute).filter(StationZoneRoute.id == station_id).first()
        if not route:
            return jsonify({"error": "Station route not found."}), 404
        if "enabled" in data:
            route.enabled = bool(data["enabled"])
        if "zone" in data and data["zone"] in VALID_CORRIDORS:
            route.zone = data["zone"]
        session.commit()
        return jsonify({"message": f"Station prefix {route.station_prefix} updated."})


@routing_bp.route("/mappings/<int:mapping_id>", methods=["PATCH"])
@require_role("admin")
def update_anomaly_mapping(mapping_id: int):
    data = request.get_json(silent=True) or {}
    with SessionLocal() as session:
        mapping = session.query(AnomalyMapping).filter(AnomalyMapping.id == mapping_id).first()
        if not mapping:
            return jsonify({"error": "Anomaly mapping not found."}), 404
        if "category" in data and data["category"] in VALID_CATEGORIES:
            mapping.category = data["category"]
        if "default_priority" in data and data["default_priority"] in VALID_PRIORITIES:
            mapping.default_priority = data["default_priority"]
        if "enabled" in data:
            mapping.enabled = bool(data["enabled"])
        session.commit()
        return jsonify({"message": f"Anomaly mapping {mapping.anomaly_code} updated."})


@routing_bp.route("/assign-queued/<int:report_id>", methods=["POST"])
@require_role("admin")
def manual_assign_queued(report_id: int):
    data = request.get_json(silent=True) or {}
    handler_id = data.get("handler_id")
    override_capacity = bool(data.get("override_capacity", False))

    with SessionLocal() as session:
        report = session.query(Report).filter(Report.id == report_id).first()
        handler = session.query(Handler).filter(Handler.id == handler_id).first() if handler_id else None
        if not report or not handler:
            return jsonify({"error": "Report or handler not found."}), 404
        if report.assignment and report.assignment.handler_id:
            return jsonify({"error": "Report already has an assigned handler."}), 409
        if handler.active_load >= handler.capacity_limit and not override_capacity:
            return jsonify({"error": "Handler is at full capacity. Explicit admin override required."}), 409

        now = datetime.now(timezone.utc)
        handler.active_load += 1
        if report.assignment:
            report.assignment.handler_id = handler.id
            report.assignment.target_label = f"{handler.name} ({handler.team})"
            report.assignment.assignment_status = "Active"
            report.assignment.reason = "Admin manual dispatch from queue."
        else:
            session.add(
                Assignment(
                    report_id=report.id,
                    handler_id=handler.id,
                    target_label=f"{handler.name} ({handler.team})",
                    assigned_at=now,
                    assignment_status="Active",
                    is_backup=False,
                    reason="Admin manual dispatch from queue.",
                )
            )
        if report.queue_item:
            report.queue_item.state = "Dispatched"

        old_status = report.status
        if old_status == "Pending":
            report.status = "Assigned"
            session.add(
                StatusHistory(
                    report_id=report.id,
                    old_status="Pending",
                    new_status="Assigned",
                    actor_id="admin:manual-dispatch",
                    timestamp=now,
                    note=f"Manually dispatched to {handler.name} (capacity override={override_capacity}).",
                )
            )
        session.add(
            DispatchLog(
                report_id=report.id,
                routing_key=report.normalized_station_code[:5],
                zone=handler.zone,
                category=report.category,
                priority=report.priority,
                target=f"{handler.name} ({handler.team})",
                rule_matched="ADMIN-OVERRIDE",
                decision="AdminManualDispatch",
                reason=f"Admin dispatched queued report (override_capacity={override_capacity}).",
                timestamp=now,
            )
        )
        session.commit()
        return jsonify({"message": f"Report {report.unique_report_code} assigned to {handler.name}."})
