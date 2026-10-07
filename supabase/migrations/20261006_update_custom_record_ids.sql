-- ==============================================================================
-- REFINERY PROCESS MANAGEMENT SYSTEM (PRD-REF-001)
-- Complete Database Migration: Standardized Prefixed Industrial IDs
-- Lam Soon Edible Oils Sdn. Bhd. — Nisshin Deodorizer Plant
--
-- Replaces ALL UUIDs and raw digits across ALL 24 tables in Supabase with:
--
-- 1. Master & Plant Reference:
--    - PLT001 → Plant (plants.id)
--    - PRD001 → Products (products.id, PRD001 to PRD045)
--    - TK001  → Tanks (tanks.id, TK001 to TK006)
--    - SP001  → Sampling Points (sampling_points.id, SP001 to SP005)
--    - PAR001 → Laboratory Parameters (parameters.id, PAR001 to PAR014)
--    - SPC001 → Product Specifications (product_specs.id)
--    - LIM001 → Parameter Limits (parameter_limits.id, LIM001 to LIM017)
--    - REJ001 → Rejection Reasons (rejection_reasons.id, REJ001 to REJ013)
--
-- 2. User & Administration:
--    - ADM001 → Administrator (profiles.employee_no / id)
--    - OPR001 → Operator
--    - QCS001 → QC Staff
--    - SUP001 → Supervisor
--    - MGR001 → Manager
--    - USR001 → General User / Auditor
--
-- 3. Core Module:
--    - PR001  → Production Record / Process Sheet (process_sheets.id)
--    - PL001  → Process Log Entry (process_entries.id)
--    - AR001  → Approval Record / Deviation (deviations.id)
--    - SR001  → Sample Report (sample_reports.id)
--    - RES001 → Sample Result (sample_results.id)
--    - QC001  → QC Decision (qc_decisions.id)
--    - ISO001 → ISO Certificate (iso_certificates.id)
--    - BP001  → Batch Process (batch_processes.id)
--    - AL001  → Audit Log (audit_log.id)
--
-- 4. Document Management:
--    - DOC001 → Document (documents.id)
--    - SOP001 → Standard Operating Procedure (sops.id)
--    - WI001  → Work Instruction (work_instructions.id)
--    - CRT001 → Certificate (certificates.id)
--    - ATT001 → Attachment (attachments.id)
--    - REV001 → Document Revision (document_revisions.id)
-- ==============================================================================

-- 1. DROP EXISTING TRIGGERS TEMPORARILY
DROP TRIGGER IF EXISTS audit_process_entries ON process_entries;
DROP TRIGGER IF EXISTS audit_sample_reports ON sample_reports;
DROP TRIGGER IF EXISTS audit_qc_decisions ON qc_decisions;

-- 2. SEQUENCES FOR AUTOMATIC ID INCREMENTATION
CREATE SEQUENCE IF NOT EXISTS seq_plt_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_prd_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_tk_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_sp_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_par_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_spc_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_lim_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_rej_id START WITH 1;

CREATE SEQUENCE IF NOT EXISTS seq_pr_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_pl_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_ar_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_sr_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_res_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_qc_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_iso_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_bp_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_al_id  START WITH 1;

CREATE SEQUENCE IF NOT EXISTS seq_doc_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_sop_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_wi_id  START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_crt_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_att_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_rev_id START WITH 1;

