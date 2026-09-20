-- ==============================================================================
-- REFINERY PROCESS MANAGEMENT SYSTEM (PRD-REF-001)
-- Lam Soon Edible Oils Sdn. Bhd. — Nisshin Deodorizer Plant
-- Replaces RF-FR-004 Rev. 02 & RF-FR-001 Rev. 02
-- Database Schema, Functions, RLS Policies & Seed Data
-- ==============================================================================

-- 1. ENUMS
create type user_role as enum ('operator', 'supervisor', 'qc_analyst', 'qc_manager', 'admin', 'viewer');
create type sheet_status as enum ('open', 'submitted', 'verified', 'amended');
create type report_status as enum ('draft', 'awaiting_results', 'results_entered', 'decided', 'voided');
create type qc_decision as enum ('accept', 'accept_concession', 'reject');
create type disposition as enum ('rework', 'reprocess', 'downgrade', 'hold', 'scrap');

-- 2. MASTER & REFERENCE TABLES
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 'NISSHIN_DEOD'
  name text not null,
  timezone text not null default 'Asia/Kuala_Lumpur',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  employee_no text primary key,
  full_name text not null,
  role user_role not null default 'operator',
  status text not null default 'active' check (status in ('active', 'unactive')),
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 'PL65_MATSUYAMA'
  name text not null,                     -- 'PL65 Matsuyama'
  category text,                          -- olein / stearin / kernel / blend / by-product
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tanks (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id),
  code text not null,
  kind text not null check (kind in ('feed', 'discharge', 'both')),
  active boolean not null default true,
  unique (plant_id, code)
);

create table if not exists sampling_points (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id),
  name text not null,
  active boolean not null default true
);

create table if not exists parameters (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 'FFA','H2O','IV','PV','COLOUR_R','SFC'
  name text not null,
  unit text,
  decimals int not null default 2,
  is_series boolean not null default false,   -- true for SFC
  series_values numeric[],                   -- {10,15,20,25,30,35,40,45,50}
  input_kind text not null default 'numeric', -- numeric | text | select
  sort_order int not null default 0
);

create table if not exists product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  parameter_id uuid not null references parameters(id),
  series_key numeric,                     -- the SFC temperature, null otherwise
  min_value numeric, 
  max_value numeric, 
  target_value numeric,
  effective_from date not null default current_date,
  unique (product_id, parameter_id, series_key, effective_from)
);

create table if not exists parameter_limits (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id),
  field_key text not null,                -- 'tray_1_temp_c','vacuum_torr', ...
  product_id uuid references products(id),-- null = applies to all products
  hard_min numeric, 
  hard_max numeric,
  soft_min numeric, 
  soft_max numeric,
  unique (plant_id, field_key, product_id)
);

-- 3. RF-FR-004 : PROCESS CONTROL LOG
create table if not exists process_sheets (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id),
  shift_date date not null,               -- sheet runs 07:00 D to 06:00 D+1
  stripping_steam_pct numeric(5,2) not null default 1.5,
  set_steam_supply_bar numeric(6,2) not null default 3.0,
  status sheet_status not null default 'open',
  opened_by text references profiles(employee_no),
  opened_at timestamptz not null default now(),
  verified_by text references profiles(employee_no),
  verified_at timestamptz,
  unique (plant_id, shift_date)
);

create table if not exists process_entries (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references process_sheets(id) on delete restrict,
  slot_index smallint not null check (slot_index between 0 and 23),  -- 0 = 0700, 23 = 0600
  slot_label text generated always as (
    lpad((((slot_index + 7) % 24) * 100)::text, 4, '0')
  ) stored,
  slot_start timestamptz not null,
  product_id uuid references products(id),             -- "Type of Oil"

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

  strip_steam_pct_of_oil numeric(5,2),
  strip_steam_flow_kghr  numeric(8,1),

  fp101a_press_bar numeric(6,2), 
  fp101b_press_bar numeric(6,2),

  remarks text,
  no_production_reason text,              -- set when the hour is intentionally blank
  has_deviation boolean not null default false,
  recorded_by text references profiles(employee_no),
  recorded_at timestamptz not null default now(),
  amended_by text references profiles(employee_no),
  amended_at timestamptz,
  amend_reason text,
  client_uuid uuid unique,                -- offline idempotency key
  unique (sheet_id, slot_index)
);

