export type CorridorZone = 'East' | 'West' | 'Central' | 'Unknown';
export type ReportCategory = 'Safety' | 'Technical' | 'Crowd' | 'Cleanliness' | 'Medical';
export type ReportStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved';
export type PriorityTier = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type HandlerAvailability = 'Available' | 'Busy' | 'Offline';
export type StaffRole = 'handler' | 'admin';

export interface StaffUser {
  username: string;
  role: StaffRole;
  display_name: string;
}

export interface DFAStep {
  step: number;
  char: string;
  from_state: string;
  to_state: string;
  rule: string;
}

export interface DFAResult {
  accepted: boolean;
  original: string;
  normalized: string;
  final_state: string;
  reason_code: string;
  message: string;
  trace: DFAStep[];
  states: string[];
  accepting_states: string[];
}

export interface RegexResult {
  accepted: boolean;
  original: string;
  normalized: string;
  pattern: string;
  reason_code: string;
  message: string;
}

export interface IdentifierValidationResult {
  valid: boolean;
  agreement: boolean;
  original: string;
  normalized: string;
  reason_code: string;
  message: string;
  dfa: DFAResult;
  regex: RegexResult;
}

export interface ValidationCheckResponse {
  station: IdentifierValidationResult;
  anomaly: IdentifierValidationResult;
  corridor_preview: {
    routing_key: string;
    known_zone: boolean;
    zone: CorridorZone;
    station_label: string;
    control_room: string;
  } | null;
  classification_preview: {
    mapped: boolean;
    category: ReportCategory | null;
    matched_rule_id: string | null;
    conflict_detected: boolean;
    all_matched_rules: string[];
    priority: PriorityTier;
    reason: string;
  } | null;
}

export interface StatusHistoryItem {
  id: number;
  old_status: ReportStatus | null;
  new_status: ReportStatus;
  actor_id: string;
  timestamp: string;
  note: string;
}

export interface DispatchLogItem {
  id: number;
  report_id?: number;
  report_code?: string;
  routing_key: string;
  zone: CorridorZone;
  category: ReportCategory | null;
  priority: PriorityTier;
  target: string;
  rule_matched: string;
  decision: string;
  reason: string;
  timestamp: string;
}

export interface ReportRecord {
  id: number;
  report_code: string;
  reporter_name: string;
  reporter_contact?: string;
  station_code: string;
  original_station_code: string;
  anomaly_code: string;
  location_detail: string;
  description: string;
  urgency: string;
  category: ReportCategory | null;
  matched_rule_id: string | null;
  priority: PriorityTier;
  zone: CorridorZone;
  validation_status: string;
  validation_message: string;
  status: ReportStatus;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  assignment: {
    id: number;
    handler_id: number | null;
    handler_code: string | null;
    handler_name: string | null;
    target_label: string;
    assigned_at: string;
    assignment_status: string;
    is_backup: boolean;
    reason: string;
  } | null;
  queue_item: {
    id: number;
    queue_type: string;
    priority: PriorityTier;
    state: string;
    reason: string;
    queued_at: string;
  } | null;
  status_history: StatusHistoryItem[];
  dispatch_logs: DispatchLogItem[];
}

export interface HandlerRecord {
  id: number;
  handler_code: string;
  name: string;
  team: string;
  zone: 'East' | 'West' | 'Central';
  specialization: string;
  availability: HandlerAvailability;
  capacity_limit: number;
  active_load: number;
  remaining_capacity: number;
  eligible: boolean;
  enabled: boolean;
}

export interface StationMapNode {
  id: number;
  station_prefix: string;
  sample_station_code: string;
  station_label: string;
  zone: 'East' | 'West' | 'Central';
  control_room: string;
  is_demo_config: boolean;
  total_incidents: number;
  active_incidents: number;
  category_breakdown: Record<ReportCategory, number>;
  latest_handler: string;
  recent_reports: Array<{
    report_code: string;
    station_code: string;
    category: ReportCategory;
    priority: PriorityTier;
    status: ReportStatus;
    is_demo: boolean;
  }>;
}

export interface RoutingTableData {
  stations: Array<{
    id: number;
    station_prefix: string;
    station_label: string;
    zone: 'East' | 'West' | 'Central';
    control_room: string;
    is_demo_config: boolean;
    enabled: boolean;
  }>;
  rules: Array<{
    id: number;
    zone: 'East' | 'West' | 'Central';
    category: ReportCategory;
    priority: PriorityTier;
    target_team: string;
    backup_target: string;
    escalation_target: string;
    enabled: boolean;
  }>;
  anomaly_mappings: Array<{
    id: number;
    anomaly_code: string;
    pattern_regex: string;
    category: ReportCategory;
    rule_id: string;
    priority_rank: number;
    default_priority: PriorityTier;
    description: string;
    is_demo_mapping: boolean;
    enabled: boolean;
  }>;
}

export interface QueueRecord {
  id: number;
  report_id: number;
  report_code: string;
  station_code: string;
  zone: CorridorZone;
  category: ReportCategory | null;
  queue_type: string;
  priority: PriorityTier;
  priority_rank: number;
  state: string;
  reason: string;
  queued_at: string;
}

export interface AnalyticsData {
  total_matching: number;
  resolved_count: number;
  unresolved_count: number;
  avg_resolution_minutes: number | null;
  by_zone: Array<{ zone: string; count: number }>;
  by_category: Array<{ category: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  handler_utilization: Array<{
    handler_code: string;
    name: string;
    zone: string;
    active_load: number;
    capacity_limit: number;
    availability: string;
  }>;
}