-- 3. HELPER FUNCTIONS TO GENERATE SEQUENTIAL PREFIXED IDS
CREATE OR REPLACE FUNCTION next_plt_id() RETURNS text AS $$
  SELECT 'PLT' || lpad(nextval('seq_plt_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_prd_id() RETURNS text AS $$
  SELECT 'PRD' || lpad(nextval('seq_prd_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_tk_id() RETURNS text AS $$
  SELECT 'TK' || lpad(nextval('seq_tk_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_sp_id() RETURNS text AS $$
  SELECT 'SP' || lpad(nextval('seq_sp_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_par_id() RETURNS text AS $$
  SELECT 'PAR' || lpad(nextval('seq_par_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_spc_id() RETURNS text AS $$
  SELECT 'SPC' || lpad(nextval('seq_spc_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_lim_id() RETURNS text AS $$
  SELECT 'LIM' || lpad(nextval('seq_lim_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_rej_id() RETURNS text AS $$
  SELECT 'REJ' || lpad(nextval('seq_rej_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_pr_id() RETURNS text AS $$
  SELECT 'PR' || lpad(nextval('seq_pr_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_pl_id() RETURNS text AS $$
  SELECT 'PL' || lpad(nextval('seq_pl_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_ar_id() RETURNS text AS $$
  SELECT 'AR' || lpad(nextval('seq_ar_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_sr_id() RETURNS text AS $$
  SELECT 'SR' || lpad(nextval('seq_sr_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_res_id() RETURNS text AS $$
  SELECT 'RES' || lpad(nextval('seq_res_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_qc_id() RETURNS text AS $$
  SELECT 'QC' || lpad(nextval('seq_qc_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_iso_id() RETURNS text AS $$
  SELECT 'ISO' || lpad(nextval('seq_iso_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_bp_id() RETURNS text AS $$
  SELECT 'BP' || lpad(nextval('seq_bp_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_al_id() RETURNS text AS $$
  SELECT 'AL' || lpad(nextval('seq_al_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_doc_id() RETURNS text AS $$
  SELECT 'DOC' || lpad(nextval('seq_doc_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_sop_id() RETURNS text AS $$
  SELECT 'SOP' || lpad(nextval('seq_sop_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_wi_id() RETURNS text AS $$
  SELECT 'WI' || lpad(nextval('seq_wi_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_crt_id() RETURNS text AS $$
  SELECT 'CRT' || lpad(nextval('seq_crt_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_att_id() RETURNS text AS $$
  SELECT 'ATT' || lpad(nextval('seq_att_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_rev_id() RETURNS text AS $$
  SELECT 'REV' || lpad(nextval('seq_rev_id')::text, 3, '0');
$$ LANGUAGE sql;

-- 4. DROP ALL EXISTING TABLES CLEANLY (CASCADE)
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS qc_decisions CASCADE;
DROP TABLE IF EXISTS sample_results CASCADE;
DROP TABLE IF EXISTS sample_reports CASCADE;
DROP TABLE IF EXISTS deviations CASCADE;
DROP TABLE IF EXISTS process_entries CASCADE;
DROP TABLE IF EXISTS process_sheets CASCADE;
DROP TABLE IF EXISTS product_specs CASCADE;
DROP TABLE IF EXISTS parameter_limits CASCADE;
DROP TABLE IF EXISTS rejection_reasons CASCADE;
DROP TABLE IF EXISTS parameters CASCADE;
DROP TABLE IF EXISTS sampling_points CASCADE;
DROP TABLE IF EXISTS tanks CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS plants CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS iso_certificates CASCADE;
DROP TABLE IF EXISTS batch_processes CASCADE;
DROP TABLE IF EXISTS document_revisions CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS work_instructions CASCADE;
DROP TABLE IF EXISTS sops CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- 5. CREATE TABLES WITH CLEAN TEXT PRIMARY & FOREIGN KEYS

-- 5.1. PLANTS (PLT001)
CREATE TABLE plants (
  id text PRIMARY KEY DEFAULT next_plt_id(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.2. PROFILES (USR001, ADM001, OPR001, QCS001, SUP001, MGR001)
CREATE TABLE profiles (
  employee_no text PRIMARY KEY,
  id text UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'operator',
  status text NOT NULL DEFAULT 'active',
  password text NOT NULL DEFAULT 'password123',
  avatar_url text,
  plant_id text REFERENCES plants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure backwards-compatibility columns if profiles was not dropped
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plant_id text REFERENCES plants(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
UPDATE profiles SET id = employee_no WHERE id IS NULL;

-- 5.3. PRODUCTS (PRD001 to PRD045)
CREATE TABLE products (
  id text PRIMARY KEY DEFAULT next_prd_id(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.4. TANKS (TK001 to TK006)
CREATE TABLE tanks (
  id text PRIMARY KEY DEFAULT next_tk_id(),
  plant_id text NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('feed', 'discharge', 'both')),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (plant_id, code)
);

-- 5.5. SAMPLING POINTS (SP001 to SP005)
CREATE TABLE sampling_points (
  id text PRIMARY KEY DEFAULT next_sp_id(),
  plant_id text NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- 5.6. LABORATORY PARAMETERS (PAR001 to PAR014)
CREATE TABLE parameters (
  id text PRIMARY KEY DEFAULT next_par_id(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  unit text,
  decimals int NOT NULL DEFAULT 2,
  is_series boolean NOT NULL DEFAULT false,
  series_values numeric[],
  input_kind text NOT NULL DEFAULT 'numeric',
  sort_order int NOT NULL DEFAULT 0
);

-- 5.7. PRODUCT SPECIFICATIONS (SPC001...)
CREATE TABLE product_specs (
  id text PRIMARY KEY DEFAULT next_spc_id(),
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  parameter_id text NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
  series_key numeric,
  min_value numeric, 
  max_value numeric, 
  target_value numeric,
  effective_from date NOT NULL DEFAULT current_date,
  UNIQUE (product_id, parameter_id, series_key, effective_from)
);

-- 5.8. PARAMETER LIMITS (LIM001...)
CREATE TABLE parameter_limits (
  id text PRIMARY KEY DEFAULT next_lim_id(),
  plant_id text NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  product_id text REFERENCES products(id) ON DELETE CASCADE,
  hard_min numeric, 
  hard_max numeric,
  soft_min numeric, 
  soft_max numeric,
  UNIQUE (plant_id, field_key, product_id)
);

-- 5.9. REJECTION REASONS (REJ001 to REJ013)
CREATE TABLE rejection_reasons (
  id text PRIMARY KEY DEFAULT next_rej_id(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- 5.10. PRODUCTION RECORD / PROCESS SHEET (PR001)
CREATE TABLE process_sheets (
  id text PRIMARY KEY DEFAULT next_pr_id(),
  plant_id text NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  stripping_steam_pct numeric(5,2) NOT NULL DEFAULT 1.5,
  set_steam_supply_bar numeric(6,2) NOT NULL DEFAULT 3.0,
  status text NOT NULL DEFAULT 'open',
  opened_by text REFERENCES profiles(employee_no),
  opened_at timestamptz NOT NULL DEFAULT now(),
  verified_by text REFERENCES profiles(employee_no),
  verified_at timestamptz,
  UNIQUE (plant_id, shift_date)
);

-- 5.11. PROCESS ENTRIES (PL001...)
CREATE TABLE process_entries (
  id text PRIMARY KEY DEFAULT next_pl_id(),
  sheet_id text NOT NULL REFERENCES process_sheets(id) ON DELETE CASCADE,
  slot_index smallint NOT NULL CHECK (slot_index BETWEEN 0 AND 23),
  slot_label text GENERATED ALWAYS AS (
    lpad((((slot_index + 7) % 24) * 100)::text, 4, '0')
  ) STORED,
  slot_start timestamptz NOT NULL,
  product_id text REFERENCES products(id),
  product_name text,

  oil_feed_rate_litre    numeric(10,1),
  deod_time_set_hr       numeric(4,1),
  vacuum_torr            numeric(6,1),

  tray_1_temp_c numeric(5,1), 
  tray_2_temp_c numeric(5,1),
  tray_3_temp_c numeric(5,1), 
  tray_4_temp_c numeric(5,1),
  tray_5_temp_c numeric(5,1), 
  tray_6_temp_c numeric(5,1),
  tray_7_temp_c numeric(5,1),

  bc101_water_in_c  numeric(5,1), 
  bc101_water_out_c numeric(5,1),
  chill_water_in_c  numeric(5,1), 
  chill_water_out_c numeric(5,1),

  booster_press_bar numeric(6,2), 
  ejector_press_bar numeric(6,2),
  tray_steam_supply_bar numeric(6,2),

  strip_steam_pct_of_oil numeric(5,2),
  strip_steam_flow_kghr  numeric(8,1),

  fp101a_press_bar numeric(6,2), 
  fp101b_press_bar numeric(6,2),

  remarks text,
  no_production_reason text,
  has_deviation boolean NOT NULL DEFAULT false,
  recorded_by text REFERENCES profiles(employee_no),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  amended_by text REFERENCES profiles(employee_no),
  amended_at timestamptz,
  amend_reason text,
  client_uuid uuid,
  UNIQUE (sheet_id, slot_index)
);

-- 5.12. APPROVAL RECORDS / DEVIATIONS (AR001)
CREATE TABLE deviations (
  id text PRIMARY KEY DEFAULT next_ar_id(),
  entry_id text NOT NULL REFERENCES process_entries(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  observed numeric NOT NULL,
  soft_min numeric, 
  soft_max numeric,
  acknowledged_by text REFERENCES profiles(employee_no),
  acknowledged_at timestamptz,
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.13. SAMPLE REPORTS (SR001...)
CREATE TABLE sample_reports (
  id text PRIMARY KEY DEFAULT next_sr_id(),
  plant_id text NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  report_no text UNIQUE NOT NULL,
  sample_date date NOT NULL DEFAULT current_date,
  time_check time NOT NULL DEFAULT current_time,
  lot_no text NOT NULL,
  product_id text REFERENCES products(id),
  product_other text,
  feed_tank_id text REFERENCES tanks(id),
  discharge_tank_id text REFERENCES tanks(id),
  crystallizer_no text,
  batch_no text,
  sampling_point_id text REFERENCES sampling_points(id),
  submitted_by text REFERENCES profiles(employee_no),
  submitted_by_name text,
  remark_flushing boolean NOT NULL DEFAULT false,
  remark_cooling  boolean NOT NULL DEFAULT false,
  remark_pushover boolean NOT NULL DEFAULT false,
  remarks text,
  status text NOT NULL DEFAULT 'draft',
  created_by text REFERENCES profiles(employee_no),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.14. SAMPLE RESULTS (RES001...)
CREATE TABLE sample_results (
  id text PRIMARY KEY DEFAULT next_res_id(),
  report_id text NOT NULL REFERENCES sample_reports(id) ON DELETE CASCADE,
  parameter_id text REFERENCES parameters(id),
  series_key numeric,
  requested boolean NOT NULL DEFAULT true,
  value_numeric numeric,
  value_text text,
  in_spec boolean,
  entered_by text REFERENCES profiles(employee_no),
  entered_at timestamptz,
  UNIQUE (report_id, parameter_id, series_key)
);

-- 5.15. QC DECISIONS (QC001...)
CREATE TABLE qc_decisions (
  id text PRIMARY KEY DEFAULT next_qc_id(),
  report_id text NOT NULL REFERENCES sample_reports(id) ON DELETE CASCADE,
  decision text NOT NULL,
  reason_id text REFERENCES rejection_reasons(id),
  reason_detail text,
  failed_parameters text[],
  disposition text,
  decided_by text REFERENCES profiles(employee_no),
  decided_at timestamptz NOT NULL DEFAULT now(),
  supersedes_id text REFERENCES qc_decisions(id),
  overturn_reason text
);

-- 5.16. ISO CERTIFICATES (ISO001)
CREATE TABLE iso_certificates (
  id text PRIMARY KEY DEFAULT next_iso_id(),
  cert_no text NOT NULL UNIQUE,
  standard text NOT NULL,
  title text NOT NULL,
  scope text NOT NULL,
  issuer text NOT NULL,
  status text NOT NULL DEFAULT 'valid',
  issue_date date NOT NULL,
  valid_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.17. BATCH PROCESSES (BP001)
CREATE TABLE batch_processes (
  id text PRIMARY KEY DEFAULT next_bp_id(),
  batch_no text NOT NULL UNIQUE,
  product_name text NOT NULL,
  feed_tank text,
  discharge_tank text,
  sheet_id text REFERENCES process_sheets(id),
  status text NOT NULL DEFAULT 'running',
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.18. DOCUMENTS (DOC001)
CREATE TABLE documents (
  id text PRIMARY KEY DEFAULT next_doc_id(),
  doc_code text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  current_revision text NOT NULL DEFAULT 'Rev 02',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.19. STANDARD OPERATING PROCEDURES (SOP001)
CREATE TABLE sops (
  id text PRIMARY KEY DEFAULT next_sop_id(),
  sop_no text NOT NULL UNIQUE,
  title text NOT NULL,
  department text NOT NULL DEFAULT 'Refinery Operations',
  effective_date date NOT NULL,
  review_cycle_months int NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.20. WORK INSTRUCTIONS (WI001)
CREATE TABLE work_instructions (
  id text PRIMARY KEY DEFAULT next_wi_id(),
  wi_no text NOT NULL UNIQUE,
  title text NOT NULL,
  machine_section text NOT NULL,
  step_count int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5.21. CERTIFICATES (CRT001)
CREATE TABLE certificates (
  id text PRIMARY KEY DEFAULT next_crt_id(),
  cert_code text NOT NULL UNIQUE,
  title text NOT NULL,
  batch_no text,
  lot_no text,
  report_id text REFERENCES sample_reports(id),
  issued_by text REFERENCES profiles(employee_no),
  issued_at timestamptz NOT NULL DEFAULT now()
);

-- 5.22. ATTACHMENTS (ATT001)
CREATE TABLE attachments (
  id text PRIMARY KEY DEFAULT next_att_id(),
  report_id text REFERENCES sample_reports(id),
  entry_id text REFERENCES process_entries(id),
  storage_path text NOT NULL,
  file_name text NOT NULL, 
  byte_size int NOT NULL,
  uploaded_by text REFERENCES profiles(employee_no),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- 5.23. DOCUMENT REVISIONS (REV001)
CREATE TABLE document_revisions (
  id text PRIMARY KEY DEFAULT next_rev_id(),
  doc_id text REFERENCES documents(id) ON DELETE CASCADE,
  revision_no text NOT NULL,
  change_summary text NOT NULL,
  approved_by text REFERENCES profiles(employee_no),
  approved_at timestamptz NOT NULL DEFAULT now()
);

-- 5.24. AUDIT LOG (AL001)
CREATE TABLE audit_log (
  id text PRIMARY KEY DEFAULT next_al_id(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,
  actor text REFERENCES profiles(employee_no),
  old_row jsonb, 
  new_row jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- 6. AUDIT TRAIL TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION log_audit_trail() RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (table_name, record_id, action, new_row)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'insert', to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_row, new_row)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_row)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'void', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_process_entries
AFTER INSERT OR UPDATE ON process_entries
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_sample_reports
AFTER INSERT OR UPDATE ON sample_reports
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_qc_decisions
AFTER INSERT OR UPDATE ON qc_decisions
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- ==============================================================================
-- 7. SEED DATA WITH STANDARDIZED PREFIXED IDS FOR ALL TABLES
-- ==============================================================================

-- 7.1. PLANT: PLT001
INSERT INTO plants (id, code, name, timezone) VALUES
('PLT001', 'NISSHIN_DEOD', 'Nisshin Deodorizer Plant', 'Asia/Kuala_Lumpur')
ON CONFLICT (code) DO UPDATE SET id = 'PLT001';

-- 7.2. USERS: ADM001, OPR001, QCS001, SUP001, MGR001, USR001
INSERT INTO profiles (employee_no, id, full_name, role, status, password, plant_id) VALUES
('ADM001', 'ADM001', 'Haris Iskandar (Administrator)', 'admin', 'active', 'password123', 'PLT001'),
('OPR001', 'OPR001', 'Ahmad Razak (Operator)', 'operator', 'active', 'password123', 'PLT001'),
('QCS001', 'QCS001', 'Siti Nurhaliza (QC Staff)', 'qc_analyst', 'active', 'password123', 'PLT001'),
('SUP001', 'SUP001', 'Chong Wei Lun (Supervisor)', 'supervisor', 'active', 'password123', 'PLT001'),
('MGR001', 'MGR001', 'Dr. Tan Keng Boon (Manager)', 'qc_manager', 'active', 'password123', 'PLT001'),
('USR001', 'USR001', 'ISO Quality Auditor (User)', 'viewer', 'active', 'password123', 'PLT001')
ON CONFLICT (employee_no) DO UPDATE SET id = EXCLUDED.id, plant_id = 'PLT001';

-- 7.3. PRODUCTS: PRD001 to PRD045
INSERT INTO products (id, code, name, category, sort_order) VALUES
('PRD001', 'CHOCOHI_357A_NPHO', 'Chocohi 357A NPHO', 'specialty', 1),
('PRD002', 'CHOCOHI_369A', 'Chocohi 369A', 'specialty', 2),
('PRD003', 'DAISY_SOFT_PM180602_I2', 'Daisy Soft PM180602 I2', 'olein', 3),
('PRD004', 'DF_20', 'DF 20', 'blend', 4),
('PRD005', 'FARM_COW_R2', 'Farm Cow R2', 'blend', 5),
('PRD006', 'G9', 'G9', 'blend', 6),
('PRD007', 'HPO_58', 'HPO 58', 'stearin', 7),
('PRD008', 'HPKO', 'HPKO', 'kernel', 8),
('PRD009', 'HPS_52', 'HPS 52', 'stearin', 9),
('PRD010', 'HPS_58', 'HPS 58', 'stearin', 10),
('PRD011', 'HYFAT_L1', 'Hyfat L1', 'specialty', 11),
('PRD012', 'HYFAT_K1_P', 'Hyfat K1 (P)', 'specialty', 12),
('PRD013', 'HYFAT_K1_B', 'Hyfat K1 (B)', 'specialty', 13),
('PRD014', 'PMF', 'PMF', 'specialty', 14),
('PRD015', 'PR_PMF', 'PR PMF', 'specialty', 15),
('PRD016', 'IEPMF', 'IEPMF', 'specialty', 16),
('PRD017', 'R_IEPMF', 'R. IEPMF', 'specialty', 17),
('PRD018', 'PR_IEPMF', 'PR IEPMF', 'specialty', 18),
('PRD019', 'KRIMWELL_IER', 'Krimwell IER', 'specialty', 19),
('PRD020', 'NATUREL_WOS', 'Naturel WOS', 'consumer', 20),
('PRD021', 'NATUREL_LITE', 'Naturel Lite', 'consumer', 21),
('PRD022', 'NATUREL_OLIVE', 'Naturel Olive', 'consumer', 22),
('PRD023', 'PASTRIFET_SK', 'Pastrifet SK', 'shortening', 23),
('PRD024', 'PL_56', 'PL 56', 'olein', 24),
('PRD025', 'PL_60', 'PL 60', 'olein', 25),
('PRD026', 'PL_65_MATSUYAMA', 'PL 65 Matsuyama', 'olein', 26),
('PRD027', 'PL_65_WAYIDEAL', 'PL 65 Wayideal', 'olein', 27),
('PRD028', 'PR_PL65', 'PR PL65', 'olein', 28),
('PRD029', 'NBD_PL65', 'NBD PL65', 'olein', 29),
('PRD030', 'PALM_FAT_BLEND', 'Palm Fat Blend', 'blend', 30),
('PRD031', 'RPMO', 'RPMO', 'olein', 31),
('PRD032', 'PR_PMO', 'PR PMO', 'olein', 32),
('PRD033', 'RSTN', 'RSTN', 'stearin', 33),
('PRD034', 'RSTN_S', 'RSTN (S)', 'stearin', 34),
('PRD035', 'RSTN_H', 'RSTN (H)', 'stearin', 35),
('PRD036', 'PR_STN', 'PR STN', 'stearin', 36),
('PRD037', 'PR_STN_S', 'PR STN (S)', 'stearin', 37),
('PRD038', 'PR_STN_H', 'PR STN (H)', 'stearin', 38),
('PRD039', 'RPKO', 'RPKO', 'kernel', 39),
('PRD040', 'RPKL', 'RPKL', 'kernel', 40),
('PRD041', 'SHORTENING', 'Shortening', 'shortening', 41),
('PRD042', 'SRIV60_FMF_SNAX', 'SRIV60 (FMF Snax)', 'specialty', 42),
('PRD043', 'SPLASH_OIL', 'Splash Oil', 'blend', 43),
('PRD044', 'FLUSH_OIL', 'Flush Oil', 'by-product', 44),
('PRD045', 'PFAD', 'PFAD', 'by-product', 45)
ON CONFLICT (code) DO UPDATE SET id = EXCLUDED.id, name = EXCLUDED.name;

-- 7.4. TANKS: TK001 to TK006
INSERT INTO tanks (id, plant_id, code, kind) VALUES
('TK001', 'PLT001', 'TK-101A', 'feed'),
('TK002', 'PLT001', 'TK-101B', 'feed'),
('TK003', 'PLT001', 'TK-102',  'feed'),
('TK004', 'PLT001', 'TK-201A', 'discharge'),
('TK005', 'PLT001', 'TK-201B', 'discharge'),
('TK006', 'PLT001', 'TK-202',  'discharge')
ON CONFLICT (plant_id, code) DO UPDATE SET id = EXCLUDED.id;

-- 7.5. SAMPLING POINTS: SP001 to SP005
INSERT INTO sampling_points (id, plant_id, name) VALUES
('SP001', 'PLT001', 'Deodorizer Outlet Pipe (Header 4)'),
('SP002', 'PLT001', 'Tray 7 Final Sampling Cock'),
('SP003', 'PLT001', 'Cooler BC-101 Discharge Line'),
('SP004', 'PLT001', 'Polishing Filter FP-101 Manifold'),
('SP005', 'PLT001', 'Finished Oil Storage Inflow')
ON CONFLICT (id) DO NOTHING;

-- 7.6. PARAMETERS: PAR001 to PAR014
INSERT INTO parameters (id, code, name, unit, decimals, is_series, series_values, input_kind, sort_order) VALUES
('PAR001', 'FFA', 'Free Fatty Acid (Palmitic)', '%', 2, false, null, 'numeric', 1),
('PAR002', 'H2O', 'Moisture & Impurities', '%', 3, false, null, 'numeric', 2),
('PAR003', 'IV', 'Iodine Value (Wijs)', 'g I₂/100g', 1, false, null, 'numeric', 3),
('PAR004', 'PV', 'Peroxide Value', 'meq/kg', 2, false, null, 'numeric', 4),
('PAR005', 'COLOUR_R', 'Colour Lovibond Red (5¼" cell)', 'R', 1, false, null, 'numeric', 5),
('PAR006', 'COLOUR_Y', 'Colour Lovibond Yellow (5¼" cell)', 'Y', 1, false, null, 'numeric', 6),
('PAR007', 'ODOUR', 'Odour Assessment', null, 0, false, null, 'select', 7),
('PAR008', 'BPP', 'Breakdown Product Point', '°C', 1, false, null, 'numeric', 8),
('PAR009', 'SLIP_MELT', 'Slip Melting Point', '°C', 1, false, null, 'numeric', 9),
('PAR010', 'CLOUD_POINT', 'Cloud Point', '°C', 1, false, null, 'numeric', 10),
('PAR011', 'SOAP', 'Soap Content', 'ppm', 1, false, null, 'numeric', 11),
('PAR012', 'FAC_C12', 'Fatty Acid Composition C12:0', '%', 2, false, null, 'numeric', 12),
('PAR013', 'SFC', 'Solid Fat Content (SFC)', '%', 1, false, null, 'numeric', 13),
('PAR014', 'TEMP', 'Temperature Series', '-', 1, true, array[10,15,20,25,30,35,40,45,50], 'text', 14)
ON CONFLICT (code) DO UPDATE SET id = EXCLUDED.id;

-- 7.7. REJECTION REASONS: REJ001 to REJ013
INSERT INTO rejection_reasons (id, code, label) VALUES
('REJ001', 'FFA_HIGH', 'FFA above specification'),
('REJ002', 'H2O_HIGH', 'Moisture & Impurities above specification'),
('REJ003', 'PV_HIGH', 'Peroxide value above specification'),
('REJ004', 'COLOUR_OUT', 'Colour out of specification'),
('REJ005', 'OFF_ODOUR', 'Off odour detected'),
('REJ006', 'SMP_OUT', 'Slip melting point out of range'),
('REJ007', 'CLOUD_OUT', 'Cloud point out of range'),
('REJ008', 'SFC_OUT', 'SFC profile out of range'),
('REJ009', 'SOAP_HIGH', 'Soap content above limit'),
('REJ010', 'IV_OUT', 'Iodine value out of range'),
('REJ011', 'CONTAMINATION', 'Cross-contamination suspected'),
('REJ012', 'WRONG_TANK', 'Wrong product pumped into tank'),
('REJ013', 'SAMPLING_ERR', 'Sampling error, resample required')
ON CONFLICT (code) DO UPDATE SET id = EXCLUDED.id;

-- 7.8. PARAMETER LIMITS: LIM001 to LIM017
INSERT INTO parameter_limits (id, plant_id, field_key, hard_min, hard_max, soft_min, soft_max) VALUES
('LIM001', 'PLT001', 'vacuum_torr', 0, 760, 1.0, 4.5),
('LIM002', 'PLT001', 'tray_1_temp_c', 0, 350, 240, 260),
('LIM003', 'PLT001', 'tray_2_temp_c', 0, 350, 245, 262),
('LIM004', 'PLT001', 'tray_3_temp_c', 0, 350, 248, 265),
('LIM005', 'PLT001', 'tray_4_temp_c', 0, 350, 250, 268),
('LIM006', 'PLT001', 'tray_5_temp_c', 0, 350, 250, 268),
('LIM007', 'PLT001', 'tray_6_temp_c', 0, 350, 235, 250),
('LIM008', 'PLT001', 'tray_7_temp_c', 0, 350, 180, 210),
('LIM009', 'PLT001', 'bc101_water_in_c', 0, 150, 28, 34),
('LIM010', 'PLT001', 'bc101_water_out_c', 0, 150, 36, 48),
('LIM011', 'PLT001', 'chill_water_in_c', 0, 100, 8, 14),
('LIM012', 'PLT001', 'chill_water_out_c', 0, 100, 14, 22),
('LIM013', 'PLT001', 'booster_press_bar', 0, 60, 8.0, 12.0),
('LIM014', 'PLT001', 'ejector_press_bar', 0, 60, 8.0, 12.0),
('LIM015', 'PLT001', 'strip_steam_pct_of_oil', 0, 100, 1.2, 1.8),
('LIM016', 'PLT001', 'fp101a_press_bar', 0, 20, 1.5, 4.5),
('LIM017', 'PLT001', 'fp101b_press_bar', 0, 20, 1.5, 4.5)
ON CONFLICT (id) DO NOTHING;

-- 7.9. PRODUCTION RECORD: PR001
INSERT INTO process_sheets (id, plant_id, shift_date, stripping_steam_pct, set_steam_supply_bar, status, opened_by) VALUES
('PR001', 'PLT001', '2026-09-20', 1.5, 3.0, 'open', 'OPR001')
ON CONFLICT (plant_id, shift_date) DO UPDATE SET id = 'PR001';

-- 7.10. PROCESS LOG ENTRIES: PL001 to PL003
INSERT INTO process_entries (
  id, sheet_id, slot_index, slot_start, product_id, product_name, oil_feed_rate_litre, deod_time_set_hr,
  vacuum_torr, tray_1_temp_c, tray_2_temp_c, tray_3_temp_c, tray_4_temp_c, tray_5_temp_c,
  tray_6_temp_c, tray_7_temp_c, bc101_water_in_c, bc101_water_out_c, chill_water_in_c,
  chill_water_out_c, booster_press_bar, ejector_press_bar, strip_steam_pct_of_oil,
  strip_steam_flow_kghr, fp101a_press_bar, fp101b_press_bar, recorded_by, has_deviation
) VALUES
('PL001', 'PR001', 0, '2026-09-20 07:00:00+08', 'PRD026', 'PL 65 Matsuyama', 25000, 2.0, 2.8, 252.0, 256.0, 260.0, 264.0, 263.5, 242.0, 195.0, 31.0, 42.0, 10.5, 16.0, 9.8, 10.1, 1.5, 375.0, 2.2, 2.1, 'OPR001', false),
('PL002', 'PR001', 1, '2026-09-20 08:00:00+08', 'PRD026', 'PL 65 Matsuyama', 25100, 2.0, 2.7, 253.2, 257.0, 261.2, 265.0, 264.0, 241.5, 196.0, 31.5, 43.0, 10.8, 16.5, 9.7, 10.0, 1.5, 376.5, 2.3, 2.2, 'OPR001', false),
('PL003', 'PR001', 2, '2026-09-20 09:00:00+08', 'PRD026', 'PL 65 Matsuyama', 25050, 2.0, 4.8, 254.0, 258.1, 262.5, 266.0, 265.2, 243.1, 197.0, 32.1, 44.2, 11.0, 17.5, 9.6, 9.9, 1.5, 375.0, 2.4, 2.3, 'OPR001', true)
ON CONFLICT (sheet_id, slot_index) DO NOTHING;

-- 7.11. APPROVAL RECORD: AR001
INSERT INTO deviations (
  id, entry_id, field_key, observed, soft_min, soft_max, acknowledged_by, action_taken
) VALUES
('AR001', 'PL003', 'vacuum_torr', 4.8, 1.0, 4.5, 'SUP001', 'Inspected cooling water tower pump #2 and restored vacuum to 2.8 Torr.')
ON CONFLICT (id) DO NOTHING;

-- 7.12. SAMPLE REPORTS: SR001 to SR011
INSERT INTO sample_reports (
  id, plant_id, report_no, sample_date, time_check, lot_no, product_id, product_other, feed_tank_id, discharge_tank_id, sampling_point_id, batch_no, status, created_by, submitted_by
) VALUES
('SR001', 'PLT001', 'SAR-2026-000481', '2026-09-20', '07:30', 'LOT-PL65-2609-01', 'PRD026', null, 'TK001', 'TK004', 'SP001', 'B260901', 'decided', 'OPR001', 'OPR001'),
('SR002', 'PLT001', 'SAR-2026-000482', '2026-09-20', '11:00', 'LOT-PL65-2609-02', 'PRD026', null, 'TK001', 'TK004', 'SP001', 'B260902', 'decided', 'OPR001', 'OPR001'),
('SR003', 'PLT001', 'SAR-2026-000483', '2026-09-20', '15:30', 'LOT-PL65-2609-03', 'PRD026', null, 'TK001', 'TK004', 'SP001', 'B260903', 'decided', 'OPR001', 'OPR001'),
('SR004', 'PLT001', 'SAR-2026-000484', '2026-09-21', '08:00', 'LOT-CHOCO-2609-01', 'PRD001', null, 'TK001', 'TK004', 'SP001', 'B260910', 'decided', 'OPR001', 'OPR001'),
('SR005', 'PLT001', 'SAR-2026-000485', '2026-09-22', '08:30', 'LOT-PL65-2609-05', 'PRD026', null, 'TK001', 'TK004', 'SP001', 'B260920', 'decided', 'OPR001', 'OPR001'),
('SR006', 'PLT001', 'SAR-2026-000486', '2026-09-25', '10:00', 'LOT-DAISY-2609-01', 'PRD003', null, 'TK001', 'TK004', 'SP001', 'B260925', 'decided', 'OPR001', 'OPR001'),
('SR007', 'PLT001', 'SAR-2026-000487', '2026-09-28', '14:00', 'LOT-DAISY-2609-02', 'PRD003', null, 'TK001', 'TK004', 'SP001', 'B260928', 'decided', 'OPR001', 'OPR001'),
('SR008', 'PLT001', 'SAR-2026-000488', '2026-09-29', '09:00', 'LOT-NATWOS-2609-01', 'PRD020', null, 'TK001', 'TK004', 'SP001', 'B260929', 'decided', 'OPR001', 'OPR001'),
('SR009', 'PLT001', 'SAR-2026-000489', '2026-10-02', '11:00', 'LOT-RPMO-2610-01', 'PRD031', null, 'TK001', 'TK004', 'SP001', 'B261002', 'decided', 'OPR001', 'OPR001'),
('SR010', 'PLT001', 'SAR-2026-000490', '2026-10-03', '08:30', 'LOT-RPKO-2610-01', 'PRD039', null, 'TK001', 'TK004', 'SP001', 'B261003', 'decided', 'OPR001', 'OPR001'),
('SR011', 'PLT001', 'SAR-2026-000491', '2026-10-04', '10:30', 'LOT-CHOCO-2610-01', 'PRD001', null, 'TK001', 'TK004', 'SP001', 'B261011', 'decided', 'OPR001', 'OPR001')
ON CONFLICT (report_no) DO UPDATE SET id = EXCLUDED.id, plant_id = 'PLT001';

-- 7.13. SAMPLE RESULTS: RES001 onwards
INSERT INTO sample_results (id, report_id, parameter_id, series_key, requested, value_numeric, value_text, in_spec, entered_by) VALUES
('RES001', 'SR001', 'PAR001', null, true, 0.038, null, true, 'QCS001'),
('RES002', 'SR001', 'PAR002', null, true, 0.025, null, true, 'QCS001'),
('RES003', 'SR001', 'PAR003', null, true, 65.4,  null, true, 'QCS001'),
('RES004', 'SR001', 'PAR004', null, true, 0.15,  null, true, 'QCS001'),
('RES005', 'SR001', 'PAR005', null, true, 1.4,   null, true, 'QCS001'),
('RES006', 'SR001', 'PAR006', null, true, 12.0,  null, true, 'QCS001'),
('RES007', 'SR001', 'PAR007', null, true, null,  'Bland / Neutral', true, 'QCS001')
ON CONFLICT (report_id, parameter_id, series_key) DO NOTHING;

-- 7.14. QC DECISIONS: QC001 to QC011
INSERT INTO qc_decisions (
  id, report_id, decision, reason_id, reason_detail, failed_parameters, disposition, decided_by
) VALUES
('QC001', 'SR001', 'accept', null, '{}', null, null, 'QCS001'),
('QC002', 'SR002', 'accept', null, '{}', null, null, 'QCS001'),
('QC003', 'SR003', 'accept', null, '{}', null, null, 'QCS001'),
('QC004', 'SR004', 'accept', null, '{}', null, null, 'MGR001'),
('QC005', 'SR005', 'accept', null, '{}', null, null, 'QCS001'),
('QC006', 'SR006', 'reject', 'REJ007', 'Cloud point 6.8°C exceeds 5.5°C maximum requirement for Daisy Soft grade.', '{"CLOUD_POINT (6.8°C)"}', 'reprocess', 'MGR001'),
('QC007', 'SR007', 'accept', null, '{}', null, null, 'QCS001'),
('QC008', 'SR008', 'accept', null, '{}', null, null, 'QCS001'),
('QC009', 'SR009', 'reject', 'REJ001', 'FFA 0.058% exceeds maximum specification limit of 0.050% for RPMO delivery.', '{"FFA (0.058%)"}', 'downgrade', 'MGR001'),
('QC010', 'SR010', 'reject', 'REJ002', 'Moisture level 0.065% exceeds 0.050% moisture spec. Recirculate through vacuum dryer.', '{"H2O (0.065%)"}', 'reprocess', 'MGR001'),
('QC011', 'SR011', 'accept', null, '{}', null, null, 'QCS001')
ON CONFLICT (id) DO NOTHING;

-- 7.15. ISO CERTIFICATE: ISO001
INSERT INTO iso_certificates (
  id, cert_no, standard, title, scope, issuer, status, issue_date, valid_until
) VALUES
('ISO001', 'ISO-22000-MY-2026-088', 'ISO 22000:2018 / HACCP Codex', 'Refinery Food Safety & Palm Quality System', 'Refining, bleaching and continuous deodorization of palm and specialty fats', 'SIRIM QAS International', 'valid', '2026-01-01', '2028-12-31')
ON CONFLICT (cert_no) DO UPDATE SET id = 'ISO001';

-- 7.16. BATCH PROCESS: BP001
INSERT INTO batch_processes (
  id, batch_no, product_name, feed_tank, discharge_tank, sheet_id, status, notes
) VALUES
('BP001', 'B260901', 'PL 65 Matsuyama (Super Olein)', 'TK-101A', 'TK-201A', 'PR001', 'completed', 'Continuous deodorization campaign under PORAM compliance.')
ON CONFLICT (batch_no) DO UPDATE SET id = 'BP001';

-- 7.17. DOCUMENT MANAGEMENT: DOC001, SOP001, WI001, CRT001, ATT001, REV001
INSERT INTO documents (id, doc_code, title, category, current_revision, status) VALUES
('DOC001', 'RF-FR-001', 'Sample Analysis Report & Quality Disposition Sheet', 'Quality Record', 'Rev 02', 'active'),
('DOC002', 'RF-FR-004', 'Daily Process Control Log (Nisshin Deodorizer)', 'Process Record', 'Rev 02', 'active')
ON CONFLICT (doc_code) DO UPDATE SET id = EXCLUDED.id;

INSERT INTO sops (id, sop_no, title, department, effective_date, review_cycle_months, status) VALUES
('SOP001', 'SOP-REF-DEOD-01', 'Standard Operating Procedure: Nisshin Deodorization and Temperature Regulation', 'Refinery Operations', '2026-01-01', 12, 'approved')
ON CONFLICT (sop_no) DO UPDATE SET id = 'SOP001';

INSERT INTO work_instructions (id, wi_no, title, machine_section, step_count, status) VALUES
('WI001', 'WI-REF-VAC-01', 'Work Instruction: High Vacuum Ejector & Barometric Condenser Monitoring', 'Deodorizer Vacuum Train', 8, 'active')
ON CONFLICT (wi_no) DO UPDATE SET id = 'WI001';

INSERT INTO certificates (id, cert_code, title, batch_no, lot_no, report_id, issued_by) VALUES
('CRT001', 'CRT-REF-2026-001', 'Official Certificate of Analysis (Release Compliance)', 'B260901', 'LOT-PL65-2609-01', 'SR001', 'MGR001')
ON CONFLICT (cert_code) DO UPDATE SET id = 'CRT001';

INSERT INTO attachments (id, report_id, storage_path, file_name, byte_size, uploaded_by) VALUES
('ATT001', 'SR001', 'coa/LOT-PL65-2609-01_CoA.pdf', 'LOT-PL65-2609-01_CoA_Signed.pdf', 245800, 'QCS001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO document_revisions (id, doc_id, revision_no, change_summary, approved_by) VALUES
('REV001', 'DOC001', 'Rev 02', 'Standardization of Industrial Prefixed ID system across all master, production, and lab tables.', 'MGR001')
ON CONFLICT (id) DO NOTHING;

-- 7.18. AUDIT LOG: AL001
INSERT INTO audit_log (id, table_name, record_id, action, actor, old_row, new_row) VALUES
('AL001', 'profiles', 'ADM001', 'insert', 'ADM001', null, '{"event": "Complete schema migration to Standardized Prefixed Record IDs across ALL 24 tables"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 8. SYNCHRONIZE SEQUENCES TO PREVENT ID COLLISION ON FUTURE INSERTS
SELECT setval('seq_plt_id', GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM plants)));
SELECT setval('seq_prd_id', GREATEST(46, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM products)));
SELECT setval('seq_tk_id',  GREATEST(7,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM tanks)));
SELECT setval('seq_sp_id',  GREATEST(6,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM sampling_points)));
SELECT setval('seq_par_id', GREATEST(15, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM parameters)));
SELECT setval('seq_lim_id', GREATEST(18, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM parameter_limits)));
SELECT setval('seq_rej_id', GREATEST(14, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM rejection_reasons)));
SELECT setval('seq_pr_id',  GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM process_sheets)));
SELECT setval('seq_pl_id',  GREATEST(25, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM process_entries)));
SELECT setval('seq_ar_id',  GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM deviations)));
SELECT setval('seq_sr_id',  GREATEST(12, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM sample_reports)));
SELECT setval('seq_res_id', GREATEST(20, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM sample_results)));
SELECT setval('seq_qc_id',  GREATEST(12, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM qc_decisions)));
SELECT setval('seq_iso_id', GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM iso_certificates)));
SELECT setval('seq_bp_id',  GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM batch_processes)));
SELECT setval('seq_al_id',  GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM audit_log)));
SELECT setval('seq_doc_id', GREATEST(3,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM documents)));
SELECT setval('seq_sop_id', GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM sops)));
SELECT setval('seq_wi_id',  GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM work_instructions)));
SELECT setval('seq_crt_id', GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM certificates)));
SELECT setval('seq_att_id', GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM attachments)));
SELECT setval('seq_rev_id', GREATEST(2,  (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM document_revisions)));

-- 9. GRANT PERMISSIONS FOR POSTGREST & SUPABASE ACCESS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- End of Comprehensive Master Migration Script
-- ==============================================================================