create table if not exists deviations (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references process_entries(id) on delete restrict,
  field_key text not null,
  observed numeric not null,
  soft_min numeric, 
  soft_max numeric,
  acknowledged_by text references profiles(employee_no),
  acknowledged_at timestamptz,
  action_taken text,
  created_at timestamptz not null default now()
);

-- 4. RF-FR-001 : SAMPLE ANALYSIS REPORT
create table if not exists sample_reports (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id),
  report_no text unique not null,         -- SAR-2026-000481
  sample_date date not null default current_date,
  time_check time not null default current_time,
  lot_no text not null,
  product_id uuid references products(id),
  product_other text,                     -- used when "Others" is chosen
  feed_tank_id uuid references tanks(id),
  discharge_tank_id uuid references tanks(id),
  crystallizer_no text,
  batch_no text,
  sampling_point_id uuid references sampling_points(id),
  submitted_by text references profiles(employee_no),
  submitted_by_name text,
  remark_flushing boolean not null default false,
  remark_cooling  boolean not null default false,
  remark_pushover boolean not null default false,
  remarks text,
  status report_status not null default 'draft',
  created_by text references profiles(employee_no),
  created_at timestamptz not null default now(),
  check (product_id is not null or product_other is not null)
);

create table if not exists sample_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references sample_reports(id) on delete restrict,
  parameter_id uuid not null references parameters(id),
  series_key numeric,                     -- SFC temperature, null otherwise
  requested boolean not null default true,-- tick on the paper form
  value_numeric numeric,
  value_text text,                        -- odour, or categorical
  in_spec boolean,                        -- computed against product_specs
  entered_by text references profiles(employee_no),
  entered_at timestamptz,
  unique (report_id, parameter_id, series_key)
);

create table if not exists rejection_reasons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null,
  active boolean not null default true
);

create table if not exists qc_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references sample_reports(id) on delete restrict,
  decision qc_decision not null,
  reason_id uuid references rejection_reasons(id),
  reason_detail text,
  failed_parameters text[],
  disposition disposition,
  decided_by text references profiles(employee_no),
  decided_at timestamptz not null default now(),
  supersedes_id uuid references qc_decisions(id),
  overturn_reason text,
  check (decision = 'accept' or reason_id is not null),
  check (decision = 'accept' or length(coalesce(reason_detail,'')) >= 10)
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references sample_reports(id),
  entry_id uuid references process_entries(id),
  storage_path text not null,
  file_name text not null, 
  byte_size int not null,
  uploaded_by text references profiles(employee_no),
  uploaded_at timestamptz not null default now()
);

-- 5. AUDIT LOG (IMMUTABLE, DB TRIGGER CONTROLLED)
create table if not exists audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,                   -- insert | update | void
  actor text references profiles(employee_no),
  old_row jsonb, 
  new_row jsonb,
  occurred_at timestamptz not null default now()
);

-- INDEXES
create index if not exists idx_process_entries_sheet_slot on process_entries(sheet_id, slot_index);
create index if not exists idx_process_entries_slot_start on process_entries(slot_start desc);
create index if not exists idx_sample_reports_lot_no on sample_reports(lot_no);
create index if not exists idx_sample_reports_date_plant on sample_reports(sample_date desc, plant_id);
create index if not exists idx_audit_log_target on audit_log(table_name, record_id);

