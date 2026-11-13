from backend.automata.dfa import StationCodeDFA, AnomalyCodeDFA
from backend.automata.regex_validator import validate_station_regex, validate_anomaly_regex

station_dfa = StationCodeDFA()
anomaly_dfa = AnomalyCodeDFA()


def validate_station_identifier(raw_input: str) -> dict:
    dfa_res = station_dfa.simulate(raw_input)
    regex_res = validate_station_regex(raw_input)
    agreement = dfa_res.accepted == regex_res.accepted
    return {
        "valid": dfa_res.accepted and regex_res.accepted,
        "agreement": agreement,
        "original": dfa_res.original,
        "normalized": dfa_res.normalized,
        "reason_code": dfa_res.reason_code,
        "message": dfa_res.message,
        "dfa": dfa_res.to_dict(),
        "regex": regex_res.to_dict(),
    }


def validate_anomaly_identifier(raw_input: str) -> dict:
    dfa_res = anomaly_dfa.simulate(raw_input)
    regex_res = validate_anomaly_regex(raw_input)
    agreement = dfa_res.accepted == regex_res.accepted
    return {
        "valid": dfa_res.accepted and regex_res.accepted,
        "agreement": agreement,
        "original": dfa_res.original,
        "normalized": dfa_res.normalized,
        "reason_code": dfa_res.reason_code,
        "message": dfa_res.message,
        "dfa": dfa_res.to_dict(),
        "regex": regex_res.to_dict(),
    }
