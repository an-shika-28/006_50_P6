import concurrent.futures
import os
import tempfile
import pytest
from sqlalchemy.orm import sessionmaker

import backend.database as db_module
from backend.app import create_app
from backend.automata.validator import validate_anomaly_identifier, validate_station_identifier
from backend.models import AnomalyMapping, Handler, QueueItem, Report
from backend.services.classification import classify_anomaly


@pytest.fixture()
def client():
    fd, tmp_db = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    test_engine = db_module.make_engine(tmp_db)
    TestSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)

    orig_engine = db_module.engine
    orig_session = db_module.SessionLocal
    db_module.engine = test_engine
    db_module.SessionLocal = TestSession

    # Patch SessionLocal references inside route modules
    import backend.routes.reports as r_reports
    import backend.routes.handlers as r_handlers
    import backend.routes.routing as r_routing
    import backend.routes.analytics as r_analytics
    import backend.routes.validation as r_validation

    for mod in (r_reports, r_handlers, r_routing, r_analytics, r_validation):
        mod.SessionLocal = TestSession

    app = create_app(test_engine=test_engine, seed=True)
    app.config["TESTING"] = True

    yield app, TestSession

    db_module.engine = orig_engine
    db_module.SessionLocal = orig_session
    test_engine.dispose()
    if os.path.exists(tmp_db):
        os.remove(tmp_db)


def _auth_headers(client, role="admin"):
    creds = (
        {"username": "admin@metropulse.edu", "passcode": "metro-admin-2026"}
        if role == "admin"
        else {"username": "handler@metropulse.edu", "passcode": "metro-ops-2026"}
    )
    res = client.post("/api/auth/login", json=creds)
    assert res.status_code == 200
    token = res.get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


# TC-01: Valid station code STAEC123
def test_tc01_valid_station_code():
    res = validate_station_identifier("STAEC123")
    assert res["dfa"]["accepted"] is True
    assert res["regex"]["accepted"] is True
    assert res["agreement"] is True


# TC-02: Incomplete station code STAEC12
def test_tc02_incomplete_station_code():
    res = validate_station_identifier("STAEC12")
    assert res["dfa"]["accepted"] is False
    assert res["regex"]["accepted"] is False
    assert res["reason_code"] == "INCOMPLETE"


# TC-03: Extra digit station code STAEC1234
def test_tc03_extra_digit_station_code():
    res = validate_station_identifier("STAEC1234")
    assert res["dfa"]["accepted"] is False
    assert res["regex"]["accepted"] is False
    assert res["reason_code"] == "TOO_LONG"


# TC-04: Digit in alphabetic slot STA1C123
def test_tc04_digit_in_alpha_slot():
    res = validate_station_identifier("STA1C123")
    assert res["dfa"]["accepted"] is False
    assert res["regex"]["accepted"] is False
    assert res["reason_code"] == "BAD_CHAR_POSITION"


# TC-05: Valid anomaly code A01
def test_tc05_valid_anomaly_code():
    res = validate_anomaly_identifier("A01")
    assert res["dfa"]["accepted"] is True
    assert res["regex"]["accepted"] is True


# TC-06: Incomplete anomaly code A1
def test_tc06_incomplete_anomaly_code():
    res = validate_anomaly_identifier("A1")
    assert res["dfa"]["accepted"] is False
    assert res["regex"]["accepted"] is False
    assert res["reason_code"] == "INCOMPLETE"


# TC-07: Wrong prefix anomaly code B01
def test_tc07_wrong_prefix_anomaly_code():
    res = validate_anomaly_identifier("B01")
    assert res["dfa"]["accepted"] is False
    assert res["regex"]["accepted"] is False
    assert res["reason_code"] == "BAD_PREFIX"


# TC-07B: DFA and Regex agreement corpus
def test_tc07b_dfa_regex_agreement(client):
    app, _ = client
    test_client = app.test_client()
    res = test_client.get("/api/validation/corpus")
    assert res.status_code == 200
    data = res.get_json()
    assert data["all_agreed"] is True


