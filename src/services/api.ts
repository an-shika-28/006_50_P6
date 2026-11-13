import type {
  AnalyticsData,
  DispatchLogItem,
  HandlerAvailability,
  HandlerRecord,
  QueueRecord,
  ReportRecord,
  RoutingTableData,
  StaffUser,
  StationMapNode,
  ValidationCheckResponse,
} from '../types/metropulse';

const TOKEN_KEY = 'metropulse_staff_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      throw new Error('Unexpected non-JSON response from backend API.');
    }
  }
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : `Request failed (${res.status})`;
    const err = new Error(msg) as Error & {
      status?: number;
      payload?: unknown;
    };
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export const api = {
  login(username: string, passcode: string) {
    return apiFetch<{ token: string; user: StaffUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, passcode }),
    });
  },
  me() {
    return apiFetch<{ authenticated: boolean; user: StaffUser | null }>('/api/auth/me');
  },
  getSummary() {
    return apiFetch<{
      total_reports: number;
      pending_reports: number;
      assigned_reports: number;
      in_progress_reports: number;
      resolved_reports: number;
      medical_reports: number;
    }>('/api/dashboard/summary');
  },
  getStationMap() {
    return apiFetch<{ stations: StationMapNode[] }>('/api/stations/map');
  },
  getPublicReports(params: { zone?: string; status?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.zone) qs.set('zone', params.zone);
    if (params.status) qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return apiFetch<{ reports: ReportRecord[] }>(`/api/reports/public${q ? `?${q}` : ''}`);
  },
  getPublicMeta() {
    return apiFetch<{
      stations: Array<{ station_prefix: string; station_label: string; zone: string; is_demo_config: boolean }>;
      anomaly_mappings: Array<{
        anomaly_code: string;
        category: string;
        description: string;
        rule_id: string;
        default_priority: string;
        is_demo_mapping: boolean;
      }>;
    }>('/api/reports/public-meta');
  },
  checkValidation(station_code: string, anomaly_code: string, urgency = 'Normal') {
    return apiFetch<ValidationCheckResponse>('/api/validation/check', {
      method: 'POST',
      body: JSON.stringify({ station_code, anomaly_code, urgency }),
    });
  },
  submitReport(payload: {
    reporter_name: string;
    reporter_contact: string;
    station_code: string;
    anomaly_code: string;
    description: string;
    urgency: string;
    location_detail?: string;
  }) {
    return apiFetch<{
      report: ReportRecord;
      dispatch_summary: {
        routing_key: string;
        zone: string;
        routed_zone: string;
        medical_override: boolean;
        decision: string;
        target: string;
        is_backup: boolean;
        handler_code: string | null;
        reason: string;
      };
    }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  trackReport(reportCode: string) {
    return apiFetch<{ report: ReportRecord }>(`/api/reports/${encodeURIComponent(reportCode.trim().toUpperCase())}`);
  },
  getStaffReports(params: { zone?: string; status?: string; category?: string; priority?: string; sort_by?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'All') qs.set(k, v);
    });
    const q = qs.toString();
    return apiFetch<{ reports: ReportRecord[] }>(`/api/reports${q ? `?${q}` : ''}`);
  },
  updateReportStatus(reportId: number, status: string, note = '') {
    return apiFetch<{ message: string; report: ReportRecord }>(`/api/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  },
  getHandlers(zone?: string) {
    const q = zone && zone !== 'All' ? `?zone=${encodeURIComponent(zone)}` : '';
    return apiFetch<{ handlers: HandlerRecord[] }>(`/api/handlers${q}`);
  },
  updateHandlerAvailability(handlerId: number, availability: HandlerAvailability) {
    return apiFetch<{ message: string; handler: HandlerRecord }>(`/api/handlers/${handlerId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ availability }),
    });
  },
  updateHandlerCapacity(handlerId: number, capacity_limit: number) {
    return apiFetch<{ message: string; handler: HandlerRecord }>(`/api/handlers/${handlerId}/capacity`, {
      method: 'PATCH',
      body: JSON.stringify({ capacity_limit }),
    });
  },
  getRoutingTable() {
    return apiFetch<RoutingTableData>('/api/routing/table');
  },
  getDispatchLogs(limit = 100) {
    return apiFetch<{ logs: DispatchLogItem[] }>(`/api/routing/logs?limit=${limit}`);
  },
  getQueues() {
    return apiFetch<{ queues: QueueRecord[] }>('/api/routing/queues');
  },
  updateRoutingRule(ruleId: number, payload: Partial<{ priority: string; target_team: string; backup_target: string; escalation_target: string; enabled: boolean }>) {
    return apiFetch<{ message: string }>(`/api/routing/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  addStationRoute(payload: { station_prefix: string; station_label: string; zone: string; control_room?: string }) {
    return apiFetch<{ station: { id: number; station_prefix: string; zone: string } }>('/api/routing/stations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  toggleStationRoute(stationId: number, enabled: boolean) {
    return apiFetch<{ message: string }>(`/api/routing/stations/${stationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  },
  updateAnomalyMapping(mappingId: number, payload: Partial<{ category: string; default_priority: string; enabled: boolean }>) {
    return apiFetch<{ message: string }>(`/api/routing/mappings/${mappingId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  manualAssignQueued(reportId: number, handler_id: number, override_capacity = false) {
    return apiFetch<{ message: string }>(`/api/routing/assign-queued/${reportId}`, {
      method: 'POST',
      body: JSON.stringify({ handler_id, override_capacity }),
    });
  },
  getAnalytics(params: { zone?: string; category?: string; status?: string; days?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'All') qs.set(k, v);
    });
    const q = qs.toString();
    return apiFetch<AnalyticsData>(`/api/analytics${q ? `?${q}` : ''}`);
  },
  getValidationCorpus() {
    return apiFetch<{
      station_corpus: Array<{
        input: string;
        description: string;
        expected: boolean;
        dfa_accepted: boolean;
        regex_accepted: boolean;
        agreement: boolean;
        final_state: string;
        passed: boolean;
      }>;
      anomaly_corpus: Array<{
        input: string;
        description: string;
        expected: boolean;
        dfa_accepted: boolean;
        regex_accepted: boolean;
        agreement: boolean;
        final_state: string;
        passed: boolean;
      }>;
      all_agreed: boolean;
    }>('/api/validation/corpus');
  },
  getTestSuite() {
    return apiFetch<{
      total: number;
      passed: number;
      test_cases: Array<{
        test_id: string;
        input: string;
        expected_result: string;
        coverage: string;
        actual_result: string;
        status: 'PASS' | 'FAIL';
      }>;
    }>('/api/validation/tests');
  },
};
