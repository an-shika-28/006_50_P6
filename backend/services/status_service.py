from datetime import datetime, timezone
from backend.config import ALLOWED_STATUS_TRANSITIONS, VALID_STATUSES
from backend.models import Report, StatusHistory, Handler


def transition_report_status(
    session,
    report_id: int,
    new_status: str,
    actor_id: str,
    note: str = "",
) -> tuple[bool, str, Report | None]:
    report = session.query(Report).filter(Report.id == report_id).first()
    if not report:
        return False, f"Report {report_id} not found.", None

    if new_status not in VALID_STATUSES:
        return False, f"Invalid status '{new_status}'. Allowed statuses: {', '.join(VALID_STATUSES)}.", report

    old_status = report.status
    if old_status == new_status:
        return False, f"Report is already in status '{new_status}'.", report

    allowed_next = ALLOWED_STATUS_TRANSITIONS.get(old_status, set())
    if new_status not in allowed_next:
        return (
            False,
            f"Invalid status transition from '{old_status}' to '{new_status}'. "
            f"Allowed next status: {', '.join(sorted(allowed_next)) or 'None (terminal state)'}.",
            report,
        )

    now = datetime.now(timezone.utc)
    report.status = new_status
    report.updated_at = now

    if new_status == "Resolved":
        report.resolved_at = now
        if report.assignment:
            report.assignment.assignment_status = "Completed"
            if report.assignment.handler_id:
                handler = session.query(Handler).filter(Handler.id == report.assignment.handler_id).first()
                if handler and handler.active_load > 0:
                    handler.active_load -= 1
        if report.queue_item and report.queue_item.state != "Resolved":
            report.queue_item.state = "Resolved"

    session.add(
        StatusHistory(
            report_id=report.id,
            old_status=old_status,
            new_status=new_status,
            actor_id=actor_id,
            timestamp=now,
            note=note.strip() or f"Status transitioned from {old_status} to {new_status}.",
        )
    )
    session.commit()
    session.refresh(report)
    return True, f"Status updated from {old_status} to {new_status}.", report
