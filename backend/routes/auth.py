import base64
import hashlib
import hmac
import json
import time
from functools import wraps
from flask import Blueprint, g, jsonify, request
from backend.config import DEMO_STAFF_ACCOUNTS, SECRET_KEY

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _sign_token(payload: dict) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    b64 = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"


def verify_token(token: str):
    try:
        if not token or "." not in token:
            return None
        b64, sig = token.split(".", 1)
        expected = hmac.new(SECRET_KEY.encode("utf-8"), b64.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        pad = "=" * ((4 - len(b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(b64 + pad).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def require_role(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            token = header[7:].strip() if header.startswith("Bearer ") else ""
            user = verify_token(token)
            if not user:
                return jsonify({"error": "Authentication required. Please sign in via Staff Login."}), 401
            if allowed_roles and user.get("role") not in allowed_roles:
                return jsonify({"error": f"Insufficient permissions. Required role: {', '.join(allowed_roles)}."}), 403
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    passcode = (data.get("passcode") or "").strip()

    matched_account = None
    for acct in DEMO_STAFF_ACCOUNTS.values():
        if acct["username"].lower() == username and acct["passcode"] == passcode:
            matched_account = acct
            break

    if not matched_account:
        return jsonify({"error": "Invalid staff credentials."}), 401

    payload = {
        "username": matched_account["username"],
        "role": matched_account["role"],
        "display_name": matched_account["display_name"],
        "exp": int(time.time()) + 60 * 60 * 12,
    }
    token = _sign_token(payload)
    return jsonify(
        {
            "token": token,
            "user": {
                "username": payload["username"],
                "role": payload["role"],
                "display_name": payload["display_name"],
            },
        }
    )


@auth_bp.route("/me", methods=["GET"])
def me():
    header = request.headers.get("Authorization", "")
    token = header[7:].strip() if header.startswith("Bearer ") else ""
    user = verify_token(token)
    if not user:
        return jsonify({"authenticated": False, "user": None}), 200
    return jsonify(
        {
            "authenticated": True,
            "user": {
                "username": user["username"],
                "role": user["role"],
                "display_name": user["display_name"],
            },
        }
    )