# TC-08: Syntactically valid but unmapped anomaly code
def test_tc08_unmapped_anomaly_code(client):
    app, _ = client
    test_client = app.test_client()
    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Alex Rider",
            "reporter_contact": "alex@example.com",
            "station_code": "STAEC123",
            "anomaly_code": "A99",
            "description": "Unmapped test anomaly code should not silently classify.",
            "urgency": "Normal",
        },
    )
    assert res.status_code == 422
    data = res.get_json()
    assert data["code"] == "UNMAPPED_ANOMALY"
    assert data["category"] is None


# TC-09: All five approved category mappings
def test_tc09_all_five_category_mappings(client):
    _, Session = client
    expected = {
        "A01": "Safety",
        "A02": "Technical",
        "A03": "Crowd",
        "A04": "Cleanliness",
        "A05": "Medical",
    }
    with Session() as session:
        for code, cat in expected.items():
            res = classify_anomaly(session, code, "Normal")
            assert res.mapped is True
            assert res.category == cat


# TC-10: Two classification patterns match (conflict priority)
def test_tc10_conflicting_classification_patterns(client):
    _, Session = client
    with Session() as session:
        # Add overlapping regex pattern for A01 as Cleanliness; Safety must beat Cleanliness
        session.add(
            AnomalyMapping(
                anomaly_code="A01",
                pattern_regex=r"^A0[1-2]$",
                category="Cleanliness",
                rule_id="RULE-CONFLICT-TEST",
                priority_rank=1,
                default_priority="P3",
                description="Conflict test pattern",
                is_demo_mapping=True,
                enabled=True,
            )
        )
        session.commit()
        res = classify_anomaly(session, "A01", "Normal")
        assert res.conflict_detected is True
        assert res.category == "Safety"
        assert res.matched_rule_id == "RULE-DEMO-01"


# TC-11: East-zone non-medical routing
def test_tc11_east_corridor_routing(client):
    app, _ = client
    test_client = app.test_client()
    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Priya Verma",
            "reporter_contact": "priya@example.com",
            "station_code": "staec123",
            "anomaly_code": "a02",
            "description": "Ticket barrier motor stalled at Eastgate Concourse.",
            "urgency": "High",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["report"]["station_code"] == "STAEC123"
    assert data["report"]["zone"] == "East"
    assert data["report"]["category"] == "Technical"
    assert data["dispatch_summary"]["routed_zone"] == "East"
    assert data["report"]["status"] == "Assigned"


# TC-12: West-zone non-medical routing
def test_tc12_west_corridor_routing(client):
    app, _ = client
    test_client = app.test_client()
    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Samira Patel",
            "reporter_contact": "samira@example.com",
            "station_code": "STAWX007",
            "anomaly_code": "A03",
            "description": "Platform crowding at Westpark Interchange.",
            "urgency": "High",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["report"]["zone"] == "West"
    assert data["report"]["category"] == "Crowd"


# TC-13: Central-zone non-medical routing
def test_tc13_central_corridor_routing(client):
    app, _ = client
    test_client = app.test_client()
    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Jordan Lee",
            "reporter_contact": "jordan@example.com",
            "station_code": "STACC404",
            "anomaly_code": "A04",
            "description": "Spilled beverage on Central concourse floor.",
            "urgency": "Normal",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["report"]["zone"] == "Central"
    assert data["report"]["category"] == "Cleanliness"


# TC-14: Medical emergency override from East/West/Central
def test_tc14_medical_emergency_override(client):
    app, _ = client
    test_client = app.test_client()
    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Elena Rostova",
            "reporter_contact": "elena@example.com",
            "station_code": "STAEC555",
            "anomaly_code": "A05",
            "description": "Passenger fainted near Eastgate platform 1.",
            "urgency": "Critical",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["report"]["zone"] == "East"
    assert data["report"]["category"] == "Medical"
    assert data["report"]["priority"] == "P0"
    assert data["dispatch_summary"]["medical_override"] is True
    assert data["dispatch_summary"]["routed_zone"] == "Central"
    assert "Central Emergency Line" in data["dispatch_summary"]["target"]


