from flask import Blueprint, jsonify, request
from backend.database import SessionLocal
from backend.models import Handler
from backend.routes.auth import require_role

handlers_bp = Blueprint("handlers", __name__, url_prefix="/api/handlers")


def serialize_handler(h: Handler) -> dict:
    return {
        "id": h.id,
        "handler_code": h.handler_code,
        "name": h.name,
        "team": h.team,
        "zone": h.zone,
        "specialization": h.specialization,
        "availability": h.availability,
        "capacity_limit": h.capacity_limit,
        "active_load": h.active_load,
        "remaining_capacity": max(0, h.capacity_limit - h.active_load),
        "eligible": h.enabled and h.availability == "Available" and h.active_load < h.capacity_limit,
        "enabled": h.enabled,
    }


@handlers_bp.route("", methods=["GET"])
@require_role("handler", "admin")
def list_handlers():
    zone = (request.args.get("zone") or "").strip()
    with SessionLocal() as session:
        q = session.query(Handler)
        if zone and zone != "All":
            q = q.filter(Handler.zone == zone)
        rows = q.order_by(Handler.zone, Handler.handler_code).all()
        return jsonify({"handlers": [serialize_handler(h) for h in rows]})


@handlers_bp.route("/<int:handler_id>/availability", methods=["PATCH"])
@require_role("handler", "admin")
def update_availability(handler_id: int):
    data = request.get_json(silent=True) or {}
    availability = (data.get("availability") or "").strip().title()
    if availability not in ("Available", "Busy", "Offline"):
        return jsonify({"error": "Availability must be one of: Available, Busy, Offline."}), 400

    with SessionLocal() as session:
        handler = session.query(Handler).filter(Handler.id == handler_id).first()
        if not handler:
            return jsonify({"error": f"Handler {handler_id} not found."}), 404
        handler.availability = availability
        session.commit()
        session.refresh(handler)
        return jsonify({"message": f"{handler.name} marked as {availability}.", "handler": serialize_handler(handler)})


@handlers_bp.route("/<int:handler_id>/capacity", methods=["PATCH"])
@require_role("handler", "admin")
def update_capacity(handler_id: int):
    data = request.get_json(silent=True) or {}
    try:
        cap = int(data.get("capacity_limit"))
    except (TypeError, ValueError):
        return jsonify({"error": "capacity_limit must be an integer."}), 400

    if cap < 0 or cap > 25:
        return jsonify({"error": "capacity_limit must be between 0 and 25."}), 400

    with SessionLocal() as session:
        handler = session.query(Handler).filter(Handler.id == handler_id).first()
        if not handler:
            return jsonify({"error": f"Handler {handler_id} not found."}), 404
        handler.capacity_limit = cap
        session.commit()
        session.refresh(handler)
        return jsonify({"message": f"{handler.name} capacity updated to {cap}.", "handler": serialize_handler(handler)})


@handlers_bp.route("/<int:handler_id>/enabled", methods=["PATCH"])
@require_role("admin")
def update_enabled(handler_id: int):
    data = request.get_json(silent=True) or {}
    enabled = bool(data.get("enabled", True))
    with SessionLocal() as session:
        handler = session.query(Handler).filter(Handler.id == handler_id).first()
        if not handler:
            return jsonify({"error": f"Handler {handler_id} not found."}), 404
        handler.enabled = enabled
        session.commit()
        session.refresh(handler)
        return jsonify({"handler": serialize_handler(handler)})
