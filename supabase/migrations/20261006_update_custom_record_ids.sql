-- ==============================================================================
-- REFINERY PROCESS MANAGEMENT SYSTEM (PRD-REF-001)
-- Migration: Custom Industrial Record IDs (Replacing UUIDs with Prefixed IDs)
-- Lam Soon Edible Oils Sdn. Bhd. — Nisshin Deodorizer Plant
--
-- Standards Enforced:
-- Core Module:
--   - SR001  → Sample Report (sample_reports.id)
--   - QC001  → QC Decision (qc_decisions.id)
--   - ISO001 → ISO Certificate (iso_certificates.id)
--   - BP001  → Batch Process (batch_processes.id)
--   - PR001  → Production Record (process_sheets.id)
--   - PL001  → Process Log (process_entries.id)
--   - AR001  → Approval Record (deviations.id)
--   - AL001  → Audit Log (audit_log.id, audit_log.record_id)
--
-- User & Administration:
--   - USR001 → User (profiles.employee_no)
--   - ADM001 → Administrator (profiles.employee_no)
--   - OPR001 → Operator (profiles.employee_no)
--   - QCS001 → QC Staff (profiles.employee_no)
--   - SUP001 → Supervisor (profiles.employee_no)
--   - MGR001 → Manager (profiles.employee_no)
--
-- Document Management:
--   - DOC001 → Document (documents.id)
--   - SOP001 → Standard Operating Procedure (sops.id)
--   - WI001  → Work Instruction (work_instructions.id)
--   - CRT001 → Certificate (certificates.id)
--   - ATT001 → Attachment (attachments.id)
--   - REV001 → Document Revision (document_revisions.id)
-- ==============================================================================

-- 1. DROP EXISTING TRIGGERS & CONSTRAINTS TEMPORARILY
DROP TRIGGER IF EXISTS audit_process_entries ON process_entries;
DROP TRIGGER IF EXISTS audit_sample_reports ON sample_reports;
DROP TRIGGER IF EXISTS audit_qc_decisions ON qc_decisions;

-- 2. SEQUENCES FOR AUTOMATIC ID INCREMENTATION
CREATE SEQUENCE IF NOT EXISTS seq_sr_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_qc_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_iso_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_bp_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_pr_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_pl_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_ar_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_al_id START WITH 1;

CREATE SEQUENCE IF NOT EXISTS seq_doc_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_sop_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_wi_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_crt_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_att_id START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_rev_id START WITH 1;

-- 3. HELPER FUNCTIONS TO GENERATE SEQUENTIAL PREFIXED IDS
CREATE OR REPLACE FUNCTION next_sr_id() RETURNS text AS $$
  SELECT 'SR' || lpad(nextval('seq_sr_id')::text, 3, '0');
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

