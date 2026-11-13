from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend.config import DB_PATH
from backend.models import (
    AnomalyMapping,
    Assignment,
    Base,
    DispatchLog,
    Handler,
    QueueItem,
    Report,
    RoutingRule,
    StationZoneRoute,
    StatusHistory,
)


def make_engine(db_path: str = DB_PATH):
    url = f"sqlite:///{db_path}" if not db_path.startswith("sqlite:") else db_path
    engine = create_engine(
        url,
        connect_args={"check_same_thread": False, "timeout": 15},
        future=True,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.close()

    return engine


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db(target_engine=None, seed: bool = True):
    eng = target_engine or engine
    Base.metadata.create_all(bind=eng)
    if seed:
        LocalSession = sessionmaker(bind=eng, autoflush=False, autocommit=False, expire_on_commit=False)
        with LocalSession() as session:
            seed_initial_data(session)


def seed_initial_data(session):
    # 1. Configurable Demo Station Prefix -> Corridor Zone Routes
    if session.query(StationZoneRoute).count() == 0:
        stations = [
            StationZoneRoute(
                station_prefix="STAEC",
                station_label="Eastgate Concourse (Demo)",
                zone="East",
                control_room="East Corridor Control Room",
                is_demo_config=True,
                enabled=True,
            ),
            StationZoneRoute(
                station_prefix="STAED",
                station_label="East Docklands Terminal (Demo)",
                zone="East",
                control_room="East Corridor Control Room",
                is_demo_config=True,
                enabled=True,
            ),
            StationZoneRoute(
                station_prefix="STAWC",
                station_label="Westbridge Junction (Demo)",
                zone="West",
                control_room="West Corridor Control Room",
                is_demo_config=True,
                enabled=True,
            ),
            StationZoneRoute(
                station_prefix="STAWX",
                station_label="Westpark Interchange (Demo)",
                zone="West",
                control_room="West Corridor Control Room",
                is_demo_config=True,
                enabled=True,
            ),
            StationZoneRoute(
                station_prefix="STACC",
                station_label="Central Grand Concourse (Demo)",
                zone="Central",
                control_room="Central Corridor Control Room",
                is_demo_config=True,
                enabled=True,
            ),
            StationZoneRoute(
                station_prefix="STACM",
                station_label="Central Market Hub (Demo)",
                zone="Central",
                control_room="Central Corridor Control Room",
                is_demo_config=True,
                enabled=True,
            ),
        ]
        session.add_all(stations)

    # 2. Configurable Illustrative Demo Anomaly Code -> Category Mappings
    if session.query(AnomalyMapping).count() == 0:
        mappings = [
            AnomalyMapping(
                anomaly_code="A01",
                pattern_regex=r"^A01$",
                category="Safety",
                rule_id="RULE-DEMO-01",
                priority_rank=2,
                default_priority="P1",
                description="Platform edge / slip hazard / safety concern (Demo Mapping)",
                is_demo_mapping=True,
                enabled=True,
            ),
            AnomalyMapping(
                anomaly_code="A02",
                pattern_regex=r"^A02$",
                category="Technical",
                rule_id="RULE-DEMO-02",
                priority_rank=3,
                default_priority="P2",
                description="Escalator, fare gate, signal, or equipment breakdown (Demo Mapping)",
                is_demo_mapping=True,
                enabled=True,
            ),
            AnomalyMapping(
                anomaly_code="A03",
                pattern_regex=r"^A03$",
                category="Crowd",
                rule_id="RULE-DEMO-03",
                priority_rank=4,
                default_priority="P2",
                description="Platform congestion or passenger bottleneck (Demo Mapping)",
                is_demo_mapping=True,
                enabled=True,
            ),
            AnomalyMapping(
                anomaly_code="A04",
                pattern_regex=r"^A04$",
                category="Cleanliness",
                rule_id="RULE-DEMO-04",
                priority_rank=5,
                default_priority="P3",
                description="Spillage, sanitation, or concourse upkeep (Demo Mapping)",
                is_demo_mapping=True,
                enabled=True,
            ),
            AnomalyMapping(
                anomaly_code="A05",
                pattern_regex=r"^A05$",
                category="Medical",
                rule_id="RULE-DEMO-05",
                priority_rank=1,
                default_priority="P0",
                description="Passenger medical emergency — Central Emergency Line Override (Demo Mapping)",
                is_demo_mapping=True,
                enabled=True,
            ),
        ]
        session.add_all(mappings)

    # 3. Handlers across East, West, Central
    if session.query(Handler).count() == 0:
        handlers = [
            Handler(
                handler_code="HND-E01",
                name="R. Deshmukh",
                team="East Safety & Platform Unit",
                zone="East",
                specialization="Safety",
                availability="Available",
                capacity_limit=3,
                active_load=1,
                enabled=True,
            ),
            Handler(
                handler_code="HND-E02",
                name="K. Takahashi",
                team="East Systems Engineering",
                zone="East",
                specialization="Technical",
                availability="Available",
                capacity_limit=3,
                active_load=0,
                enabled=True,
            ),
            Handler(
                handler_code="HND-E03",
                name="M. Alverez",
                team="East Station Services",
                zone="East",
                specialization="General",
                availability="Available",
                capacity_limit=2,
                active_load=0,
                enabled=True,
            ),
            Handler(
                handler_code="HND-W01",
                name="S. Nair",
                team="West Transit Operations",
                zone="West",
                specialization="Technical",
                availability="Available",
                capacity_limit=3,
                active_load=1,
                enabled=True,
            ),
            Handler(
                handler_code="HND-W02",
                name="L. Vance",
                team="West Crowd & Safety Unit",
                zone="West",
                specialization="Crowd",
                availability="Available",
                capacity_limit=3,
                active_load=0,
                enabled=True,
            ),
            Handler(
                handler_code="HND-C01",
                name="Dr. A. Kapoor",
                team="Central Emergency Line",
                zone="Central",
                specialization="Medical",
                availability="Available",
                capacity_limit=5,
                active_load=0,
                enabled=True,
            ),
            Handler(
                handler_code="HND-C02",
                name="J. Kowalski",
                team="Central Concourse Command",
                zone="Central",
                specialization="General",
                availability="Available",
                capacity_limit=4,
                active_load=1,
                enabled=True,
            ),
        ]
        session.add_all(handlers)

    # 4. Explicit Routing Rules (Zone x Category)
    if session.query(RoutingRule).count() == 0:
        rules = []
        zone_teams = {
            "East": ("East Corridor Operations", "Central Concourse Command", "East Corridor Control Room"),
            "West": ("West Transit Operations", "Central Concourse Command", "West Corridor Control Room"),
            "Central": ("Central Concourse Command", "East Corridor Operations", "Central Corridor Control Room"),
        }
        cat_defaults = {
            "Safety": "P1",
            "Technical": "P2",
            "Crowd": "P2",
            "Cleanliness": "P3",
            "Medical": "P0",
        }
        for z, (primary, backup, esc) in zone_teams.items():
            for cat, prio in cat_defaults.items():
                if cat == "Medical":
                    rules.append(
                        RoutingRule(
                            zone=z,
                            category=cat,
                            priority="P0",
                            target_team="Central Emergency Line",
                            backup_target="Central Concourse Command",
                            escalation_target="Central Emergency Line Supervisor",
                            enabled=True,
                        )
                    )
                else:
                    rules.append(
                        RoutingRule(
                            zone=z,
                            category=cat,
                            priority=prio,
                            target_team=primary,
                            backup_target=backup,
                            escalation_target=esc,
                            enabled=True,
                        )
                    )
        session.add_all(rules)

    session.flush()

    # 5. Clearly Labeled Illustrative Demo Reports (so initial board, map, and analytics are alive & database-backed)
    if session.query(Report).count() == 0:
        now = datetime.now(timezone.utc)
        h_e1 = session.query(Handler).filter_by(handler_code="HND-E01").first()
        h_w1 = session.query(Handler).filter_by(handler_code="HND-W01").first()
        h_c2 = session.query(Handler).filter_by(handler_code="HND-C02").first()

        demo_specs = [
            {
                "code": "MP-DEMO-1001",
                "name": "Demo Passenger A",
                "contact": "demo1@example.invalid",
                "station": "STAEC123",
                "anomaly": "A01",
                "loc": "Platform 2 North Stairwell",
                "desc": "[DEMO SEED] Wet tile surface near Eastgate Concourse platform edge tactile strip.",
                "urgency": "High",
                "cat": "Safety",
                "rule_id": "RULE-DEMO-01",
                "prio": "P1",
                "zone": "East",
                "status": "In Progress",
                "handler": h_e1,
                "created": now - timedelta(minutes=42),
                "resolved": None,
            },
            {
                "code": "MP-DEMO-1002",
                "name": "Demo Passenger B",
                "contact": "demo2@example.invalid",
                "station": "STAWC204",
                "anomaly": "A02",
                "loc": "Westbridge Gate Bank B",
                "desc": "[DEMO SEED] Automated fare gate #4 card reader unresponsive during peak transfer.",
                "urgency": "Normal",
                "cat": "Technical",
                "rule_id": "RULE-DEMO-02",
                "prio": "P2",
                "zone": "West",
                "status": "Assigned",
                "handler": h_w1,
                "created": now - timedelta(minutes=25),
                "resolved": None,
            },
            {
                "code": "MP-DEMO-1003",
                "name": "Demo Passenger C",
                "contact": "demo3@example.invalid",
                "station": "STACC010",
                "anomaly": "A03",
                "loc": "Central Transfer Mezzanine",
                "desc": "[DEMO SEED] Elevated passenger queue buildup on Central interchange escalator landing.",
                "urgency": "High",
                "cat": "Crowd",
                "rule_id": "RULE-DEMO-03",
                "prio": "P2",
                "zone": "Central",
                "status": "Assigned",
                "handler": h_c2,
                "created": now - timedelta(minutes=14),
                "resolved": None,
            },
            {
                "code": "MP-DEMO-1004",
                "name": "Demo Passenger D",
                "contact": "demo4@example.invalid",
                "station": "STAWX007",
                "anomaly": "A04",
                "loc": "Concourse West Exit",
                "desc": "[DEMO SEED] Beverage spill near Westpark ticket kiosk cleared and dried.",
                "urgency": "Low",
                "cat": "Cleanliness",
                "rule_id": "RULE-DEMO-04",
                "prio": "P3",
                "zone": "West",
                "status": "Resolved",
                "handler": h_w1,
                "created": now - timedelta(minutes=95),
                "resolved": now - timedelta(minutes=68),
            },
        ]

        for item in demo_specs:
            rep = Report(
                unique_report_code=item["code"],
                reporter_name=item["name"],
                reporter_contact=item["contact"],
                original_station_code=item["station"],
                normalized_station_code=item["station"],
                original_anomaly_code=item["anomaly"],
                anomaly_code=item["anomaly"],
                location_detail=item["loc"],
                description=item["desc"],
                urgency=item["urgency"],
                category=item["cat"],
                matched_rule_id=item["rule_id"],
                priority=item["prio"],
                zone=item["zone"],
                validation_status="Accepted",
                validation_message="DFA and Regex validation passed.",
                status=item["status"],
                is_demo=True,
                created_at=item["created"],
                updated_at=item["resolved"] or item["created"],
                resolved_at=item["resolved"],
            )
            session.add(rep)
            session.flush()

            h = item["handler"]
            session.add(
                Assignment(
                    report_id=rep.id,
                    handler_id=h.id if h else None,
                    target_label=f"{h.name} ({h.team})" if h else "Control Room",
                    assigned_at=item["created"] + timedelta(seconds=5),
                    assignment_status="Completed" if item["status"] == "Resolved" else "Active",
                    is_backup=False,
                    reason="Demo seed initial corridor assignment.",
                )
            )
            session.add(
                StatusHistory(
                    report_id=rep.id,
                    old_status=None,
                    new_status="Pending",
                    actor_id="system:intake",
                    timestamp=item["created"],
                    note="Demo seed report submitted and validated.",
                )
            )
            session.add(
                StatusHistory(
                    report_id=rep.id,
                    old_status="Pending",
                    new_status="Assigned",
                    actor_id="system:dispatcher",
                    timestamp=item["created"] + timedelta(seconds=5),
                    note=f"Assigned to {h.name} ({h.team}).",
                )
            )
            if item["status"] in ("In Progress", "Resolved"):
                session.add(
                    StatusHistory(
                        report_id=rep.id,
                        old_status="Assigned",
                        new_status="In Progress",
                        actor_id=f"handler:{h.handler_code}",
                        timestamp=item["created"] + timedelta(minutes=8),
                        note="Handler arrived at station zone.",
                    )
                )
            if item["status"] == "Resolved":
                session.add(
                    StatusHistory(
                        report_id=rep.id,
                        old_status="In Progress",
                        new_status="Resolved",
                        actor_id=f"handler:{h.handler_code}",
                        timestamp=item["resolved"],
                        note="Anomaly resolved and station area cleared.",
                    )
                )
            session.add(
                DispatchLog(
                    report_id=rep.id,
                    routing_key=item["station"][:5],
                    zone=item["zone"],
                    category=item["cat"],
                    priority=item["prio"],
                    target=f"{h.name} ({h.team})",
                    rule_matched=item["rule_id"],
                    decision="Assigned",
                    reason="Least-loaded eligible corridor handler selected (Demo Seed).",
                    timestamp=item["created"] + timedelta(seconds=5),
                )
            )

    session.commit()
