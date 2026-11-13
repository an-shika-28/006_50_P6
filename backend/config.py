import os
import secrets

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("METROPULSE_DB_PATH", os.path.join(BASE_DIR, "metropulse.db"))
SECRET_KEY = os.environ.get("METROPULSE_SECRET", secrets.token_hex(32))

# Academic demo staff credentials (for local evaluation of role-based dashboards)
DEMO_STAFF_ACCOUNTS = {
    "handler": {
        "username": "handler@metropulse.edu",
        "passcode": "metro-ops-2026",
        "role": "handler",
        "display_name": "Corridor Operations Handler",
    },
    "admin": {
        "username": "admin@metropulse.edu",
        "passcode": "metro-admin-2026",
        "role": "admin",
        "display_name": "Central Routing Administrator",
    },
}

VALID_CORRIDORS = ("East", "West", "Central")
VALID_CATEGORIES = ("Safety", "Technical", "Crowd", "Cleanliness", "Medical")
VALID_STATUSES = ("Pending", "Assigned", "In Progress", "Resolved")
VALID_PRIORITIES = ("P0", "P1", "P2", "P3", "P4")

ALLOWED_STATUS_TRANSITIONS = {
    "Pending": {"Assigned"},
    "Assigned": {"In Progress"},
    "In Progress": {"Resolved"},
    "Resolved": set(),
}

# Deterministic conflict resolution order if multiple anomaly patterns match
CATEGORY_CONFLICT_ORDER = {
    "Medical": 1,
    "Safety": 2,
    "Technical": 3,
    "Crowd": 4,
    "Cleanliness": 5,
}

PRIORITY_RANK = {
    "P0": 0,
    "P1": 1,
    "P2": 2,
    "P3": 3,
    "P4": 4,
}
