from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request
from sqlalchemy import func

from backend.config import VALID_CATEGORIES, VALID_CORRIDORS, VALID_STATUSES
from backend.database import SessionLocal
from backend.models import Handler, Report, StationZoneRoute

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api")


@analytics_bp.route("/dashboard/summary", methods=["GET"])
def dashboard_summary():
    with SessionLocal() as session:
        total = session.query(func.count(Report.id)).scalar() or 0
        pending = session.query(func.count(Report.id)).filter(Report.status == "Pending").scalar() or 0
        assigned = session.query(func.count(Report.id)).filter(Report.status == "Assigned").scalar() or 0
        in_progress = session.query(func.count(Report.id)).filter(Report.status == "In Progress").scalar() or 0
        resolved = session.query(func.count(Report.id)).filter(Report.status == "Resolved").scalar() or 0
        medical = session.query(func.count(Report.id)).filter(Report.category == "Medical").scalar() or 0

        return jsonify(
            {
                "total_reports": total,
                "pending_reports": pending,
                "assigned_reports": assigned,
                "in_progress_reports": in_progress,
                "resolved_reports": resolved,
                "medical_reports": medical,
            }
        )


@analytics_bp.route("/stations/map", methods=["GET"])
def stations_map():
    """Returns clickable schematic corridor station nodes backed by database counts."""
    with SessionLocal() as session:
        routes = (
            session.query(StationZoneRoute)
            .filter(StationZoneRoute.enabled.is_(True))
            .order_by(StationZoneRoute.zone, StationZoneRoute.id)
            .all()
        )
        reports = session.query(Report).all()

        stations = []
        for idx, route in enumerate(routes):
            matching = [r for r in reports if r.normalized_station_code.startswith(route.station_prefix)]
            active = [r for r in matching if r.status != "Resolved"]
            cat_counts = {c: 0 for c in VALID_CATEGORIES}
            for r in matching:
                if r.category in cat_counts:
                    cat_counts[r.category] += 1

            # Sample code for display like STAEC123 if reports exist, else prefix + 001 (Demo)
            sample_code = matching[0].normalized_station_code if matching else f"{route.station_prefix}001"
            latest_handler = (
                matching[0].assignment.target_label
                if matching and matching[0].assignment
                else route.control_room
            )

            stations.append(
                {
                    "id": route.id,
                    "station_prefix": route.station_prefix,
                    "sample_station_code": sample_code,
                    "station_label": route.station_label,
                    "zone": route.zone,
                    "control_room": route.control_room,
                    "is_demo_config": route.is_demo_config,
                    "total_incidents": len(matching),
                    "active_incidents": len(active),
                    "category_breakdown": cat_counts,
                    "latest_handler": latest_handler,
                    "recent_reports": [
                        {
                            "report_code": r.unique_report_code,
                            "station_code": r.normalized_station_code,
                            "category": r.category,
                            "priority": r.priority,
                            "status": r.status,
                            "is_demo": r.is_demo,
                        }
                        for r in sorted(matching, key=lambda x: x.created_at, reverse=True)[:4]
                    ],
                }
            )

        return jsonify({"stations": stations})


@analytics_bp.route("/analytics", methods=["GET"])
def get_analytics():
    zone = (request.args.get("zone") or "").strip()
    category = (request.args.get("category") or "").strip()
    status = (request.args.get("status") or "").strip()
    days = request.args.get("days", "all")

    with SessionLocal() as session:
        q = session.query(Report)
        if zone and zone != "All":
            q = q.filter(Report.zone == zone)
        if category and category != "All":
            q = q.filter(Report.category == category)
        if status and status != "All":
            q = q.filter(Report.status == status)
        if days in ("1", "7", "30"):
            cutoff = datetime.now(timezone.utc) - timedelta(days=int(days))
            q = q.filter(Report.created_at >= cutoff)

        reports = q.all()

        zones_list = list(VALID_CORRIDORS) + (["Unknown"] if any(r.zone == "Unknown" for r in reports) else [])
        by_zone = [
            {"zone": z, "count": sum(1 for r in reports if r.zone == z)}
            for z in zones_list
        ]
        by_category = [
            {"category": c, "count": sum(1 for r in reports if r.category == c)}
            for c in VALID_CATEGORIES
        ]
        by_status = [
            {"status": s, "count": sum(1 for r in reports if r.status == s)}
            for s in VALID_STATUSES
        ]

        resolved_durations = []
        for r in reports:
            if r.status == "Resolved" and r.resolved_at and r.created_at:
                c_at = r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at
                r_at = r.resolved_at.replace(tzinfo=timezone.utc) if r.resolved_at.tzinfo is None else r.resolved_at
                mins = max(0.0, (r_at - c_at).total_seconds() / 60.0)
                resolved_durations.append(mins)

        avg_resolution_minutes = (
            round(sum(resolved_durations) / len(resolved_durations), 1)
            if resolved_durations
            else None
        )

        handlers = session.query(Handler).all()
        handler_utilization = [
            {
                "handler_code": h.handler_code,
                "name": h.name,
                "zone": h.zone,
                "active_load": h.active_load,
                "capacity_limit": h.capacity_limit,
                "availability": h.availability,
            }
            for h in handlers
        ]

        return jsonify(
            {
                "total_matching": len(reports),
                "resolved_count": sum(1 for r in reports if r.status == "Resolved"),
                "unresolved_count": sum(1 for r in reports if r.status != "Resolved"),
                "avg_resolution_minutes": avg_resolution_minutes,
                "by_zone": by_zone,
                "by_category": by_category,
                "by_status": by_status,
                "handler_utilization": handler_utilization,
            }
        )
