from flask import Blueprint, g, jsonify, request
from sqlalchemy import desc

from backend.automata.validator import validate_anomaly_identifier, validate_station_identifier
from backend.database import SessionLocal
from backend.models import AnomalyMapping, Assignment, Report, StationZoneRoute
from backend.routes.auth import require_role
from backend.services.classification import classify_anomaly
from backend.services.dispatch import dispatch_and_persist_report, serialize_report
from backend.services.status_service import transition_report_status

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@reports_bp.route("", methods=["POST"])
def create_report():
    data = request.get_json(silent=True) or {}
    reporter_name = (data.get("reporter_name") or "").strip()
    reporter_contact = (data.get("reporter_contact") or "").strip()
    raw_station = "" if data.get("station_code") is None else str(data.get("station_code"))
    raw_anomaly = "" if data.get("anomaly_code") is None else str(data.get("anomaly_code"))
    description = (data.get("description") or "").strip()
    urgency = (data.get("urgency") or "Normal").strip().title()
    location_detail = (data.get("location_detail") or "").strip()

    if not reporter_name or len(reporter_name) < 2:
        return jsonify({"error": "Reporter name is required (minimum 2 characters)."}), 400
    if not reporter_contact or len(reporter_contact) < 4:
        return jsonify({"error": "Reporter phone or email contact is required."}), 400
    if not description or len(description) < 8:
        return jsonify({"error": "Incident description is required (minimum 8 characters)."}), 400
    if urgency not in ("Low", "Normal", "High", "Critical"):
        urgency = "Normal"

    station_val = validate_station_identifier(raw_station)
    anomaly_val = validate_anomaly_identifier(raw_anomaly)

    if not station_val["valid"] or not anomaly_val["valid"]:
        errors = {}
        if not station_val["valid"]:
            errors["station_code"] = station_val["message"]
        if not anomaly_val["valid"]:
            errors["anomaly_code"] = anomaly_val["message"]
        return (
            jsonify(
                {
                    "error": "Identifier validation failed.",
                    "field_errors": errors,
                    "validation": {
                        "station": station_val,
                        "anomaly": anomaly_val,
                    },
                }
            ),
            400,
        )

    with SessionLocal() as session:
        classification = classify_anomaly(session, anomaly_val["normalized"], urgency)
        if not classification.mapped:
            return (
                jsonify(
                    {
                        "error": classification.reason,
                        "code": "UNMAPPED_ANOMALY",
                        "category": None,
                        "classification": classification.to_dict(),
                        "validation": {
                            "station": station_val,
                            "anomaly": anomaly_val,
                        },
                    }
                ),
                422,
            )

        result = dispatch_and_persist_report(
            session,
            reporter_name=reporter_name[:120],
            reporter_contact=reporter_contact[:160],
            original_station_code=station_val["original"][:32],
            normalized_station_code=station_val["normalized"],
            original_anomaly_code=anomaly_val["original"][:16],
            normalized_anomaly_code=anomaly_val["normalized"],
            location_detail=location_detail[:200],
            description=description[:2000],
            urgency=urgency,
            category=classification.category,
            matched_rule_id=classification.matched_rule_id,
            priority=classification.priority,
            classification_reason=classification.reason,
        )
        result["validation"] = {"station": station_val, "anomaly": anomaly_val}
        result["classification"] = classification.to_dict()
        return jsonify(result), 201


@reports_bp.route("/public", methods=["GET"])
def list_public_reports():
    """Public electronic incident board feed — excludes private reporter contact details."""
    zone = (request.args.get("zone") or "").strip()
    status = (request.args.get("status") or "").strip()
    limit = min(int(request.args.get("limit", 25)), 100)

    with SessionLocal() as session:
        q = session.query(Report)
        if zone and zone != "All":
            q = q.filter(Report.zone == zone)
        if status and status != "All":
            q = q.filter(Report.status == status)
        rows = q.order_by(desc(Report.created_at)).limit(limit).all()
        return jsonify({"reports": [serialize_report(r, include_private=False) for r in rows]})


@reports_bp.route("/public-meta", methods=["GET"])
def public_meta():
    """Non-sensitive demo prefixes and enabled anomaly mappings for the report terminal UI."""
    with SessionLocal() as session:
        stations = (
            session.query(StationZoneRoute)
            .filter(StationZoneRoute.enabled.is_(True))
            .order_by(StationZoneRoute.zone, StationZoneRoute.station_prefix)
            .all()
        )
        mappings = (
            session.query(AnomalyMapping)
            .filter(AnomalyMapping.enabled.is_(True))
            .order_by(AnomalyMapping.anomaly_code)
            .all()
        )
        return jsonify(
            {
                "stations": [
                    {
                        "station_prefix": s.station_prefix,
                        "station_label": s.station_label,
                        "zone": s.zone,
                        "is_demo_config": s.is_demo_config,
                    }
                    for s in stations
                ],
                "anomaly_mappings": [
                    {
                        "anomaly_code": m.anomaly_code,
                        "category": m.category,
                        "description": m.description,
                        "rule_id": m.rule_id,
                        "default_priority": m.default_priority,
                        "is_demo_mapping": m.is_demo_mapping,
                    }
                    for m in mappings
                ],
            }
        )


@reports_bp.route("", methods=["GET"])
@require_role("handler", "admin")
def list_reports_staff():
    zone = (request.args.get("zone") or "").strip()
    status = (request.args.get("status") or "").strip()
    category = (request.args.get("category") or "").strip()
    priority = (request.args.get("priority") or "").strip()
    handler_id = request.args.get("handler_id")
    sort_by = request.args.get("sort_by", "created_at")

    with SessionLocal() as session:
        q = session.query(Report)
        if zone and zone != "All":
            q = q.filter(Report.zone == zone)
        if status and status != "All":
            q = q.filter(Report.status == status)
        if category and category != "All":
            q = q.filter(Report.category == category)
        if priority and priority != "All":
            q = q.filter(Report.priority == priority)
        if handler_id:
            q = q.join(Assignment).filter(Assignment.handler_id == int(handler_id))

        if sort_by == "priority":
            q = q.order_by(Report.priority.asc(), desc(Report.created_at))
        elif sort_by == "oldest":
            q = q.order_by(Report.created_at.asc())
        else:
            q = q.order_by(desc(Report.created_at))

        rows = q.all()
        return jsonify({"reports": [serialize_report(r, include_private=True) for r in rows]})


@reports_bp.route("/<string:report_code>", methods=["GET"])
def get_report_by_code(report_code: str):
    code = report_code.strip().upper()
    with SessionLocal() as session:
        report = session.query(Report).filter(Report.unique_report_code == code).first()
        if not report:
            return jsonify({"error": f"No report found matching ID '{code}'."}), 404
        return jsonify({"report": serialize_report(report, include_private=False)})


@reports_bp.route("/<int:report_id>/status", methods=["PATCH"])
@require_role("handler", "admin")
def update_report_status(report_id: int):
    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()
    note = (data.get("note") or "").strip()
    actor = f"{g.current_user['role']}:{g.current_user['username']}"

    with SessionLocal() as session:
        ok, message, report = transition_report_status(session, report_id, new_status, actor, note)
        if not report:
            return jsonify({"error": message}), 404
        if not ok:
            return jsonify({"error": message}), 400
        return jsonify({"message": message, "report": serialize_report(report, include_private=True)})
