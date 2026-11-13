from dataclasses import dataclass, asdict
from typing import List, Dict, Any


@dataclass
class DFAStep:
    step: int
    char: str
    from_state: str
    to_state: str
    rule: str


@dataclass
class DFAResult:
    accepted: bool
    original: str
    normalized: str
    final_state: str
    reason_code: str
    message: str
    trace: List[Dict[str, Any]]
    states: List[str]
    accepting_states: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class StationCodeDFA:
    """
    Explicit Deterministic Finite Automaton for Station Code:
    Pattern: S -> T -> A -> [A-Z] -> [A-Z] -> [0-9] -> [0-9] -> [0-9]
    States:
      q0 (Start)
      q1_S
      q2_T
      q3_A
      q4_L1 (1st letter)
      q5_L2 (2nd letter)
      q6_D1 (1st digit)
      q7_D2 (2nd digit)
      q8_ACCEPT (3rd digit - Accepting State)
      q_DEAD (Rejecting sink state)
    """

    STATES = [
        "q0_START",
        "q1_S",
        "q2_T",
        "q3_A",
        "q4_L1",
        "q5_L2",
        "q6_D1",
        "q7_D2",
        "q8_ACCEPT",
        "q_DEAD",
    ]
    ACCEPTING_STATES = ["q8_ACCEPT"]

    @staticmethod
    def _is_alpha(ch: str) -> bool:
        return "A" <= ch <= "Z"

    @staticmethod
    def _is_digit(ch: str) -> bool:
        return "0" <= ch <= "9"

    def transition(self, state: str, ch: str) -> tuple[str, str]:
        if state == "q0_START":
            return ("q1_S", "consume 'S'") if ch == "S" else ("q_DEAD", "expected 'S' at position 1")
        if state == "q1_S":
            return ("q2_T", "consume 'T'") if ch == "T" else ("q_DEAD", "expected 'T' at position 2")
        if state == "q2_T":
            return ("q3_A", "consume 'A'") if ch == "A" else ("q_DEAD", "expected 'A' at position 3")
        if state == "q3_A":
            return ("q4_L1", "consume alpha [A-Z]") if self._is_alpha(ch) else ("q_DEAD", "expected letter [A-Z] at position 4")
        if state == "q4_L1":
            return ("q5_L2", "consume alpha [A-Z]") if self._is_alpha(ch) else ("q_DEAD", "expected letter [A-Z] at position 5")
        if state == "q5_L2":
            return ("q6_D1", "consume digit [0-9]") if self._is_digit(ch) else ("q_DEAD", "expected digit [0-9] at position 6")
        if state == "q6_D1":
            return ("q7_D2", "consume digit [0-9]") if self._is_digit(ch) else ("q_DEAD", "expected digit [0-9] at position 7")
        if state == "q7_D2":
            return ("q8_ACCEPT", "consume digit [0-9] -> Accept") if self._is_digit(ch) else ("q_DEAD", "expected digit [0-9] at position 8")
        if state == "q8_ACCEPT":
            return ("q_DEAD", "extra character beyond length 8")
        return ("q_DEAD", "remain in dead state")

    def simulate(self, raw_input: str) -> DFAResult:
        original = "" if raw_input is None else str(raw_input)
        normalized = original.strip().upper()
        trace: List[Dict[str, Any]] = []

        if not normalized:
            return DFAResult(
                accepted=False,
                original=original,
                normalized=normalized,
                final_state="q0_START",
                reason_code="EMPTY",
                message="Station code is required: expected STA + 2 letters + 3 digits (e.g., STAEC123).",
                trace=trace,
                states=self.STATES,
                accepting_states=self.ACCEPTING_STATES,
            )

        state = "q0_START"
        first_error_rule = ""

        for idx, ch in enumerate(normalized, start=1):
            next_state, rule = self.transition(state, ch)
            trace.append(asdict(DFAStep(step=idx, char=ch, from_state=state, to_state=next_state, rule=rule)))
            if next_state == "q_DEAD" and not first_error_rule:
                first_error_rule = rule
            state = next_state

        if state in self.ACCEPTING_STATES:
            return DFAResult(
                accepted=True,
                original=original,
                normalized=normalized,
                final_state=state,
                reason_code="VALID",
                message="Station code format is valid (DFA accepted in q8_ACCEPT).",
                trace=trace,
                states=self.STATES,
                accepting_states=self.ACCEPTING_STATES,
            )

        if state != "q_DEAD":
            return DFAResult(
                accepted=False,
                original=original,
                normalized=normalized,
                final_state=state,
                reason_code="INCOMPLETE",
                message=f"Station code is incomplete (halted in {state}): expected STA + 2 letters + 3 digits.",
                trace=trace,
                states=self.STATES,
                accepting_states=self.ACCEPTING_STATES,
            )

        if len(normalized) > 8 and normalized.startswith("STA"):
            reason_code = "TOO_LONG"
            msg = f"Station code format is invalid ({first_error_rule}). Expected exactly 8 characters."
        elif not normalized.startswith("STA"):
            reason_code = "BAD_PREFIX"
            msg = f"Station code format is invalid ({first_error_rule}). Must begin with 'STA'."
        else:
            reason_code = "BAD_CHAR_POSITION"
            msg = f"Station code format is invalid ({first_error_rule}). Expected STA + 2 letters + 3 digits."

        return DFAResult(
            accepted=False,
            original=original,
            normalized=normalized,
            final_state=state,
            reason_code=reason_code,
            message=msg,
            trace=trace,
            states=self.STATES,
            accepting_states=self.ACCEPTING_STATES,
        )


