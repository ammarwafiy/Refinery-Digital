// ==============================================================================
// REFINERY PROCESS MANAGEMENT SYSTEM (PRD-REF-001)
// Types & Domain Models for Nisshin Deodorizer Plant & Quality Control
// ==============================================================================

export type UserRole = 
  | 'operator' 
  | 'supervisor' 
  | 'qc_analyst' 
  | 'qc_manager' 
  | 'admin' 
  | 'viewer';

export type SheetStatus = 
  | 'open' 
  | 'submitted' 
  | 'verified' 
  | 'amended';

export type ReportStatus = 
  | 'draft' 
  | 'awaiting_results' 
  | 'results_entered' 
  | 'decided' 
  | 'voided';

export type QCDecisionType = 
  | 'accept' 
  | 'accept_concession' 
  | 'reject';

export type Disposition = 
  | 'rework' 
  | 'reprocess' 
  | 'downgrade' 
  | 'hold' 
  | 'scrap';

export interface Plant {
  id: string;
  code: string;
  name: string;
  timezone: string;
  active: boolean;
}

export type UserStatus = 'active' | 'unactive';

export interface Profile {
  employee_no: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  // Primary key alias (matches employee_no)
  id: string;
  active?: boolean;
  plant_id?: string;
  password?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category?: string;
  sort_order: number;
  active: boolean;
}

export interface Tank {
  id: string;
  plant_id: string;
  code: string;
  kind: 'feed' | 'discharge' | 'both';
  active: boolean;
}

export interface SamplingPoint {
  id: string;
  plant_id: string;
  name: string;
  active: boolean;
}

export interface Parameter {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  decimals: number;
  is_series: boolean;
  series_values?: number[];
  input_kind: 'numeric' | 'text' | 'select';
  sort_order: number;
}

export interface ProductSpec {
  id: string;
  product_id: string;
  parameter_id: string;
  series_key?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  target_value?: number | null;
  effective_from: string;
}

export interface ParameterLimit {
  id: string;
  plant_id: string;
  field_key: string;
  product_id?: string | null;
  hard_min?: number | null;
  hard_max?: number | null;
  soft_min?: number | null;
  soft_max?: number | null;
}

// RF-FR-004 : 24-Hour Process Sheet
export interface ProcessSheet {
  id: string;
  plant_id: string;
  shift_date: string; // YYYY-MM-DD
  stripping_steam_pct: number;
  set_steam_supply_bar: number;
  status: SheetStatus;
  opened_by: string;
  opened_by_name?: string;
  opened_at: string;
  verified_by?: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  entries?: ProcessEntry[];
}

// RF-FR-004 : Hourly Entry
export interface ProcessEntry {
  id: string;
  sheet_id: string;
  slot_index: number; // 0..23 (0 = 0700, 23 = 0600)
  slot_label: string; // '0700' .. '0600'
  slot_start: string;
  product_id?: string | null;
  product_name?: string;

  oil_feed_rate_litre?: number | null;
  deod_time_set_hr?: number | null;
  vacuum_torr?: number | null;

  tray_1_temp_c?: number | null;
  tray_2_temp_c?: number | null;
  tray_3_temp_c?: number | null;
  tray_4_temp_c?: number | null;
  tray_5_temp_c?: number | null;
  tray_6_temp_c?: number | null;
  tray_7_temp_c?: number | null;

  bc101_water_in_c?: number | null;
  bc101_water_out_c?: number | null;
  chill_water_in_c?: number | null;
  chill_water_out_c?: number | null;

  booster_press_bar?: number | null;
  ejector_press_bar?: number | null;

  strip_steam_pct_of_oil?: number | null;
  strip_steam_flow_kghr?: number | null;

  fp101a_press_bar?: number | null;
  fp101b_press_bar?: number | null;

  remarks?: string | null;
  no_production_reason?: string | null;
  has_deviation: boolean;
  recorded_by?: string;
  recorded_by_name?: string;
  recorded_at?: string;
  amended_by?: string | null;
  amended_by_name?: string | null;
  amended_at?: string | null;
  amend_reason?: string | null;
  client_uuid?: string;
}

export interface Deviation {
  id: string;
  entry_id: string;
  slot_label: string;
  field_key: string;
  field_label: string;
  observed: number;
  soft_min?: number | null;
  soft_max?: number | null;
  acknowledged_by?: string | null;
  acknowledged_by_name?: string | null;
  acknowledged_at?: string | null;
  action_taken?: string | null;
  created_at: string;
}

// RF-FR-001 : Sample Analysis Report
export interface SampleReport {
  id: string;
  plant_id: string;
  report_no: string; // SAR-2026-XXXXXX
  sample_date: string;
  time_check: string;
  lot_no: string;
  product_id?: string | null;
  product_name?: string;
  product_other?: string | null;
  feed_tank_id?: string | null;
  feed_tank_code?: string;
  discharge_tank_id?: string | null;
  discharge_tank_code?: string;
  crystallizer_no?: string | null;
  batch_no?: string | null;
  sampling_point_id?: string | null;
  sampling_point_name?: string;
  submitted_by?: string;
  submitted_by_name: string;
  remark_flushing: boolean;
  remark_cooling: boolean;
  remark_pushover: boolean;
  remarks?: string | null;
  status: ReportStatus;
  created_by: string;
  created_at: string;
  results?: SampleResult[];
  decision?: QCDecision;
}

export interface SampleResult {
  id: string;
  report_id: string;
  parameter_id: string;
  parameter_code: string;
  parameter_name: string;
  unit: string | null;
  series_key?: number | null; // Temperature for SFC
  requested: boolean;
  value_numeric?: number | null;
  value_text?: string | null;
  in_spec?: boolean | null;
  entered_by?: string | null;
  entered_by_name?: string | null;
  entered_at?: string | null;
}

export interface RejectionReason {
  id: string;
  code: string;
  label: string;
  active: boolean;
}

export interface QCDecision {
  id: string;
  report_id: string;
  decision: QCDecisionType;
  reason_id?: string | null;
  reason_label?: string | null;
  reason_detail?: string | null;
  failed_parameters?: string[];
  disposition?: Disposition | null;
  decided_by: string;
  decided_by_name: string;
  decided_at: string;
  supersedes_id?: string | null;
  overturn_reason?: string | null;
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'void';
  actor_name?: string;
  old_row?: Record<string, unknown> | null;
  new_row?: Record<string, unknown> | null;
  occurred_at: string;
}
