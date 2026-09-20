---
document: PRD-REF-001
title: Refinery Process Management System
revision: 00 — draft
date: 2026-09-20
status: For approval
owner: Lam Soon Edible Oils Sdn. Bhd. — Refinery
replaces: [RF-FR-004 Rev. 02, RF-FR-001 Rev. 02]
stack: [Next.js 15, TypeScript, Supabase, Vercel]
---

# Refinery Process Management System

**Product requirements — PRD-REF-001, Revision 00**

Lam Soon Edible Oils Sdn. Bhd. — Refinery · Nisshin Deodorizer Plant

Replacing the RF-FR-004 hourly deodorizer log and the RF-FR-001 sample analysis
report with one web application that operators, supervisors and QC share in real time.

| | |
|---|---|
| Document no. | PRD-REF-001 |
| Revision | 00 — draft |
| Date | 20 September 2026 |
| Status | For approval |
| Replaces | RF-FR-004 Rev. 02, RF-FR-001 Rev. 02 |
| Build estimate | 12 weeks to go-live |

## Contents

1. [Why build this](#1-why-build-this)
2. [Goals and measures](#2-goals-and-measures)
3. [Scope](#3-scope)
4. [Roles and permissions](#4-roles-and-permissions)
5. [The three workflows](#5-the-three-workflows)
6. [Process control log — RF-FR-004](#6-process-control-log--rf-fr-004)
7. [Sample analysis report — RF-FR-001](#7-sample-analysis-report--rf-fr-001)
8. [QC decision — accept or reject](#8-qc-decision--accept-or-reject)
9. [Supervisor monitoring](#9-supervisor-monitoring)
10. [Reports and export](#10-reports-and-export)
11. [Audit trail and record integrity](#11-audit-trail-and-record-integrity)
12. [Data model](#12-data-model)
13. [Architecture](#13-architecture)
14. [Non-functional requirements](#14-non-functional-requirements)
15. [Delivery plan](#15-delivery-plan)
16. [Risks](#16-risks)
17. [Open questions](#17-open-questions)
18. [Appendix — product list for seeding](#18-appendix--product-list-for-seeding)
19. [Approval](#19-approval)

---

## 1. Why build this

Two paper forms carry the refinery's process record. RF-FR-004 is filled by hand every hour from 0700 to 0600 — 24 rows across 21 columns of temperatures, pressures, flow rates and vacuum readings. RF-FR-001 travels with every sample to the lab, where a technician circles one product out of roughly forty and writes in the analysis results.

The paper works, but it has four costs. A supervisor cannot see a deviation until the sheet reaches the office, often a full shift later. A tray temperature that drifted at 0300 gets noticed at 0800. Nobody can trend last month's vacuum performance without keying the sheets into Excel first. And when QC rejects a lot, the reason lives in a remarks box that is never aggregated, so the same failure mode repeats.

This application keeps the exact structure of both forms — operators should recognise the screen as the sheet they already know — while making the data live, validated at the point of entry, and permanently searchable.

- **24** — hourly entries per sheet, 0700 through 0600
- **21** — measured fields per hourly entry
- **12** — lab parameters, including 9 SFC temperatures
- **44** — products on the RF-FR-001 selection list

## 2. Goals and measures

| Goal                                 | How we know it worked                                                                                      |
|--------------------------------------|------------------------------------------------------------------------------------------------------------|
| Operators log faster than on paper   | Median time to complete one hourly entry under 60 seconds after week 2 of use                              |
| No missed hours                      | Fewer than 1% of hourly slots blank at sheet close, down from the current paper gap rate                   |
| Deviations surface immediately       | Out-of-limit reading raises a supervisor alert within 30 seconds of being saved                            |
| QC decisions are traceable           | 100% of rejections carry a reason code and free-text detail; monthly Pareto of reasons available on demand |
| The paper record is still producible | Any sheet or report exports as a PDF laid out like the original form, for audit and customer files         |
| Nothing is lost to bad Wi-Fi         | Entries made offline sync automatically; zero data loss in a 30-minute network outage test                 |

## 3. Scope

### In scope for version 1

- Digital RF-FR-004 process control log for the Nisshin Deodorizer plant, with hourly entry, sheet header settings, and shift handover.
- Digital RF-FR-001 sample analysis report for the refinery section, including the product list, the parameter tick-list, and the SFC temperature series.
- QC accept or reject decision against each sample report, with mandatory reason on rejection.
- Live supervisor dashboard, deviation alerts, and sheet approval.
- Master data administration: products, tanks, sampling points, parameters, specification limits, users.
- PDF and Excel export, audit trail, role-based access.

### Explicitly out of scope for version 1

- Direct PLC, SCADA or OPC-UA integration. All readings are keyed in by the operator, exactly as today. Automatic tag reading is a phase 2 candidate and the schema is shaped to accept it.
- Other refinery forms beyond these two, and other plants beyond the deodorizer and refinery section. Adding them is configuration plus a form definition, not a rewrite.
- ERP, SAP or stock system posting.
- Certificate of analysis generation for customers.
- Native mobile apps. The web app is installable as a PWA on shop-floor tablets.

## 4. Roles and permissions

Six roles. Every user belongs to exactly one plant and one role; a person needing two roles gets two accounts, so the audit trail stays unambiguous.

| Capability                                           | Operator  | Supervisor           | QC analyst | QC manager           | Admin | Viewer |
|------------------------------------------------------|-----------|----------------------|------------|----------------------|-------|--------|
| Create and fill hourly entries                       | Yes       | Yes                  | —          | —                    | —     | —      |
| Edit own entry within 2 hours                        | Yes       | Yes                  | —          | —                    | —     | —      |
| Edit any entry, any age                              | —         | Yes, reason required | —          | —                    | —     | —      |
| Set sheet header (stripping steam %, tray steam bar) | —         | Yes                  | —          | —                    | Yes   | —      |
| Verify and lock a completed sheet                    | —         | Yes                  | —          | —                    | —     | —      |
| Raise a sample report                                | Yes       | Yes                  | Yes        | Yes                  | —     | —      |
| Enter analysis results                               | —         | —                    | Yes        | Yes                  | —     | —      |
| Accept or reject a product                           | —         | —                    | Yes        | Yes                  | —     | —      |
| Overturn a QC decision                               | —         | —                    | —          | Yes, reason required | —     | —      |
| Manage products, tanks, spec limits                  | —         | —                    | —          | Yes                  | Yes   | —      |
| Manage users and roles                               | —         | —                    | —          | —                    | Yes   | —      |
| View dashboards and history                          | Own shift | Yes                  | Yes        | Yes                  | Yes   | Yes    |
| Export PDF and Excel                                 | Own shift | Yes                  | Yes        | Yes                  | Yes   | Yes    |
| Delete anything                                      | —         | —                    | —          | —                    | —     | —      |

*Nothing is ever deleted. Records are voided with a reason and remain visible, greyed, in the history. Deletion breaks traceability and would fail an audit.*

## 5. The three workflows

### Operator: the hourly round

1.  **Open today's sheet** — The app lands on the current sheet for the operator's plant. If no sheet exists for the shift date, it offers to open one and carries yesterday's header values forward as defaults.
2.  **The current hour is highlighted** — The 24 time slots run down the screen as on the paper. The slot for the current hour is outlined and scrolled into view; past empty slots are flagged amber.
3.  **Key the readings** — Number keypad on tablet, tab order left to right matching the paper columns. Tray 1 to 7 temperatures sit in one group so seven values go in without leaving the keypad.
4.  **Warnings appear as you type** — A value outside the configured band turns amber with the expected range shown. A value outside the physically plausible range is blocked. Amber does not stop saving; it asks for a remark.
5.  **Save** — Saved with the operator's name and the server timestamp. If offline, it queues locally and syncs when the connection returns, with a visible pending badge.
6.  **Hand over** — At shift end the operator reviews their rows and confirms handover. Blank slots must be marked as a reason — plant down, no production — rather than left empty.

### QC: sample to decision

1.  **Sample raised** — Whoever draws the sample creates the report: date, time check, lot no., feed and discharge tank, crystallizer or batch no., sampling point, and who submitted it. They pick the product and tick which parameters are required for testing.
2.  **It appears in the lab queue** — QC sees a live list of samples awaiting results, oldest first, with the time elapsed since sampling.
3.  **Results entered** — Only the ticked parameters are shown as inputs. Each result is compared against the specification for that product and marked in or out of spec automatically.
4.  **Decision** — Accept, reject, or accept with concession. Rejection requires a reason code and a written detail. The decision is stamped with the QC user and time.
5.  **Everyone sees it** — The result pushes live to the supervisor dashboard and to the operator's screen. A rejection raises a notification to the shift supervisor immediately.

### Supervisor: monitor and close

1.  **Live board** — One screen shows the current hour's readings across the plant, which slots are missing, open deviations, and the QC queue.
2.  **Act on deviations** — Each flagged reading can be acknowledged with a corrective note, which stays attached to that entry.
3.  **Verify the sheet** — Once the 24 hours are complete, the supervisor reviews and verifies. Verification locks the sheet; further changes need a QC manager and leave an amendment record.

## 6. Process control log — RF-FR-004

The digital sheet reproduces the form field for field. Nothing is added to what the operator must fill, and nothing is dropped.

### Sheet header, set once per day

| Field                            | Type         | Rule                                                                              |
|----------------------------------|--------------|-----------------------------------------------------------------------------------|
| Plant                            | Fixed        | Nisshin Deodorizer Plant, from the user's plant assignment                        |
| Date                             | Date         | Shift date. The sheet runs 0700 today to 0600 tomorrow; the date is the start day |
| Stripping steam, % of oil        | Number, 1 dp | Required before the first entry can be saved                                      |
| Set steam supply, trays 1–7, Bar | Number, 2 dp | Required before the first entry can be saved                                      |
| Form reference                   | Fixed        | Printed on export as RF-FR-004, Rev. 02                                           |

### Hourly entry, 24 slots

| Group                | Field            | Unit  | Type           | Validation                                                                       |
|----------------------|------------------|-------|----------------|----------------------------------------------------------------------------------|
| —                    | Time             | —     | Fixed slot     | 0700 … 2400, 0100 … 0600. Not editable                                           |
| —                    | Type of oil      | —     | Product picker | Required. Carries forward from the previous hour as a default                    |
| Processing           | Oil feed rate    | Litre | Integer        | Soft band configurable per product                                               |
| Processing           | Deod time set    | Hr    | Number, 1 dp   | 0–24                                                                             |
| Processing           | Vacuum reach     | Torr  | Number, 1 dp   | Hard 0–760. Soft upper limit alerts on poor vacuum                               |
| Temperature recorder | Tray 1 temp      | °C    | Number, 1 dp   | Hard 0–350. Soft band per tray, per product. Deviation from band raises an alert |
| Temperature recorder | Tray 2 temp      | °C    | Number, 1 dp   | Hard 0–350. Soft band per tray, per product. Deviation from band raises an alert |
| Temperature recorder | Tray 3 temp      | °C    | Number, 1 dp   | Hard 0–350. Soft band per tray, per product. Deviation from band raises an alert |
| Temperature recorder | Tray 4 temp      | °C    | Number, 1 dp   | Hard 0–350. Soft band per tray, per product. Deviation from band raises an alert |
| Temperature recorder | Tray 5 temp      | °C    | Number, 1 dp   | Hard 0–350. Soft band per tray, per product. Deviation from band raises an alert |
| Temperature recorder | Tray 6 temp      | °C    | Number, 1 dp   | Hard 0–350. Soft band per tray, per product. Deviation from band raises an alert |
| Temperature recorder | Tray 7 temp      | °C    | Number, 1 dp   | Hard 0–350. Soft band per tray, per product. Deviation from band raises an alert |
| BC 101               | Water temp in    | °C    | Number, 1 dp   | Hard 0–150                                                                       |
| BC 101               | Water temp out   | °C    | Number, 1 dp   | Hard 0–150. Warns if out is lower than in                                        |
| Chilling             | Water temp in    | °C    | Number, 1 dp   | Hard 0–100                                                                       |
| Chilling             | Water temp out   | °C    | Number, 1 dp   | Hard 0–100                                                                       |
| Steam supply         | Booster pressure | Bar   | Number, 2 dp   | Hard 0–60                                                                        |
| Steam supply         | Ejector pressure | Bar   | Number, 2 dp   | Hard 0–60                                                                        |
| Stripping steam      | % of oil input   | %     | Number, 2 dp   | Hard 0–100. Warns on drift from the sheet header value                           |
| Stripping steam      | Flow rate        | kg/hr | Number, 1 dp   | Soft band configurable                                                           |
| Filtration           | FP 101A pressure | Bar   | Number, 2 dp   | Hard 0–20. Rising trend over 4 hours suggests filter change                      |
| Filtration           | FP 101B pressure | Bar   | Number, 2 dp   | Hard 0–20                                                                        |
| —                    | Remarks          | —     | Text           | Required when any reading is outside its soft band                               |

*Hard limits block the save. Soft bands warn and ask for a remark. Both are stored as configuration in `parameter_limits`, editable by a QC manager without a code change.*

### Entry rules

- **[Must]** An hourly slot can be filled from the start of that hour onward. Future hours are locked.
- **[Must]** A slot left blank when its hour has passed is flagged and appears in the supervisor's missing-entries list.
- **[Must]** The operator may correct their own entry for two hours after saving. Every correction writes a before-and-after record.
- **[Must]** After two hours, only a supervisor can amend, and only with a stated reason.
- **[Should]** A "copy previous hour" action pre-fills the row from the hour before, which the operator then corrects. This is the single biggest time saver over paper and is why sub-60-second entry is realistic.
- **[Should]** Each numeric field shows the previous hour's value in faint text, so a mis-keyed digit is obvious.

## 7. Sample analysis report — RF-FR-001

### Report header

| Field                        | Type                  | Rule                                                                                      |
|------------------------------|-----------------------|-------------------------------------------------------------------------------------------|
| Plant                        | Picker                | Required                                                                                  |
| Date                         | Date                  | Defaults to today, cannot be in the future                                                |
| Time check                   | Time                  | Required                                                                                  |
| Lot no.                      | Text                  | Required. Indexed for search                                                              |
| Feed tank                    | Tank picker           | From the tank master, filtered to feed tanks                                              |
| Discharge tank               | Tank picker           | From the tank master, filtered to discharge tanks                                         |
| Crystallizer no. / batch no. | Text                  | Optional, required for fractionation products                                             |
| Sampling point               | Picker plus free text | From a maintained list                                                                    |
| Sample submitted by          | User picker           | Defaults to the logged-in user, changeable                                                |
| Product                      | Single select         | Required. The 44 products of the printed list, searchable, plus an "Others" free-text box |

### Analysis parameters

Each parameter has a tick — required for testing — and a result. Only ticked parameters are shown as result inputs, matching how the paper is used.

| Parameter                 | Unit       | Input                                                    |
|---------------------------|------------|----------------------------------------------------------|
| FFA                       | %          | Number, 2 dp                                             |
| H₂O                       | %          | Number, 3 dp                                             |
| IV — iodine value         | g I₂/100 g | Number, 1 dp                                             |
| PV — peroxide value       | meq/kg     | Number, 2 dp                                             |
| Colour, 5¼″ Lovibond cell | R / Y      | Two numbers: red and yellow                              |
| Odour                     | —          | Select: bland, acceptable, off — plus a note             |
| BPP                       | °C         | Number, 1 dp                                             |
| Slip melting point        | °C         | Number, 1 dp                                             |
| Cloud point               | °C         | Number, 1 dp                                             |
| Soap content              | ppm        | Number, 1 dp                                             |
| FAC-C12                   | %          | Number, 2 dp                                             |
| SFC — solid fat content   | %          | Nine numbers at 10, 15, 20, 25, 30, 35, 40, 45 and 50 °C |

Ticking SFC opens all nine temperature rows at once. Individual temperatures may be left blank if not run — the paper allows this and so does the app.

### Remarks

The printed remarks line offers flushing, cooling and push over. These become three independent checkboxes — a sample can be more than one — followed by a free-text note.

### Specification checking

- **[Must]** Each product holds a specification per parameter: minimum, maximum, target. Entered results are compared and marked in spec or out of spec as they are typed.
- **[Must]** Out-of-spec results are highlighted but never blocked. The lab records what it measured; the decision is a separate, deliberate step.
- **[Should]** Where no specification exists for a product and parameter, the field is accepted without judgement and the report notes that no spec was on file.
- **[Should]** Attachments: photos of the sample or an instrument printout, up to 10 MB per report, stored in Supabase Storage.

## 8. QC decision — accept or reject

This is the part of the process the paper handles worst, so it gets the most structure.

| Field             | Rule                                                                                                                       |
|-------------------|----------------------------------------------------------------------------------------------------------------------------|
| Decision          | Accept · Accept with concession · Reject. Required to close a report                                                       |
| Reason code       | Required for reject and for concession. Chosen from a maintained list, so rejections can be counted and Pareto-charted     |
| Reason detail     | Free text, required, minimum 10 characters. The narrative an auditor will read                                             |
| Failed parameters | Pre-filled from the out-of-spec results, editable — a product can be rejected on odour alone even when every number passes |
| Disposition       | Rework · Reprocess · Downgrade · Hold · Scrap. Required on reject                                                          |
| Decided by / at   | Stamped automatically, not editable                                                                                        |
| Overturn          | A QC manager can reverse a decision. The original stays visible with the reversal reason beneath it                        |

#### Starting list of rejection reason codes

These are a proposal drawn from the parameters on the form. Confirm and extend them before build; they are master data, so the list is editable afterwards.

- FFA above specification · Moisture above specification · Peroxide value above specification
- Colour out of specification · Off odour · Slip melting point out of range · Cloud point out of range
- SFC profile out of range · Soap content above limit · IV out of range
- Cross-contamination suspected · Wrong product in tank · Sampling error, resample required

> A rejection notifies the shift supervisor and the plant manager within seconds, by in-app notification and email. The lot number, product and reason travel in the notification so the plant can act without opening the app.

## 9. Supervisor monitoring

### Live board

- **[Must]** Current hour at a glance: every field from the latest entry, with out-of-band values coloured, and the time since the last save.
- **[Must]** Missing entries list, ordered by how overdue each slot is.
- **[Must]** Open deviations with acknowledge-and-note, and the QC queue with sample age.
- **[Must]** Updates push live over Supabase Realtime. No manual refresh on a wall-mounted screen.

### Trends

- **[Must]** Any numeric field plotted over a chosen date range, with the soft band drawn as a shaded region. Tray temperatures overlay on one chart.
- **[Should]** Filter by product, so vacuum performance on RBD palm olein can be compared across weeks.
- **[Should]** Rejection Pareto by reason code and by product, monthly and quarterly.
- **[Later]** Correlate process conditions against lab results — for example deodorizer tray temperature against resulting colour — once enough history exists.

### Alerts

| Trigger                              | Goes to                                 | Channel                          |
|--------------------------------------|-----------------------------------------|----------------------------------|
| Reading outside its soft band        | Shift supervisor                        | In-app, live                     |
| Hourly slot 30 minutes overdue       | Operator, then supervisor at 60 minutes | In-app                           |
| QC rejection recorded                | Shift supervisor, plant manager         | In-app and email                 |
| Sample awaiting results over 4 hours | QC manager                              | In-app                           |
| Daily summary at 0700                | Supervisors, QC manager                 | Email, sent by a Vercel cron job |

## 10. Reports and export

- **[Must]** PDF of any process control sheet, laid out as RF-FR-004 with the same column grouping and the form and revision number in the corner, plus a footer naming who entered and who verified it.
- **[Must]** PDF of any sample analysis report, laid out as RF-FR-001 with the selected product marked and the QC decision block appended.
- **[Must]** Excel export of any date range of process entries or sample results, one row per entry, for engineering analysis.
- **[Should]** Search across sample reports by lot number, product, tank, date range, and decision.
- **[Should]** Batch traceability view: given a lot number, show its sample reports, its decisions, and the process sheet hours that produced it.

## 11. Audit trail and record integrity

The refinery record is a quality record. It has to stand up to a customer audit, so the system treats integrity as a feature rather than a side effect.

- **[Must]** Every insert, update and void writes to an append-only audit table: who, when, which record, the value before and the value after.
- **[Must]** The audit table is writable only by database triggers. No application role can update or delete a row in it.
- **[Must]** Verifying a sheet or making a QC decision requires the user to re-enter their password. That is the electronic signature.
- **[Must]** All timestamps are server-side and stored in UTC, displayed in Asia/Kuala_Lumpur.
- **[Must]** Amendment history is visible in the interface, not just in the database — a supervisor can see what a value used to be and why it changed.
- **[Should]** Daily automated backup retained 35 days, with a restore rehearsed before go-live.

## 12. Data model

Postgres on Supabase. Readings are stored as typed columns rather than a generic key-value table — the columns are fixed by the form, queries stay simple, and the trend charts stay fast. Lab results, where the parameter set varies by product, use a row-per-result shape instead.

```sql
-- ---------- reference ----------
create type user_role as enum ('operator','supervisor','qc_analyst','qc_manager','admin','viewer');
create type sheet_status as enum ('open','submitted','verified','amended');
create type report_status as enum ('draft','awaiting_results','results_entered','decided','voided');
create type qc_decision as enum ('accept','accept_concession','reject');
create type disposition as enum ('rework','reprocess','downgrade','hold','scrap');

create table plants (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 'NISSHIN_DEOD'
  name text not null,
  timezone text not null default 'Asia/Kuala_Lumpur',
  active boolean not null default true
);

create table profiles (
  id uuid primary key references auth.users on delete restrict,
  employee_no text unique not null,
  full_name text not null,
  role user_role not null default 'operator',
  plant_id uuid references plants,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 'PL65_MATSUYAMA'
  name text not null,                     -- 'PL65 Matsuyama'
  category text,                          -- olein / stearin / kernel / blend / by-product
  sort_order int not null default 0,
  active boolean not null default true
);

create table tanks (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants,
  code text not null,
  kind text not null check (kind in ('feed','discharge','both')),
  active boolean not null default true,
  unique (plant_id, code)
);

create table sampling_points (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants,
  name text not null,
  active boolean not null default true
);

create table parameters (
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

create table product_specs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products,
  parameter_id uuid not null references parameters,
  series_key numeric,                     -- the SFC temperature, null otherwise
  min_value numeric, max_value numeric, target_value numeric,
  effective_from date not null default current_date,
  unique (product_id, parameter_id, series_key, effective_from)
);

-- soft/hard bands for process control fields
create table parameter_limits (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants,
  field_key text not null,                -- 'tray_3_temp_c','vacuum_torr', ...
  product_id uuid references products,    -- null = applies to all products
  hard_min numeric, hard_max numeric,
  soft_min numeric, soft_max numeric,
  unique (plant_id, field_key, product_id)
);

-- ---------- RF-FR-004 : process control ----------
create table process_sheets (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants,
  shift_date date not null,               -- sheet runs 07:00 D to 06:00 D+1
  stripping_steam_pct numeric(5,2) not null,
  set_steam_supply_bar numeric(6,2) not null,
  status sheet_status not null default 'open',
  opened_by uuid not null references profiles,
  opened_at timestamptz not null default now(),
  verified_by uuid references profiles,
  verified_at timestamptz,
  unique (plant_id, shift_date)
);

create table process_entries (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references process_sheets on delete restrict,
  slot_index smallint not null check (slot_index between 0 and 23),  -- 0 = 0700
  slot_label text generated always as (
    lpad((((slot_index + 7) % 24) * 100)::text, 4, '0')) stored,
  slot_start timestamptz not null,
  product_id uuid references products,             -- "Type of Oil"

  oil_feed_rate_litre    numeric(10,1),
  deod_time_set_hr       numeric(4,1),
  vacuum_torr            numeric(6,1),

  tray_1_temp_c numeric(5,1), tray_2_temp_c numeric(5,1),
  tray_3_temp_c numeric(5,1), tray_4_temp_c numeric(5,1),
  tray_5_temp_c numeric(5,1), tray_6_temp_c numeric(5,1),
  tray_7_temp_c numeric(5,1),

  bc101_water_in_c  numeric(5,1), bc101_water_out_c  numeric(5,1),
  chill_water_in_c  numeric(5,1), chill_water_out_c  numeric(5,1),

  booster_press_bar numeric(6,2), ejector_press_bar  numeric(6,2),

  strip_steam_pct_of_oil numeric(5,2),
  strip_steam_flow_kghr  numeric(8,1),

  fp101a_press_bar numeric(6,2), fp101b_press_bar numeric(6,2),

  remarks text,
  no_production_reason text,              -- set when the hour is intentionally blank
  has_deviation boolean not null default false,
  recorded_by uuid not null references profiles,
  recorded_at timestamptz not null default now(),
  amended_by uuid references profiles,
  amended_at timestamptz,
  amend_reason text,
  client_uuid uuid unique,                -- offline idempotency key
  unique (sheet_id, slot_index)
);

create table deviations (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references process_entries on delete restrict,
  field_key text not null,
  observed numeric not null,
  soft_min numeric, soft_max numeric,
  acknowledged_by uuid references profiles,
  acknowledged_at timestamptz,
  action_taken text,
  created_at timestamptz not null default now()
);

-- ---------- RF-FR-001 : sample analysis ----------
create table sample_reports (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants,
  report_no text unique not null,         -- SAR-2026-000481, generated
  sample_date date not null,
  time_check time not null,
  lot_no text not null,
  product_id uuid references products,
  product_other text,                     -- used when "Others" is chosen
  feed_tank_id uuid references tanks,
  discharge_tank_id uuid references tanks,
  crystallizer_no text,
  batch_no text,
  sampling_point_id uuid references sampling_points,
  submitted_by uuid references profiles,
  submitted_by_name text,
  remark_flushing boolean not null default false,
  remark_cooling  boolean not null default false,
  remark_pushover boolean not null default false,
  remarks text,
  status report_status not null default 'draft',
  created_by uuid not null references profiles,
  created_at timestamptz not null default now(),
  check (product_id is not null or product_other is not null)
);

create table sample_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references sample_reports on delete restrict,
  parameter_id uuid not null references parameters,
  series_key numeric,                     -- SFC temperature, null otherwise
  requested boolean not null default true,-- the tick on the paper form
  value_numeric numeric,
  value_text text,                        -- odour, and colour is stored as two rows
  in_spec boolean,                        -- computed on write against product_specs
  entered_by uuid references profiles,
  entered_at timestamptz,
  unique (report_id, parameter_id, series_key)
);

create table rejection_reasons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text not null,
  active boolean not null default true
);

create table qc_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references sample_reports on delete restrict,
  decision qc_decision not null,
  reason_id uuid references rejection_reasons,
  reason_detail text,
  failed_parameters text[],
  disposition disposition,
  decided_by uuid not null references profiles,
  decided_at timestamptz not null default now(),
  supersedes_id uuid references qc_decisions,   -- an overturn points at the old one
  overturn_reason text,
  check (decision = 'accept' or reason_id is not null),
  check (decision = 'accept' or length(coalesce(reason_detail,'')) >= 10)
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references sample_reports,
  entry_id uuid references process_entries,
  storage_path text not null,
  file_name text not null, byte_size int not null,
  uploaded_by uuid not null references profiles,
  uploaded_at timestamptz not null default now()
);

-- ---------- audit ----------
create table audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,                   -- insert | update | void
  actor uuid,
  old_row jsonb, new_row jsonb,
  occurred_at timestamptz not null default now()
);

create index on process_entries (sheet_id, slot_index);
create index on process_entries (slot_start desc);
create index on sample_reports (lot_no);
create index on sample_reports (sample_date desc, plant_id);
create index on audit_log (table_name, record_id);
```

### Row level security

RLS is on for every table. Policies read the caller's role and plant from their profile, so authorisation lives in the database and cannot be bypassed by a mistake in the application layer.

```sql
create or replace function auth_role() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_plant() returns uuid
language sql stable security definer as $$
  select plant_id from profiles where id = auth.uid()
$$;

alter table process_entries enable row level security;

create policy read_own_plant on process_entries for select
  using (exists (select 1 from process_sheets s
                 where s.id = sheet_id
                   and (s.plant_id = auth_plant() or auth_role() in ('admin','qc_manager','viewer'))));

create policy operator_insert on process_entries for insert
  with check (auth_role() in ('operator','supervisor')
              and exists (select 1 from process_sheets s
                          where s.id = sheet_id and s.plant_id = auth_plant()
                            and s.status = 'open'));

create policy operator_edit_window on process_entries for update
  using ((auth_role() = 'operator'
          and recorded_by = auth.uid()
          and recorded_at > now() - interval '2 hours')
         or auth_role() = 'supervisor');

-- no delete policy anywhere; deletion is impossible by design
```

## 13. Architecture

| Layer                | Choice                                                                                                                   | Why                                                                                               |
|----------------------|--------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| Framework            | Next.js 15, App Router, TypeScript strict                                                                                | Server components for the read-heavy dashboards, server actions for writes, one deployable unit   |
| Hosting              | Vercel, Singapore region (sin1)                                                                                          | Closest edge to Kuala Lumpur. Preview deployment per pull request for QC to review before release |
| Database and auth    | Supabase Postgres, Southeast Asia region                                                                                 | RLS enforces the role matrix at the data layer; Realtime drives the live board                    |
| Auth model           | Email and password, Supabase Auth, session in httpOnly cookies via `@supabase/ssr`                                       | Shop floor has no corporate SSO today. Accounts are created by an admin, not self-service         |
| Forms and validation | react-hook-form with Zod schemas shared by client and server                                                             | One definition of a valid reading, enforced on both sides                                         |
| UI                   | Tailwind CSS with shadcn/ui, large touch targets, high contrast                                                          | Tablets in a hot, bright plant, often operated with gloves                                        |
| Offline              | PWA with a service worker; pending writes queued in IndexedDB via Dexie, replayed with the `client_uuid` idempotency key | Plant Wi-Fi drops. An operator must never lose a reading                                          |
| Charts               | Recharts                                                                                                                 | Enough for banded time series and Pareto bars without a heavy dependency                          |
| PDF                  | @react-pdf/renderer inside a route handler                                                                               | Runs in the Vercel Node runtime, no headless browser to maintain                                  |
| Excel                | SheetJS                                                                                                                  | Familiar output for the engineering team's existing analysis                                      |
| Email                | Resend, triggered from server actions and a Vercel cron job                                                              | Simple, and the daily digest needs a scheduler anyway                                             |
| Quality gates        | Vitest for units, Playwright for the three workflows, GitHub Actions on every pull request                               | A form this dense needs regression cover on the entry screen                                      |

### Route map

```
/login
/                         redirect by role
/process/[plant]          today's sheet, hourly entry grid      operator, supervisor
/process/[plant]/[date]   a specific sheet, read or amend
/process/[plant]/trends   banded time series
/samples                  sample list, filter and search
/samples/new              raise a sample report
/samples/[id]             header, results entry, QC decision
/qc/queue                 samples awaiting results               qc
/qc/decisions             decision history and Pareto            qc, supervisor
/dashboard                live board                             supervisor
/admin/products  /admin/tanks  /admin/specs
/admin/limits    /admin/users  /admin/reasons                    admin, qc manager
/api/export/process-sheet/[id]   PDF
/api/export/sample-report/[id]   PDF
/api/export/xlsx                 Excel, date range
/api/cron/daily-digest           Vercel cron, 07:00 MYT
```

### Environments

- Three Supabase projects — development, staging, production — with migrations under version control in `supabase/migrations` and applied by CI, never by hand.
- Vercel preview deployments point at staging. Production deploys only from `main`, after QC signs off on the preview.
- Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, never in a client bundle), `RESEND_API_KEY`, `CRON_SECRET`.

## 14. Non-functional requirements

| Area          | Requirement                                                                                                                                                             |
|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Performance   | Entry screen interactive within 2 seconds on a mid-range tablet over plant Wi-Fi. A save acknowledges in under 500 ms at the 95th percentile                            |
| Availability  | 99.5% monthly. Offline queueing means a platform outage delays sync rather than stopping production logging                                                             |
| Concurrency   | 30 simultaneous users at launch, headroom to 200 without re-architecture                                                                                                |
| Retention     | Seven years of records online and queryable, matching the quality record retention period                                                                               |
| Security      | TLS everywhere; RLS on every table; service role key server-side only; passwords at least 10 characters; session expiry 12 hours; failed-login lockout after 5 attempts |
| Accessibility | WCAG 2.1 AA: keyboard operable, 4.5:1 contrast minimum, no colour-only status — deviations carry an icon and a label as well as a colour                                |
| Localisation  | English interface at launch, with strings externalised so Bahasa Malaysia can follow without code changes. All dates displayed as DD/MM/YYYY, times as 24-hour          |
| Browsers      | Current Chrome, Edge and Safari; Android 10 and iPadOS 15 upward                                                                                                        |

## 15. Delivery plan

| Phase                 | Weeks | Delivered                                                                                                                                                  |
|-----------------------|-------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Foundation            | 1–2   | Repository, Supabase projects, schema and RLS, auth, role routing, admin screens for users, products and tanks. Product list seeded from RF-FR-001         |
| Process control       | 3–5   | Sheet open and header, the 24-slot entry grid, validation bands, copy-previous-hour, amendment rules, PDF export in the RF-FR-004 layout                   |
| Sample and QC         | 6–8   | Sample report with product picker and parameter ticks, SFC series, spec comparison, lab queue, accept and reject with reasons, PDF in the RF-FR-001 layout |
| Monitoring            | 9–10  | Live board over Realtime, alerts, trends with bands, Pareto, Excel export, daily digest                                                                    |
| Offline and hardening | 11    | PWA and the offline queue, audit trail review, load test, penetration review, backup restore rehearsal                                                     |
| Pilot and go-live     | 12    | Two weeks of parallel running against paper on one shift, operator training, then cut over                                                                 |

> Parallel running is not padding. Running the app alongside the paper for two weeks is what proves the digital sheet captures everything the auditor expects, while the paper is still there as a fallback.

## 16. Risks

| Risk                                                                  | Response                                                                                                                                                            |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Operators find keying slower than writing and quietly revert to paper | Copy-previous-hour, big keypad targets, previous value shown for reference. Measure entry time during the pilot and fix what is slow before cutover                 |
| Plant Wi-Fi does not reach the deodorizer floor                       | Survey coverage in week 1. Offline queueing covers gaps; if coverage is absent entirely, an access point is a prerequisite, not a nice-to-have                      |
| Specification limits per product are not documented anywhere central  | Products can go live without specs — results are recorded and simply not judged. Specs are loaded progressively as QC confirms them                                 |
| Tablets are damaged in a hot, oily environment                        | Rugged cases and a wall-mounted unit at the panel. The app works on any browser, so a spare device is a login away                                                  |
| Auditor rejects a digital record                                      | Audit trail, electronic signature on verification and QC decision, and a PDF that reproduces the controlled form. Review the approach with the QA manager in week 1 |
| Scope creep to other forms mid-build                                  | Version 1 is these two forms. The form and parameter tables make the third form a configuration exercise after go-live                                              |

## 17. Open questions

None of these block the start of the foundation phase, but each one needs an answer before the phase that depends on it.

1.  **Shift pattern.** The sheet runs 0700 to 0600. Is that one 24-hour sheet across two or three shifts, and where exactly do the shift boundaries fall? This determines who is prompted at handover.
2.  **Hard and soft limits.** The ranges in section 6 are engineering placeholders. Who supplies the real bands per tray and per product?
3.  **Specification source.** Is there an existing master of product specifications to import, or does QC key them in?
4.  **Product list.** Are all 44 printed products still current, and should any be retired at launch?
5.  **Sampling points.** The paper leaves this free-text. Can we agree a fixed list, which makes traceability searchable?
6.  **Lot numbering.** Does a lot number format already exist that the app should validate against?
7.  **Colour reporting.** Lovibond is recorded here as red and yellow. Confirm whether yellow is always fixed at a standard value.
8.  **Accounts.** Roughly how many operators, supervisors and QC staff, and do they share a plant tablet or log in individually? Individual logins are strongly preferred for traceability.
9.  **Approvals.** Does a rejection need a second signature above QC manager?
10. **Historical data.** Should past paper sheets be keyed in, or does the system start clean at go-live?

## 18. Appendix — product list for seeding

Transcribed from the RF-FR-001 selection list, in printed order. Confirm spelling and currency before seeding.

| Left column            | Right column       |
|------------------------|--------------------|
| Chocohi 357A NPHO      | PL 56              |
| Chocohi 369A           | PL 60              |
| Daisy Soft PM180602 I2 | PL 65 Matsuyama    |
| DF 20                  | PL 65 Wayideal     |
| Farm Cow R2            | PR PL65            |
| G9                     | NBD PL65           |
| HPO 58                 | Palm Fat Blend     |
| HPKO                   | RPMO               |
| HPS 52                 | PR PMO             |
| HPS 58                 | RSTN               |
| Hyfat L1               | RSTN (S)           |
| Hyfat K1 (P)           | RSTN (H)           |
| Hyfat K1 (B)           | PR STN             |
| PMF                    | PR STN (S)         |
| PR PMF                 | PR STN (H)         |
| IEPMF                  | RPKO               |
| R. IEPMF               | RPKL               |
| PR IEPMF               | Shortening         |
| Krimwell IER           | SRIV60 (FMF Snax)  |
| Naturel WOS            | Splash Oil         |
| Naturel Lite           | Flush Oil          |
| Naturel Olive          | PFAD               |
| Pastrifet SK           | Others — free text |

## 19. Approval

Approving this document authorises the foundation phase to begin and fixes the version 1 scope in section 3. Changes after approval go through a revision of this document.

| Role        | Who                             | Name | Signature | Date |
|-------------|---------------------------------|------|-----------|------|
| Prepared by | Development lead                |      |           |      |
| Reviewed by | Refinery manager and QC manager |      |           |      |
| Approved by | Plant management                |      |           |      |

PRD-REF-001 · Revision 00 · Lam Soon Edible Oils Sdn. Bhd., Refinery · Supersedes nothing; the paper forms RF-FR-004 Rev. 02 and RF-FR-001 Rev. 02 remain in force until go-live.