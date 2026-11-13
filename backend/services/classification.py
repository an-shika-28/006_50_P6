import re
from dataclasses import dataclass, asdict
from typing import Optional, List
from backend.config import CATEGORY_CONFLICT_ORDER
from backend.models import AnomalyMapping


@dataclass
class ClassificationResult:
    mapped: bool
    category: Optional[str]
    matched_rule_id: Optional[str]
    conflict_detected: bool
    all_matched_rules: List[str]
    priority: str
    reason: str

    def to_dict(self):
        return asdict(self)


def compute_priority(category: str, urgency: str, default_priority: str = "P3") -> str:
    """
    Deterministic priority mapping:
    - Medical is ALWAYS P0 (Emergency Override)
    - Critical urgency -> P1 (Safety/Technical/Crowd) or P2 (Cleanliness)
    - High urgency -> P1 (Safety) or P2
    - Normal urgency -> category default
    - Low urgency -> P4 (unless Safety/Medical)
    """
    if category == "Medical":
        return "P0"

    urg = (urgency or "Normal").strip().title()
    if urg == "Critical":
        return "P1" if category in ("Safety", "Technical", "Crowd") else "P2"
    if urg == "High":
        return "P1" if category == "Safety" else "P2"
    if urg == "Low":
        return "P3" if category == "Safety" else "P4"
    return default_priority if default_priority in ("P1", "P2", "P3", "P4") else "P3"


def classify_anomaly(session, anomaly_code: str, urgency: str = "Normal") -> ClassificationResult:
    """
    Deterministically classifies a syntactically valid anomaly code into one of:
    Safety, Technical, Crowd, Cleanliness, Medical.
    If multiple patterns match, resolves conflict deterministically via CATEGORY_CONFLICT_ORDER
    (Medical > Safety > Technical > Crowd > Cleanliness), then priority_rank, then rule_id.
    If no mapping exists, returns mapped=False without silently guessing a category.
    """
    code = (anomaly_code or "").strip().upper()
    enabled_mappings = (
        session.query(AnomalyMapping)
        .filter(AnomalyMapping.enabled.is_(True))
        .all()
    )

    matches: List[AnomalyMapping] = []
    for mapping in enabled_mappings:
        if mapping.anomaly_code.upper() == code:
            matches.append(mapping)
            continue
        try:
            if re.fullmatch(mapping.pattern_regex, code):
                matches.append(mapping)
        except re.error:
            continue

    if not matches:
        return ClassificationResult(
            mapped=False,
            category=None,
            matched_rule_id=None,
            conflict_detected=False,
            all_matched_rules=[],
            priority="P3",
            reason=f"Anomaly code '{code}' is syntactically valid but has no approved category mapping.",
        )

    matches.sort(
        key=lambda m: (
            CATEGORY_CONFLICT_ORDER.get(m.category, 99),
            m.priority_rank,
            m.rule_id,
        )
    )
    winner = matches[0]
    conflict_detected = len(matches) > 1
    all_rules = [m.rule_id for m in matches]
    priority = compute_priority(winner.category, urgency, winner.default_priority)

    reason = (
        f"Conflict resolved deterministically: matched {len(matches)} rules ({', '.join(all_rules)}); "
        f"selected {winner.rule_id} -> {winner.category} ({priority})."
        if conflict_detected
        else f"Matched rule {winner.rule_id} -> {winner.category} ({priority})."
    )

    return ClassificationResult(
        mapped=True,
        category=winner.category,
        matched_rule_id=winner.rule_id,
        conflict_detected=conflict_detected,
        all_matched_rules=all_rules,
        priority=priority,
        reason=reason,
    )
