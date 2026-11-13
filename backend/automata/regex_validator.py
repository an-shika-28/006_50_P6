import re
from dataclasses import dataclass, asdict
from typing import Dict, Any

STATION_REGEX_PATTERN = r"^STA[A-Z]{2}[0-9]{3}$"
ANOMALY_REGEX_PATTERN = r"^A[0-9]{2}$"

STATION_REGEX = re.compile(STATION_REGEX_PATTERN)
ANOMALY_REGEX = re.compile(ANOMALY_REGEX_PATTERN)


@dataclass
class RegexResult:
    accepted: bool
    original: str
    normalized: str
    pattern: str
    reason_code: str
    message: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def validate_station_regex(raw_input: str) -> RegexResult:
    original = "" if raw_input is None else str(raw_input)
    normalized = original.strip().upper()

    if not normalized:
        return RegexResult(
            accepted=False,
            original=original,
            normalized=normalized,
            pattern=STATION_REGEX_PATTERN,
            reason_code="EMPTY",
            message="Station code is required: expected ^STA[A-Z]{2}[0-9]{3}$.",
        )

    if STATION_REGEX.fullmatch(normalized):
        return RegexResult(
            accepted=True,
            original=original,
            normalized=normalized,
            pattern=STATION_REGEX_PATTERN,
            reason_code="VALID",
            message="Station code matches ^STA[A-Z]{2}[0-9]{3}$.",
        )

    if not normalized.startswith("STA"):
        reason_code = "BAD_PREFIX"
        msg = "Station code must start with literal prefix 'STA'."
    elif len(normalized) < 8:
        reason_code = "INCOMPLETE"
        msg = "Station code is incomplete: expected STA + 2 letters + 3 digits."
    elif len(normalized) > 8:
        reason_code = "TOO_LONG"
        msg = "Station code has extra characters: expected exact length 8."
    else:
        reason_code = "BAD_CHAR_POSITION"
        msg = "Station code format is invalid. Check letter (pos 4-5) and digit (pos 6-8) positions."

    return RegexResult(
        accepted=False,
        original=original,
        normalized=normalized,
        pattern=STATION_REGEX_PATTERN,
        reason_code=reason_code,
        message=msg,
    )


def validate_anomaly_regex(raw_input: str) -> RegexResult:
    original = "" if raw_input is None else str(raw_input)
    normalized = original.strip().upper()

    if not normalized:
        return RegexResult(
            accepted=False,
            original=original,
            normalized=normalized,
            pattern=ANOMALY_REGEX_PATTERN,
            reason_code="EMPTY",
            message="Anomaly code is required: expected ^A[0-9]{2}$.",
        )

    if ANOMALY_REGEX.fullmatch(normalized):
        return RegexResult(
            accepted=True,
            original=original,
            normalized=normalized,
            pattern=ANOMALY_REGEX_PATTERN,
            reason_code="VALID",
            message="Anomaly code matches ^A[0-9]{2}$.",
        )

    if not normalized.startswith("A"):
        reason_code = "BAD_PREFIX"
        msg = "Anomaly code must start with literal prefix 'A'."
    elif len(normalized) < 3:
        reason_code = "INCOMPLETE"
        msg = "Anomaly code is incomplete: expected A + 2 digits."
    elif len(normalized) > 3:
        reason_code = "TOO_LONG"
        msg = "Anomaly code has extra characters: expected exact length 3."
    else:
        reason_code = "BAD_CHAR_POSITION"
        msg = "Anomaly code format is invalid: expected A followed by 2 digits."

    return RegexResult(
        accepted=False,
        original=original,
        normalized=normalized,
        pattern=ANOMALY_REGEX_PATTERN,
        reason_code=reason_code,
        message=msg,
    )