class AnomalyCodeDFA:
    """
    Explicit Deterministic Finite Automaton for Anomaly Code:
    Pattern: A -> [0-9] -> [0-9]
    States:
      q0_START
      q1_A
      q2_D1
      q3_ACCEPT
      q_DEAD
    """

    STATES = [
        "q0_START",
        "q1_A",
        "q2_D1",
        "q3_ACCEPT",
        "q_DEAD",
    ]
    ACCEPTING_STATES = ["q3_ACCEPT"]

    @staticmethod
    def _is_digit(ch: str) -> bool:
        return "0" <= ch <= "9"

    def transition(self, state: str, ch: str) -> tuple[str, str]:
        if state == "q0_START":
            return ("q1_A", "consume 'A'") if ch == "A" else ("q_DEAD", "expected 'A' at position 1")
        if state == "q1_A":
            return ("q2_D1", "consume digit [0-9]") if self._is_digit(ch) else ("q_DEAD", "expected digit [0-9] at position 2")
        if state == "q2_D1":
            return ("q3_ACCEPT", "consume digit [0-9] -> Accept") if self._is_digit(ch) else ("q_DEAD", "expected digit [0-9] at position 3")
        if state == "q3_ACCEPT":
            return ("q_DEAD", "extra character beyond length 3")
        return ("q_DEAD", "remain in dead state")

    def simulate(self, raw_input: str) -> DFAResult:
        original = "" if raw_input is None else str(raw_input)
        normalized = original.strip().upper()
        trace: List[Dict[str, Any]] = []

        if not normalized:
            return DFAResult(
                accepted=False,
                original=original,
                normalized=normalized,
                final_state="q0_START",
                reason_code="EMPTY",
                message="Anomaly code is required: expected A + exactly 2 digits (e.g., A01).",
                trace=trace,
                states=self.STATES,
                accepting_states=self.ACCEPTING_STATES,
            )

        state = "q0_START"
        first_error_rule = ""

        for idx, ch in enumerate(normalized, start=1):
            next_state, rule = self.transition(state, ch)
            trace.append(asdict(DFAStep(step=idx, char=ch, from_state=state, to_state=next_state, rule=rule)))
            if next_state == "q_DEAD" and not first_error_rule:
                first_error_rule = rule
            state = next_state

        if state in self.ACCEPTING_STATES:
            return DFAResult(
                accepted=True,
                original=original,
                normalized=normalized,
                final_state=state,
                reason_code="VALID",
                message="Anomaly code format is valid (DFA accepted in q3_ACCEPT).",
                trace=trace,
                states=self.STATES,
                accepting_states=self.ACCEPTING_STATES,
            )

        if state != "q_DEAD":
            return DFAResult(
                accepted=False,
                original=original,
                normalized=normalized,
                final_state=state,
                reason_code="INCOMPLETE",
                message=f"Anomaly code is incomplete (halted in {state}): expected A + exactly 2 digits.",
                trace=trace,
                states=self.STATES,
                accepting_states=self.ACCEPTING_STATES,
            )

        if len(normalized) > 3 and normalized.startswith("A"):
            reason_code = "TOO_LONG"
            msg = f"Anomaly code format is invalid ({first_error_rule}). Expected exactly 3 characters."
        elif not normalized.startswith("A"):
            reason_code = "BAD_PREFIX"
            msg = f"Anomaly code format is invalid ({first_error_rule}). Must begin with 'A'."
        else:
            reason_code = "BAD_CHAR_POSITION"
            msg = f"Anomaly code format is invalid ({first_error_rule}). Expected A + 2 digits."

        return DFAResult(
            accepted=False,
            original=original,
            normalized=normalized,
            final_state=state,
            reason_code=reason_code,
            message=msg,
            trace=trace,
            states=self.STATES,
            accepting_states=self.ACCEPTING_STATES,
        )