CREATE OR REPLACE FUNCTION next_pr_id() RETURNS text AS $$
  SELECT 'PR' || lpad(nextval('seq_pr_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_pl_id() RETURNS text AS $$
  SELECT 'PL' || lpad(nextval('seq_pl_id')::text, 3, '0');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION next_ar_id() RETURNS text AS $$
  SELECT 'AR' || lpad(nextval('seq_ar_id')::text, 3, '0');
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

-- 4. CONVERT EXISTING REFINERY TABLES TO TEXT IDENTIFIERS
-- Drop dependent tables to recreate with clean TEXT schema without type conflicts
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS qc_decisions CASCADE;
DROP TABLE IF EXISTS sample_results CASCADE;
DROP TABLE IF EXISTS sample_reports CASCADE;
DROP TABLE IF EXISTS deviations CASCADE;
DROP TABLE IF EXISTS process_entries CASCADE;
DROP TABLE IF EXISTS process_sheets CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS iso_certificates CASCADE;
DROP TABLE IF EXISTS batch_processes CASCADE;
DROP TABLE IF EXISTS document_revisions CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS work_instructions CASCADE;
DROP TABLE IF EXISTS sops CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Ensure profiles table has id column and updated user entries
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS id text;
UPDATE profiles SET id = employee_no WHERE id IS NULL;

-- 4.1. CORE MODULE: PRODUCTION RECORDS (PR001)
CREATE TABLE process_sheets (
  id text PRIMARY KEY DEFAULT next_pr_id(),
  plant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
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

-- 4.2. CORE MODULE: PROCESS LOGS (PL001)
CREATE TABLE process_entries (
  id text PRIMARY KEY DEFAULT next_pl_id(),
  sheet_id text NOT NULL REFERENCES process_sheets(id) ON DELETE CASCADE,
  slot_index smallint NOT NULL CHECK (slot_index BETWEEN 0 AND 23),
  slot_label text GENERATED ALWAYS AS (
    lpad((((slot_index + 7) % 24) * 100)::text, 4, '0')
  ) STORED,
  slot_start timestamptz NOT NULL,
  product_id uuid,
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

-- 4.3. CORE MODULE: APPROVAL RECORDS (AR001)
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

-- 4.4. CORE MODULE: SAMPLE REPORTS (SR001)
CREATE TABLE sample_reports (
  id text PRIMARY KEY DEFAULT next_sr_id(),
  plant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  report_no text UNIQUE NOT NULL,
  sample_date date NOT NULL DEFAULT current_date,
  time_check time NOT NULL DEFAULT current_time,
  lot_no text NOT NULL,
  product_id uuid,
  product_other text,
  feed_tank_id uuid,
  discharge_tank_id uuid,
  crystallizer_no text,
  batch_no text,
  sampling_point_id uuid,
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

-- 4.5. SAMPLE RESULTS
CREATE TABLE sample_results (
  id text PRIMARY KEY,
  report_id text NOT NULL REFERENCES sample_reports(id) ON DELETE CASCADE,
  parameter_id uuid,
  series_key numeric,
  requested boolean NOT NULL DEFAULT true,
  value_numeric numeric,
  value_text text,
  in_spec boolean,
  entered_by text REFERENCES profiles(employee_no),
  entered_at timestamptz,
  UNIQUE (report_id, parameter_id, series_key)
);

-- 4.6. CORE MODULE: QC DECISIONS (QC001)
CREATE TABLE qc_decisions (
  id text PRIMARY KEY DEFAULT next_qc_id(),
  report_id text NOT NULL REFERENCES sample_reports(id) ON DELETE CASCADE,
  decision text NOT NULL,
  reason_id uuid,
  reason_detail text,
  failed_parameters text[],
  disposition text,
  decided_by text REFERENCES profiles(employee_no),
  decided_at timestamptz NOT NULL DEFAULT now(),
  supersedes_id text REFERENCES qc_decisions(id),
  overturn_reason text
);

-- 4.7. CORE MODULE: ISO CERTIFICATE (ISO001)
CREATE TABLE iso_certificates (
  id text PRIMARY KEY DEFAULT next_iso_id(),
  cert_no text NOT NULL UNIQUE,
  standard text NOT NULL,                -- 'ISO 22000:2018', 'HACCP Codex Alimentarius'
  title text NOT NULL,
  scope text NOT NULL,
  issuer text NOT NULL,
  status text NOT NULL DEFAULT 'valid',  -- 'valid', 'pending_renewal', 'expired'
  issue_date date NOT NULL,
  valid_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.8. CORE MODULE: BATCH PROCESS (BP001)
CREATE TABLE batch_processes (
  id text PRIMARY KEY DEFAULT next_bp_id(),
  batch_no text NOT NULL UNIQUE,
  product_name text NOT NULL,
  feed_tank text,
  discharge_tank text,
  sheet_id text REFERENCES process_sheets(id),
  status text NOT NULL DEFAULT 'running', -- 'running', 'completed', 'released', 'on_hold'
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.9. DOCUMENT MANAGEMENT: DOCUMENTS (DOC001)
CREATE TABLE documents (
  id text PRIMARY KEY DEFAULT next_doc_id(),
  doc_code text NOT NULL UNIQUE,          -- 'RF-FR-001', 'RF-FR-004'
  title text NOT NULL,
  category text NOT NULL,                 -- 'Form', 'Manual', 'Policy'
  current_revision text NOT NULL DEFAULT 'Rev 02',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.10. DOCUMENT MANAGEMENT: STANDARD OPERATING PROCEDURES (SOP001)
CREATE TABLE sops (
  id text PRIMARY KEY DEFAULT next_sop_id(),
  sop_no text NOT NULL UNIQUE,            -- 'SOP-REF-DEOD-01'
  title text NOT NULL,
  department text NOT NULL DEFAULT 'Refinery Operations',
  effective_date date NOT NULL,
  review_cycle_months int NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.11. DOCUMENT MANAGEMENT: WORK INSTRUCTIONS (WI001)
CREATE TABLE work_instructions (
  id text PRIMARY KEY DEFAULT next_wi_id(),
  wi_no text NOT NULL UNIQUE,             -- 'WI-REF-001'
  title text NOT NULL,
  machine_section text NOT NULL,          -- 'Nisshin Deodorizer Tower & Trays 1-7'
  step_count int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4.12. DOCUMENT MANAGEMENT: CERTIFICATES (CRT001)
CREATE TABLE certificates (
  id text PRIMARY KEY DEFAULT next_crt_id(),
  cert_code text NOT NULL UNIQUE,         -- 'COA-2026-0001'
  title text NOT NULL,
  batch_no text,
  lot_no text,
  report_id text REFERENCES sample_reports(id),
  issued_by text REFERENCES profiles(employee_no),
  issued_at timestamptz NOT NULL DEFAULT now()
);

-- 4.13. DOCUMENT MANAGEMENT: ATTACHMENTS (ATT001)
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

-- 4.14. DOCUMENT MANAGEMENT: DOCUMENT REVISIONS (REV001)
CREATE TABLE document_revisions (
  id text PRIMARY KEY DEFAULT next_rev_id(),
  doc_id text REFERENCES documents(id) ON DELETE CASCADE,
  revision_no text NOT NULL,              -- 'Rev 01', 'Rev 02'
  change_summary text NOT NULL,
  approved_by text REFERENCES profiles(employee_no),
  approved_at timestamptz NOT NULL DEFAULT now()
);

-- 4.15. CORE MODULE: AUDIT LOG (AL001)
CREATE TABLE audit_log (
  id text PRIMARY KEY DEFAULT next_al_id(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,                   -- 'insert', 'update', 'void'
  actor text REFERENCES profiles(employee_no),
  old_row jsonb, 
  new_row jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- 5. AUDIT TRAIL TRIGGER FUNCTION (ACCEPTS TEXT RECORD_IDS)
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

-- Rebind audit triggers
CREATE TRIGGER audit_process_entries
AFTER INSERT OR UPDATE ON process_entries
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_sample_reports
AFTER INSERT OR UPDATE ON sample_reports
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_qc_decisions
AFTER INSERT OR UPDATE ON qc_decisions
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- 6. POPULATE INITIAL DATA WITH EXACT STANDARDIZED IDS

-- 6.1. USER & ADMINISTRATION SEEDS (USR001, ADM001, OPR001, QCS001, SUP001, MGR001)
INSERT INTO profiles (employee_no, id, full_name, role, status, password) VALUES
('ADM001', 'ADM001', 'Haris Iskandar (Administrator)', 'admin', 'active', 'password123'),
('OPR001', 'OPR001', 'Ahmad Razak (Operator)', 'operator', 'active', 'password123'),
('QCS001', 'QCS001', 'Siti Nurhaliza (QC Staff)', 'qc_analyst', 'active', 'password123'),
('SUP001', 'SUP001', 'Chong Wei Lun (Supervisor)', 'supervisor', 'active', 'password123'),
('MGR001', 'MGR001', 'Dr. Tan Keng Boon (Manager)', 'qc_manager', 'active', 'password123'),
('USR001', 'USR001', 'ISO Quality Auditor (User)', 'viewer', 'active', 'password123')
ON CONFLICT (employee_no) DO UPDATE SET 
  id = EXCLUDED.id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- 6.2. CORE MODULE: PRODUCTION RECORD (PR001)
INSERT INTO process_sheets (id, plant_id, shift_date, stripping_steam_pct, set_steam_supply_bar, status, opened_by) VALUES
('PR001', '11111111-1111-1111-1111-111111111111', '2026-09-20', 1.5, 3.0, 'open', 'OPR001')
ON CONFLICT (plant_id, shift_date) DO UPDATE SET id = 'PR001';

-- 6.3. CORE MODULE: PROCESS LOGS (PL001 to PL003)
INSERT INTO process_entries (
  id, sheet_id, slot_index, slot_start, product_name, oil_feed_rate_litre, deod_time_set_hr,
  vacuum_torr, tray_1_temp_c, tray_2_temp_c, tray_3_temp_c, tray_4_temp_c, tray_5_temp_c,
  tray_6_temp_c, tray_7_temp_c, bc101_water_in_c, bc101_water_out_c, chill_water_in_c,
  chill_water_out_c, booster_press_bar, ejector_press_bar, strip_steam_pct_of_oil,
  strip_steam_flow_kghr, fp101a_press_bar, fp101b_press_bar, recorded_by, has_deviation
) VALUES
('PL001', 'PR001', 0, '2026-09-20 07:00:00+08', 'PL 65 Matsuyama', 25000, 2.0, 2.8, 252.0, 256.0, 260.0, 264.0, 263.5, 242.0, 195.0, 31.0, 42.0, 10.5, 16.0, 9.8, 10.1, 1.5, 375.0, 2.2, 2.1, 'OPR001', false),
('PL002', 'PR001', 1, '2026-09-20 08:00:00+08', 'PL 65 Matsuyama', 25100, 2.0, 2.7, 253.2, 257.0, 261.2, 265.0, 264.0, 241.5, 196.0, 31.5, 43.0, 10.8, 16.5, 9.7, 10.0, 1.5, 376.5, 2.3, 2.2, 'OPR001', false),
('PL003', 'PR001', 2, '2026-09-20 09:00:00+08', 'PL 65 Matsuyama', 25050, 2.0, 4.8, 254.0, 258.1, 262.5, 266.0, 265.2, 243.1, 197.0, 32.1, 44.2, 11.0, 17.5, 9.6, 9.9, 1.5, 375.0, 2.4, 2.3, 'OPR001', true)
ON CONFLICT (sheet_id, slot_index) DO NOTHING;

-- 6.4. CORE MODULE: APPROVAL RECORD (AR001)
INSERT INTO deviations (
  id, entry_id, field_key, observed, soft_min, soft_max, acknowledged_by, action_taken
) VALUES
('AR001', 'PL003', 'vacuum_torr', 4.8, 1.0, 4.5, 'SUP001', 'Inspected cooling water tower pump #2 and restored vacuum to 2.8 Torr.')
ON CONFLICT (id) DO NOTHING;

-- 6.5. CORE MODULE: SAMPLE REPORTS (SR001 to SR011)
INSERT INTO sample_reports (
  id, plant_id, report_no, sample_date, time_check, lot_no, product_other, batch_no, status, created_by, submitted_by
) VALUES
('SR001', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000481', '2026-09-20', '07:30', 'LOT-PL65-2609-01', 'PL 65 Matsuyama', 'B260901', 'decided', 'OPR001', 'OPR001'),
('SR002', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000482', '2026-09-20', '11:00', 'LOT-PL65-2609-02', 'PL 65 Matsuyama', 'B260902', 'decided', 'OPR001', 'OPR001'),
('SR003', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000483', '2026-09-20', '15:30', 'LOT-PL65-2609-03', 'PL 65 Matsuyama', 'B260903', 'decided', 'OPR001', 'OPR001'),
('SR004', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000484', '2026-09-21', '08:00', 'LOT-CHOCO-2609-01', 'Chocohi 357A NPHO', 'B260910', 'decided', 'OPR001', 'OPR001'),
('SR005', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000485', '2026-09-22', '08:30', 'LOT-PL65-2609-05', 'PL 65 Matsuyama', 'B260920', 'decided', 'OPR001', 'OPR001'),
('SR006', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000486', '2026-09-25', '10:00', 'LOT-DAISY-2609-01', 'Daisy Soft PM180602 I2', 'B260925', 'decided', 'OPR001', 'OPR001'),
('SR007', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000487', '2026-09-28', '14:00', 'LOT-DAISY-2609-02', 'Daisy Soft PM180602 I2', 'B260928', 'decided', 'OPR001', 'OPR001'),
('SR008', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000488', '2026-09-29', '09:00', 'LOT-NATWOS-2609-01', 'Naturel WOS', 'B260929', 'decided', 'OPR001', 'OPR001'),
('SR009', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000489', '2026-10-02', '11:00', 'LOT-RPMO-2610-01', 'RPMO', 'B261002', 'decided', 'OPR001', 'OPR001'),
('SR010', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000490', '2026-10-03', '08:30', 'LOT-RPKO-2610-01', 'RPKO', 'B261003', 'decided', 'OPR001', 'OPR001'),
('SR011', '11111111-1111-1111-1111-111111111111', 'SAR-2026-000491', '2026-10-04', '10:30', 'LOT-CHOCO-2610-01', 'Chocohi 357A NPHO', 'B261011', 'decided', 'OPR001', 'OPR001')
ON CONFLICT (report_no) DO UPDATE SET id = EXCLUDED.id;

-- 6.6. CORE MODULE: QC DECISIONS (QC001 to QC011)
INSERT INTO qc_decisions (
  id, report_id, decision, reason_detail, failed_parameters, disposition, decided_by
) VALUES
('QC001', 'SR001', 'accept', null, '{}', null, 'QCS001'),
('QC002', 'SR002', 'accept', null, '{}', null, 'QCS001'),
('QC003', 'SR003', 'accept', null, '{}', null, 'QCS001'),
('QC004', 'SR004', 'accept', null, '{}', null, 'MGR001'),
('QC005', 'SR005', 'accept', null, '{}', null, 'QCS001'),
('QC006', 'SR006', 'reject', 'Cloud point 6.8°C exceeds 5.5°C maximum requirement for Daisy Soft grade.', '{"CLOUD_POINT (6.8°C)"}', 'reprocess', 'MGR001'),
('QC007', 'SR007', 'accept', null, '{}', null, 'QCS001'),
('QC008', 'SR008', 'accept', null, '{}', null, 'QCS001'),
('QC009', 'SR009', 'reject', 'FFA 0.058% exceeds maximum specification limit of 0.050% for RPMO delivery.', '{"FFA (0.058%)"}', 'downgrade', 'MGR001'),
('QC010', 'SR010', 'reject', 'Moisture level 0.065% exceeds 0.050% moisture spec. Recirculate through vacuum dryer.', '{"H2O (0.065%)"}', 'reprocess', 'MGR001'),
('QC011', 'SR011', 'accept', null, '{}', null, 'QCS001')
ON CONFLICT (id) DO NOTHING;

-- 6.7. CORE MODULE: ISO CERTIFICATE (ISO001)
INSERT INTO iso_certificates (
  id, cert_no, standard, title, scope, issuer, status, issue_date, valid_until
) VALUES
('ISO001', 'ISO-22000-MY-2026-088', 'ISO 22000:2018 / HACCP Codex', 'Refinery Food Safety & Palm Quality System', 'Refining, bleaching and continuous deodorization of palm and specialty fats', 'SIRIM QAS International', 'valid', '2026-01-01', '2028-12-31')
ON CONFLICT (cert_no) DO UPDATE SET id = 'ISO001';

-- 6.8. CORE MODULE: BATCH PROCESS (BP001)
INSERT INTO batch_processes (
  id, batch_no, product_name, feed_tank, discharge_tank, sheet_id, status, notes
) VALUES
('BP001', 'B260901', 'PL 65 Matsuyama (Super Olein)', 'TK-101A', 'TK-201A', 'PR001', 'completed', 'Continuous deodorization campaign under PORAM compliance.')
ON CONFLICT (batch_no) DO UPDATE SET id = 'BP001';

-- 6.9. DOCUMENT MANAGEMENT SEEDS: DOC001, SOP001, WI001, CRT001, ATT001, REV001
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
('REV001', 'DOC001', 'Rev 02', 'Standardization of Industrial Prefixed ID system (SR001, QC001, PL001, PR001).', 'MGR001')
ON CONFLICT (id) DO NOTHING;

-- 6.10. CORE MODULE: AUDIT LOG (AL001)
INSERT INTO audit_log (id, table_name, record_id, action, actor, old_row, new_row) VALUES
('AL001', 'profiles', 'ADM001', 'insert', 'ADM001', null, '{"event": "System migration to Standardized Prefixed Record IDs"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. SYNCHRONIZE SEQUENCES TO PREVENT ID COLLISION ON FUTURE INSERTS
SELECT setval('seq_sr_id', GREATEST(12, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM sample_reports)));
SELECT setval('seq_qc_id', GREATEST(12, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM qc_decisions)));
SELECT setval('seq_iso_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM iso_certificates)));
SELECT setval('seq_bp_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM batch_processes)));
SELECT setval('seq_pr_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM process_sheets)));
SELECT setval('seq_pl_id', GREATEST(25, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM process_entries)));
SELECT setval('seq_ar_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM deviations)));
SELECT setval('seq_al_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM audit_log)));

SELECT setval('seq_doc_id', GREATEST(3, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM documents)));
SELECT setval('seq_sop_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM sops)));
SELECT setval('seq_wi_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM work_instructions)));
SELECT setval('seq_crt_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM certificates)));
SELECT setval('seq_att_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM attachments)));
SELECT setval('seq_rev_id', GREATEST(2, (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint), 1) FROM document_revisions)));

-- ==============================================================================
-- End of Migration Script
-- ==============================================================================