# TC-15: Unknown station prefix -> Central fallback/correction queue
def test_tc15_unknown_station_prefix_fallback(client):
    app, _ = client
    test_client = app.test_client()
    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Noah Kim",
            "reporter_contact": "noah@example.com",
            "station_code": "STAZZ999",
            "anomaly_code": "A01",
            "description": "Loose handrail reported at unmapped station code.",
            "urgency": "Normal",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["report"]["zone"] == "Unknown"
    assert data["report"]["status"] == "Pending"
    assert data["dispatch_summary"]["decision"] == "UnknownZoneFallback"
    assert data["report"]["queue_item"]["queue_type"] == "FallbackCorrection"


# TC-16: Primary handler unavailable -> Backup handler assigned
def test_tc16_backup_dispatch_when_primary_unavailable(client):
    app, Session = client
    test_client = app.test_client()
    with Session() as session:
        # Mark East Safety primary handler HND-E01 Offline
        h_primary = session.query(Handler).filter_by(handler_code="HND-E01").first()
        h_primary.availability = "Offline"
        session.commit()

    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Maya Lin",
            "reporter_contact": "maya@example.com",
            "station_code": "STAEC201",
            "anomaly_code": "A01",
            "description": "Safety gate latch malfunction on East platform.",
            "urgency": "High",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    # HND-E03 (General in East) picks it up; if all General also full, backup picks it up
    assert data["report"]["status"] == "Assigned"
    assert data["report"]["assignment"]["handler_code"] in ("HND-E03", "HND-E02", "HND-C02")


# TC-17: All corridor handlers at capacity -> Escalation / Waiting queue (no over-assignment)
def test_tc17_capacity_overflow_no_over_assignment(client):
    app, Session = client
    test_client = app.test_client()
    with Session() as session:
        for h in session.query(Handler).all():
            h.active_load = h.capacity_limit
        session.commit()

    res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Omar Farooq",
            "reporter_contact": "omar@example.com",
            "station_code": "STAEC300",
            "anomaly_code": "A02",
            "description": "Display board blank at Eastgate mezzanine.",
            "urgency": "Normal",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["report"]["status"] == "Pending"
    assert data["dispatch_summary"]["decision"] in ("EscalatedToControlRoom", "QueuedWaiting")
    with Session() as session:
        for h in session.query(Handler).all():
            assert h.active_load <= h.capacity_limit


# TC-18: Deterministic Queue Ordering (Priority ASC, Timestamp ASC, Report ID ASC)
def test_tc18_queue_ordering(client):
    app, Session = client
    test_client = app.test_client()
    with Session() as session:
        for h in session.query(Handler).all():
            h.active_load = h.capacity_limit
        session.commit()

    # Submit P3 then P1
    test_client.post(
        "/api/reports",
        json={
            "reporter_name": "User Low",
            "reporter_contact": "u1@example.com",
            "station_code": "STAEC310",
            "anomaly_code": "A04",
            "description": "Routine cleanliness issue queued first.",
            "urgency": "Low",
        },
    )
    test_client.post(
        "/api/reports",
        json={
            "reporter_name": "User High",
            "reporter_contact": "u2@example.com",
            "station_code": "STAEC311",
            "anomaly_code": "A01",
            "description": "Critical safety issue queued second but higher priority.",
            "urgency": "Critical",
        },
    )

    headers = _auth_headers(test_client, "admin")
    q_res = test_client.get("/api/routing/queues", headers=headers)
    assert q_res.status_code == 200
    queues = q_res.get_json()["queues"]
    assert len(queues) >= 2
    ranks = [q["priority_rank"] for q in queues]
    assert ranks == sorted(ranks)


