from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


class StationZoneRoute(Base):
    __tablename__ = "station_zone_routes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    station_prefix = Column(String(16), unique=True, nullable=False, index=True)
    station_label = Column(String(120), nullable=False)
    zone = Column(String(32), nullable=False)  # East, West, Central
    control_room = Column(String(120), nullable=False)
    is_demo_config = Column(Boolean, default=True, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)


class AnomalyMapping(Base):
    __tablename__ = "anomaly_mappings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    anomaly_code = Column(String(16), nullable=False, index=True)
    pattern_regex = Column(String(64), nullable=False)
    category = Column(String(32), nullable=False)
    rule_id = Column(String(32), unique=True, nullable=False)
    priority_rank = Column(Integer, default=10, nullable=False)
    default_priority = Column(String(8), default="P3", nullable=False)
    description = Column(String(200), nullable=False)
    is_demo_mapping = Column(Boolean, default=True, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)


class Handler(Base):
    __tablename__ = "handlers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    handler_code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    team = Column(String(120), nullable=False)
    zone = Column(String(32), nullable=False)  # East, West, Central
    specialization = Column(String(64), nullable=False)  # Safety, Technical, Crowd, Cleanliness, Medical, General
    availability = Column(String(24), default="Available", nullable=False)  # Available, Busy, Offline
    capacity_limit = Column(Integer, default=3, nullable=False)
    active_load = Column(Integer, default=0, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)


class RoutingRule(Base):
    __tablename__ = "routing_rules"
    __table_args__ = (
        UniqueConstraint("zone", "category", name="uq_routing_zone_category"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone = Column(String(32), nullable=False)
    category = Column(String(32), nullable=False)
    priority = Column(String(8), nullable=False)
    target_team = Column(String(120), nullable=False)
    backup_target = Column(String(120), nullable=False)
    escalation_target = Column(String(120), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    unique_report_code = Column(String(32), unique=True, nullable=False, index=True)
    reporter_name = Column(String(120), nullable=False)
    reporter_contact = Column(String(160), nullable=False)
    original_station_code = Column(String(32), nullable=False)
    normalized_station_code = Column(String(16), nullable=False, index=True)
    original_anomaly_code = Column(String(16), nullable=False)
    anomaly_code = Column(String(16), nullable=False, index=True)
    location_detail = Column(String(200), default="", nullable=False)
    description = Column(Text, nullable=False)
    urgency = Column(String(24), default="Normal", nullable=False)
    category = Column(String(32), nullable=True)
    matched_rule_id = Column(String(32), nullable=True)
    priority = Column(String(8), nullable=False, default="P3")
    zone = Column(String(32), nullable=False, default="Unknown")
    validation_status = Column(String(32), nullable=False)
    validation_message = Column(String(255), nullable=False)
    status = Column(String(24), nullable=False, default="Pending", index=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    assignment = relationship("Assignment", back_populates="report", uselist=False, cascade="all, delete-orphan")
    status_history = relationship("StatusHistory", back_populates="report", order_by="StatusHistory.id", cascade="all, delete-orphan")
    dispatch_logs = relationship("DispatchLog", back_populates="report", order_by="DispatchLog.id", cascade="all, delete-orphan")
    queue_item = relationship("QueueItem", back_populates="report", uselist=False, cascade="all, delete-orphan")


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (
        UniqueConstraint("report_id", name="uq_assignment_report_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    handler_id = Column(Integer, ForeignKey("handlers.id", ondelete="SET NULL"), nullable=True)
    target_label = Column(String(160), nullable=False)
    assigned_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    assignment_status = Column(String(32), nullable=False, default="Active")  # Active, Escalated, Completed
    is_backup = Column(Boolean, default=False, nullable=False)
    reason = Column(String(255), nullable=False)

    report = relationship("Report", back_populates="assignment")
    handler = relationship("Handler")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    old_status = Column(String(24), nullable=True)
    new_status = Column(String(24), nullable=False)
    actor_id = Column(String(80), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    note = Column(String(255), nullable=False)

    report = relationship("Report", back_populates="status_history")


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    routing_key = Column(String(32), nullable=False)
    zone = Column(String(32), nullable=False)
    category = Column(String(32), nullable=True)
    priority = Column(String(8), nullable=False)
    target = Column(String(160), nullable=False)
    rule_matched = Column(String(64), nullable=False)
    decision = Column(String(64), nullable=False)
    reason = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    report = relationship("Report", back_populates="dispatch_logs")


class QueueItem(Base):
    __tablename__ = "queue_items"
    __table_args__ = (
        UniqueConstraint("report_id", name="uq_queue_report_id"),
        Index("ix_queue_order", "state", "priority", "queued_at", "report_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    queue_type = Column(String(32), nullable=False)  # Waiting, Backup, Escalated, FallbackCorrection
    priority = Column(String(8), nullable=False)
    priority_rank = Column(Integer, nullable=False, default=3)
    queued_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    state = Column(String(24), nullable=False, default="Queued")  # Queued, Dispatched, Resolved
    reason = Column(String(255), nullable=False)

    report = relationship("Report", back_populates="queue_item")
