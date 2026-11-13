export interface ClientValidationResult {
  valid: boolean;
  normalized: string;
  reasonCode: 'EMPTY' | 'BAD_PREFIX' | 'INCOMPLETE' | 'TOO_LONG' | 'BAD_CHAR_POSITION' | 'VALID';
  message: string;
}

const STATION_REGEX = /^STA[A-Z]{2}[0-9]{3}$/;
const ANOMALY_REGEX = /^A[0-9]{2}$/;

export function normalizeIdentifier(raw: string): string {
  return (raw ?? '').trim().toUpperCase();
}

export function validateStationCodeLocal(raw: string): ClientValidationResult {
  const normalized = normalizeIdentifier(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized,
      reasonCode: 'EMPTY',
      message: 'Station code is required: STA + 2 letters + 3 digits (e.g., STAEC123).',
    };
  }
  if (STATION_REGEX.test(normalized)) {
    return {
      valid: true,
      normalized,
      reasonCode: 'VALID',
      message: 'Valid station identifier format.',
    };
  }
  if (!normalized.startsWith('STA')) {
    return {
      valid: false,
      normalized,
      reasonCode: 'BAD_PREFIX',
      message: "Station code must start with literal prefix 'STA'.",
    };
  }
  if (normalized.length < 8) {
    return {
      valid: false,
      normalized,
      reasonCode: 'INCOMPLETE',
      message: 'Station code is incomplete: expected STA + 2 letters + 3 digits.',
    };
  }
  if (normalized.length > 8) {
    return {
      valid: false,
      normalized,
      reasonCode: 'TOO_LONG',
      message: 'Station code has extra characters: expected exact length 8.',
    };
  }
  return {
    valid: false,
    normalized,
    reasonCode: 'BAD_CHAR_POSITION',
    message: 'Invalid character position: positions 4-5 must be letters [A-Z] and 6-8 must be digits [0-9].',
  };
}

export function validateAnomalyCodeLocal(raw: string): ClientValidationResult {
  const normalized = normalizeIdentifier(raw);
  if (!normalized) {
    return {
      valid: false,
      normalized,
      reasonCode: 'EMPTY',
      message: 'Anomaly code is required: A + exactly 2 digits (e.g., A01).',
    };
  }
  if (ANOMALY_REGEX.test(normalized)) {
    return {
      valid: true,
      normalized,
      reasonCode: 'VALID',
      message: 'Valid anomaly identifier format.',
    };
  }
  if (!normalized.startsWith('A')) {
    return {
      valid: false,
      normalized,
      reasonCode: 'BAD_PREFIX',
      message: "Anomaly code must begin with 'A'.",
    };
  }
  if (normalized.length < 3) {
    return {
      valid: false,
      normalized,
      reasonCode: 'INCOMPLETE',
      message: 'Anomaly code is incomplete: expected A + 2 digits.',
    };
  }
  if (normalized.length > 3) {
    return {
      valid: false,
      normalized,
      reasonCode: 'TOO_LONG',
      message: 'Anomaly code has extra characters: expected exact length 3.',
    };
  }
  return {
    valid: false,
    normalized,
    reasonCode: 'BAD_CHAR_POSITION',
    message: 'Anomaly code digits invalid: positions 2-3 must be digits [0-9].',
  };
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function canTransitionStatus(current: string, next: string): boolean {
  if (current === 'Pending') return next === 'Assigned';
  if (current === 'Assigned') return next === 'In Progress';
  if (current === 'In Progress') return next === 'Resolved';
  return false;
}