# TC-19: Simultaneous dispatch requests never exceed capacity or duplicate assign
def test_tc19_simultaneous_dispatch_concurrency(client):
    app, Session = client
    test_client = app.test_client()
    with Session() as session:
        # Leave only 1 slot available across all East & Central backup handlers
        for h in session.query(Handler).all():
            h.active_load = h.capacity_limit
        target = session.query(Handler).filter_by(handler_code="HND-E02").first()
        target.capacity_limit = 2
        target.active_load = 1
        session.commit()

    def submit_one(i):
        with app.test_client() as thread_client:
            return thread_client.post(
                "/api/reports",
                json={
                    "reporter_name": f"Concurrent User {i}",
                    "reporter_contact": f"c{i}@example.com",
                    "station_code": f"STAEC70{i}",
                    "anomaly_code": "A02",
                    "description": f"Concurrent technical anomaly submission #{i}.",
                    "urgency": "Normal",
                },
            )

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(pool.map(submit_one, range(4)))

    assert all(r.status_code == 201 for r in responses)
    assigned = [r.get_json()["report"] for r in responses if r.get_json()["report"]["status"] == "Assigned"]
    assert len(assigned) == 1
    with Session() as session:
        target = session.query(Handler).filter_by(handler_code="HND-E02").first()
        assert target.active_load == target.capacity_limit


# TC-20: Handler updates Assigned -> In Progress -> Resolved and history persists
def test_tc20_status_lifecycle_transitions(client):
    app, _ = client
    test_client = app.test_client()
    create_res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Life Cycle",
            "reporter_contact": "lc@example.com",
            "station_code": "STACC101",
            "anomaly_code": "A03",
            "description": "Crowd density rising at Central Gate 3.",
            "urgency": "Normal",
        },
    )
    report = create_res.get_json()["report"]
    rid = report["id"]
    headers = _auth_headers(test_client, "handler")

    r1 = test_client.patch(f"/api/reports/{rid}/status", json={"status": "In Progress", "note": "Team arrived"}, headers=headers)
    assert r1.status_code == 200
    assert r1.get_json()["report"]["status"] == "In Progress"

    r2 = test_client.patch(f"/api/reports/{rid}/status", json={"status": "Resolved", "note": "Cleared"}, headers=headers)
    assert r2.status_code == 200
    resolved = r2.get_json()["report"]
    assert resolved["status"] == "Resolved"
    assert resolved["resolved_at"] is not None
    assert len(resolved["status_history"]) >= 4


# TC-21: Invalid status transition rejected
def test_tc21_invalid_status_transition_rejected(client):
    app, _ = client
    test_client = app.test_client()
    create_res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Invalid Jump",
            "reporter_contact": "ij@example.com",
            "station_code": "STACC102",
            "anomaly_code": "A04",
            "description": "Trash bin overflow at Central platform.",
            "urgency": "Normal",
        },
    )
    rid = create_res.get_json()["report"]["id"]
    headers = _auth_headers(test_client, "handler")

    # Cannot jump Assigned -> Resolved directly without In Progress
    bad = test_client.patch(f"/api/reports/{rid}/status", json={"status": "Resolved"}, headers=headers)
    assert bad.status_code == 400
    assert "Invalid status transition" in bad.get_json()["error"]


# TC-22: Submit report then search by unique Report ID (privacy enforced)
def test_tc22_public_tracking_persistence_and_privacy(client):
    app, _ = client
    test_client = app.test_client()
    create_res = test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Private Reporter",
            "reporter_contact": "+1-555-0199-SECRET",
            "station_code": "STAWC888",
            "anomaly_code": "A01",
            "description": "Loose stair nosing at Westbridge.",
            "urgency": "High",
        },
    )
    code = create_res.get_json()["report"]["report_code"]

    track_res = test_client.get(f"/api/reports/{code}")
    assert track_res.status_code == 200
    tracked = track_res.get_json()["report"]
    assert tracked["report_code"] == code
    assert "reporter_contact" not in tracked


# TC-23: Analytics integration reflects database counts
def test_tc23_analytics_database_backed(client):
    app, _ = client
    test_client = app.test_client()
    before = test_client.get("/api/analytics").get_json()["total_matching"]
    test_client.post(
        "/api/reports",
        json={
            "reporter_name": "Analytics User",
            "reporter_contact": "ana@example.com",
            "station_code": "STAEC901",
            "anomaly_code": "A02",
            "description": "Lighting flicker on East corridor platform.",
            "urgency": "Normal",
        },
    )
    after = test_client.get("/api/analytics").get_json()["total_matching"]
    assert after == before + 1