-- 6. AUDIT TRIGGER FUNCTION
create or replace function log_audit_trail() returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    insert into audit_log (table_name, record_id, action, new_row)
    values (TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW));
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    insert into audit_log (table_name, record_id, action, old_row, new_row)
    values (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  elsif (TG_OP = 'DELETE') then
    insert into audit_log (table_name, record_id, action, old_row)
    values (TG_TABLE_NAME, OLD.id, 'void', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create or replace trigger audit_process_entries
after insert or update on process_entries
for each row execute function log_audit_trail();

create or replace trigger audit_sample_reports
after insert or update on sample_reports
for each row execute function log_audit_trail();

create or replace trigger audit_qc_decisions
after insert or update on qc_decisions
for each row execute function log_audit_trail();

-- 7. SEED DATA (NISSHIN PLANT, 44 PRODUCTS, PARAMETERS, LIMITS, REASONS)
insert into plants (id, code, name, timezone)
values ('11111111-1111-1111-1111-111111111111', 'NISSHIN_DEOD', 'Nisshin Deodorizer Plant', 'Asia/Kuala_Lumpur')
on conflict (code) do nothing;

-- 44 Products from PRD Appendix
insert into products (code, name, category, sort_order) values
('CHOCOHI_357A_NPHO', 'Chocohi 357A NPHO', 'specialty', 1),
('CHOCOHI_369A', 'Chocohi 369A', 'specialty', 2),
('DAISY_SOFT_PM180602_I2', 'Daisy Soft PM180602 I2', 'olein', 3),
('DF_20', 'DF 20', 'blend', 4),
('FARM_COW_R2', 'Farm Cow R2', 'blend', 5),
('G9', 'G9', 'blend', 6),
('HPO_58', 'HPO 58', 'stearin', 7),
('HPKO', 'HPKO', 'kernel', 8),
('HPS_52', 'HPS 52', 'stearin', 9),
('HPS_58', 'HPS 58', 'stearin', 10),
('HYFAT_L1', 'Hyfat L1', 'specialty', 11),
('HYFAT_K1_P', 'Hyfat K1 (P)', 'specialty', 12),
('HYFAT_K1_B', 'Hyfat K1 (B)', 'specialty', 13),
('PMF', 'PMF', 'specialty', 14),
('PR_PMF', 'PR PMF', 'specialty', 15),
('IEPMF', 'IEPMF', 'specialty', 16),
('R_IEPMF', 'R. IEPMF', 'specialty', 17),
('PR_IEPMF', 'PR IEPMF', 'specialty', 18),
('KRIMWELL_IER', 'Krimwell IER', 'specialty', 19),
('NATUREL_WOS', 'Naturel WOS', 'consumer', 20),
('NATUREL_LITE', 'Naturel Lite', 'consumer', 21),
('NATUREL_OLIVE', 'Naturel Olive', 'consumer', 22),
('PASTRIFET_SK', 'Pastrifet SK', 'shortening', 23),
('PL_56', 'PL 56', 'olein', 24),
('PL_60', 'PL 60', 'olein', 25),
('PL_65_MATSUYAMA', 'PL 65 Matsuyama', 'olein', 26),
('PL_65_WAYIDEAL', 'PL 65 Wayideal', 'olein', 27),
('PR_PL65', 'PR PL65', 'olein', 28),
('NBD_PL65', 'NBD PL65', 'olein', 29),
('PALM_FAT_BLEND', 'Palm Fat Blend', 'blend', 30),
('RPMO', 'RPMO', 'olein', 31),
('PR_PMO', 'PR PMO', 'olein', 32),
('RSTN', 'RSTN', 'stearin', 33),
('RSTN_S', 'RSTN (S)', 'stearin', 34),
('RSTN_H', 'RSTN (H)', 'stearin', 35),
('PR_STN', 'PR STN', 'stearin', 36),
('PR_STN_S', 'PR STN (S)', 'stearin', 37),
('PR_STN_H', 'PR STN (H)', 'stearin', 38),
('RPKO', 'RPKO', 'kernel', 39),
('RPKL', 'RPKL', 'kernel', 40),
('SHORTENING', 'Shortening', 'shortening', 41),
('SRIV60_FMF_SNAX', 'SRIV60 (FMF Snax)', 'specialty', 42),
('SPLASH_OIL', 'Splash Oil', 'blend', 43),
('FLUSH_OIL', 'Flush Oil', 'by-product', 44),
('PFAD', 'PFAD', 'by-product', 45)
on conflict (code) do nothing;

-- Tanks
insert into tanks (plant_id, code, kind) values
('11111111-1111-1111-1111-111111111111', 'TK-101A', 'feed'),
('11111111-1111-1111-1111-111111111111', 'TK-101B', 'feed'),
('11111111-1111-1111-1111-111111111111', 'TK-102', 'feed'),
('11111111-1111-1111-1111-111111111111', 'TK-201A', 'discharge'),
('11111111-1111-1111-1111-111111111111', 'TK-201B', 'discharge'),
('11111111-1111-1111-1111-111111111111', 'TK-202', 'discharge')
on conflict (plant_id, code) do nothing;

-- Sampling Points
insert into sampling_points (plant_id, name) values
('11111111-1111-1111-1111-111111111111', 'Deodorizer Outlet'),
('11111111-1111-1111-1111-111111111111', 'Tray 7 Sampling Cock'),
('11111111-1111-1111-1111-111111111111', 'Cooler BC101 Outlet'),
('11111111-1111-1111-1111-111111111111', 'Storage Tank Inflow'),
('11111111-1111-1111-1111-111111111111', 'Polishing Filter FP101 Outlet')
on conflict do nothing;

-- Lab Parameters
insert into parameters (code, name, unit, decimals, is_series, series_values, input_kind, sort_order) values
('FFA', 'Free Fatty Acid (as Palmitic)', '%', 2, false, null, 'numeric', 1),
('H2O', 'Moisture & Impurities', '%', 3, false, null, 'numeric', 2),
('IV', 'Iodine Value (Wijs)', 'g I2/100g', 1, false, null, 'numeric', 3),
('PV', 'Peroxide Value', 'meq/kg', 2, false, null, 'numeric', 4),
('COLOUR_R', 'Colour Lovibond Red (5¼" cell)', 'R', 1, false, null, 'numeric', 5),
('COLOUR_Y', 'Colour Lovibond Yellow (5¼" cell)', 'Y', 1, false, null, 'numeric', 6),
('ODOUR', 'Odour Assessment', null, 0, false, null, 'select', 7),
('BPP', 'Breakdown Product Point', '°C', 1, false, null, 'numeric', 8),
('SLIP_MELT', 'Slip Melting Point', '°C', 1, false, null, 'numeric', 9),
('CLOUD_POINT', 'Cloud Point', '°C', 1, false, null, 'numeric', 10),
('SOAP', 'Soap Content', 'ppm', 1, false, null, 'numeric', 11),
('FAC_C12', 'Fatty Acid Composition C12:0', '%', 2, false, null, 'numeric', 12),
('SFC', 'Solid Fat Content Series', '%', 1, true, array[10,15,20,25,30,35,40,45,50], 'numeric', 13)
on conflict (code) do nothing;

-- Rejection Reason Codes
insert into rejection_reasons (code, label) values
('FFA_HIGH', 'FFA above specification'),
('H2O_HIGH', 'Moisture & Impurities above specification'),
('PV_HIGH', 'Peroxide value above specification'),
('COLOUR_OUT', 'Colour out of specification'),
('OFF_ODOUR', 'Off odour detected'),
('SMP_OUT', 'Slip melting point out of range'),
('CLOUD_OUT', 'Cloud point out of range'),
('SFC_OUT', 'SFC profile out of range'),
('SOAP_HIGH', 'Soap content above limit'),
('IV_OUT', 'Iodine value out of range'),
('CONTAMINATION', 'Cross-contamination suspected'),
('WRONG_TANK', 'Wrong product pumped into tank'),
('SAMPLING_ERR', 'Sampling error, resample required')
on conflict (code) do nothing;
