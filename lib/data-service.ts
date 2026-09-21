// ==============================================================================
// REFINERY PROCESS MANAGEMENT SYSTEM (PRD-REF-001)
// Unified Data Service Engine (Dual-Mode: Local Industrial State + Supabase Sync)
// ==============================================================================

import { 
  UserRole, 
  ProcessSheet, 
  ProcessEntry, 
  SampleReport, 
  SampleResult,
  QCDecision, 
  Deviation, 
  AuditLogEntry, 
  Product, 
  Tank, 
  SamplingPoint, 
  Parameter, 
  ProductSpec,
  ParameterLimit,
  RejectionReason,
  Profile
} from '@/types/refinery';

import { 
  INITIAL_PLANT, 
  INITIAL_PROFILES, 
  INITIAL_PRODUCTS, 
  INITIAL_TANKS, 
  INITIAL_SAMPLING_POINTS, 
  INITIAL_PARAMETERS, 
  INITIAL_LIMITS, 
  INITIAL_SPECS, 
  INITIAL_REJECTION_REASONS, 
  INITIAL_SHEET, 
  INITIAL_DEVIATIONS, 
  INITIAL_REPORTS, 
  INITIAL_AUDIT_LOGS 
} from './mock-data';

import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  AUTH_USER: 'refinery_auth_user',
  CURRENT_ROLE: 'refinery_current_role',
  PROFILES: 'refinery_staff_profiles',
  SHEET: 'refinery_active_sheet',
  REPORTS: 'refinery_sample_reports',
  DEVIATIONS: 'refinery_deviations',
  AUDIT_LOGS: 'refinery_audit_logs',
};

// In-Memory fallback store
let memoryAuthUser: Profile | null = null;
let memoryRole: UserRole = 'operator';
let memoryProfiles: Profile[] = JSON.parse(JSON.stringify(INITIAL_PROFILES));
let memorySheet: ProcessSheet = JSON.parse(JSON.stringify(INITIAL_SHEET));
let memoryReports: SampleReport[] = JSON.parse(JSON.stringify(INITIAL_REPORTS));
let memoryDeviations: Deviation[] = JSON.parse(JSON.stringify(INITIAL_DEVIATIONS));
let memoryAuditLogs: AuditLogEntry[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));

// Helpers to sync with browser storage if available
function getStored<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

// Consistent Industrial Employee ID Configuration
// Format: 2-Letter Department Code + 4-Digit Number
export const ROLE_ID_SERIES: Record<UserRole, { prefix: string; label: string; start: number; example: string }> = {
  operator:   { prefix: 'OP', label: 'Plant Operator (0700-0600)', start: 1042, example: 'OP-1043' },
  supervisor: { prefix: 'SV', label: 'Shift Supervisor', start: 2014, example: 'SV-2015' },
  qc_analyst: { prefix: 'QC', label: 'QC Lab Analyst', start: 3201, example: 'QC-3202' },
  qc_manager: { prefix: 'QM', label: 'Quality Control Manager', start: 4502, example: 'QM-4503' },
  admin:      { prefix: 'AD', label: 'Plant Administrator / Engineering', start: 5010, example: 'AD-5011' },
  viewer:     { prefix: 'AU', label: 'Quality Auditor (ISO/HACCP)', start: 9901, example: 'AU-9902' },
};

// Role-Based Views & Navigation Rules (RBAC)
export const ROLE_ALLOWED_TABS: Record<UserRole, string[]> = {
  operator: ['process', 'supervisor'],
  supervisor: ['supervisor', 'process', 'report', 'analytics', 'export'],
  qc_analyst: ['qc', 'report'],
  qc_manager: ['qc', 'report', 'analytics'],
  admin: ['admin', 'supervisor', 'process', 'report', 'qc', 'analytics', 'export'],
  viewer: ['export', 'report'],
};

export const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  operator: 'process',
  supervisor: 'supervisor',
  qc_analyst: 'qc',
  qc_manager: 'qc',
  admin: 'admin',
  viewer: 'export',
};

export function generateNextEmployeeId(role: UserRole): string {
  const meta = ROLE_ID_SERIES[role] || { prefix: 'ST', start: 1000 };
  const all = getProfiles();
  const existingNums = all
    .filter(p => p.employee_no.toUpperCase().startsWith(`${meta.prefix}-`))
    .map(p => {
      const parts = p.employee_no.split('-');
      return parseInt(parts[1], 10);
    })
    .filter(n => !isNaN(n));

  if (existingNums.length === 0) {
    return `${meta.prefix}-${meta.start}`;
  }

  const maxNum = Math.max(...existingNums, meta.start);
  return `${meta.prefix}-${maxNum + 1}`;
}

// 1. Authentication & Session Management
export function getAuthUser(): Profile | null {
  return getStored<Profile | null>(STORAGE_KEYS.AUTH_USER, memoryAuthUser);
}

export function setAuthUser(profile: Profile | null): void {
  memoryAuthUser = profile;
  setStored(STORAGE_KEYS.AUTH_USER, profile);
  if (profile) {
    setCurrentRole(profile.role);
  }
}

export function loginUser(identifier: string, password?: string): { success: boolean; profile?: Profile; error?: string } {
  const cleanId = identifier.trim().toLowerCase();
  const allProfiles = getProfiles();

  // Match by employee_no (exact or lowercase), full_name, or role
  const found = allProfiles.find(p => 
    p.employee_no.toLowerCase() === cleanId ||
    p.full_name.toLowerCase() === cleanId ||
    p.full_name.toLowerCase().includes(cleanId) ||
    p.role.toLowerCase() === cleanId
  );

  if (!found) {
    return { 
      success: false, 
      error: `Employee ID "${identifier}" was not found in the plant directory. Please verify your ID (e.g., OP-1042, SV-2014, QC-3201).` 
    };
  }

  if (found.status === 'unactive' || found.active === false) {
    return {
      success: false,
      error: `Account (${found.employee_no} - ${found.full_name}) has been deactivated by the Plant Administrator. Please contact plant administration.`
    };
  }

  // Strict Password Verification
  const expectedPassword = found.password || 'password123';
  if (!password || password.trim() !== expectedPassword) {
    return {
      success: false,
      error: 'The password entered is incorrect. Please ensure you enter the accurate password for this ID.'
    };
  }

  setAuthUser(found);
  return { success: true, profile: found };
}

export function logoutUser(): void {
  setAuthUser(null);
}

// 2. Role & Profile Management
export function getCurrentRole(): UserRole {
  return getStored(STORAGE_KEYS.CURRENT_ROLE, memoryRole);
}

export function setCurrentRole(role: UserRole): void {
  memoryRole = role;
  setStored(STORAGE_KEYS.CURRENT_ROLE, role);
}

export function getCurrentProfile(): Profile {
  const user = getAuthUser();
  if (user) return user;
  const role = getCurrentRole();
  const all = getProfiles();
  return all.find(p => p.role === role) || all[0];
}

export function getProfiles(): Profile[] {
  return getStored<Profile[]>(STORAGE_KEYS.PROFILES, memoryProfiles);
}

// Fetch live profiles from Supabase and synchronize local state
export async function syncProfilesFromSupabase(): Promise<{ success: boolean; count: number; profiles: Profile[]; error?: string }> {
  try {
    const res = await fetch('/api/profiles', { cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && Array.isArray(json.profiles) && json.profiles.length > 0) {
        const liveProfiles: Profile[] = json.profiles.map((p: any) => ({
          id: p.employee_no,
          employee_no: p.employee_no,
          full_name: p.full_name,
          role: p.role,
          status: p.status || (p.active === false ? 'unactive' : 'active'),
          active: p.status === 'active' || p.active === true,
          password: p.password || 'password123',
          created_at: p.created_at || new Date().toISOString(),
        }));

        memoryProfiles = liveProfiles;
        setStored(STORAGE_KEYS.PROFILES, liveProfiles);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refinery_profiles_synced', { detail: liveProfiles }));
        }
        return { success: true, count: liveProfiles.length, profiles: liveProfiles };
      }
    }
  } catch (apiErr) {
    console.warn('[Sync] /api/profiles fetch encountered error, attempting direct client fallback:', apiErr);
  }

  // Resilient fallback: Direct Supabase Client Query
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const liveProfiles: Profile[] = data.map((p: any) => ({
          id: p.employee_no,
          employee_no: p.employee_no,
          full_name: p.full_name,
          role: p.role,
          status: p.status || (p.active === false ? 'unactive' : 'active'),
          active: p.status === 'active' || p.active === true,
          password: p.password || 'password123',
          created_at: p.created_at || new Date().toISOString(),
        }));

        memoryProfiles = liveProfiles;
        setStored(STORAGE_KEYS.PROFILES, liveProfiles);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refinery_profiles_synced', { detail: liveProfiles }));
        }
        return { success: true, count: liveProfiles.length, profiles: liveProfiles };
      }
    } catch (directErr) {
      console.warn('[Sync] Direct Supabase query fallback failed:', directErr);
    }
  }

  const cached = getProfiles();
  return { success: true, count: cached.length, profiles: cached };
}

// Auto-sync on client load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncProfilesFromSupabase().catch(() => {});
  }, 300);
}

export async function addProfile(data: { full_name: string; role: UserRole; employee_no?: string; password?: string }): Promise<Profile> {
  const employee_no = (data.employee_no?.trim() || generateNextEmployeeId(data.role)).toUpperCase();
  const current = getProfiles();

  const newProfile: Profile = {
    id: employee_no,
    employee_no: employee_no,
    full_name: data.full_name.trim(),
    role: data.role,
    status: 'active',
    active: true,
    password: data.password?.trim() || 'password123',
    created_at: new Date().toISOString()
  };

  // Immediate optimistic update in local state
  const updated = [...current.filter(p => p.employee_no !== employee_no), newProfile];
  memoryProfiles = updated;
  setStored(STORAGE_KEYS.PROFILES, updated);

  // Sync to Supabase via server API (uses service role key to bypass RLS)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_no: newProfile.employee_no,
          full_name: newProfile.full_name,
          role: newProfile.role,
          status: newProfile.status,
          password: newProfile.password,
          created_at: newProfile.created_at
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error('[Supabase Sync Error]', errJson);
        throw new Error(errJson.error || 'Failed to sync user with Supabase database.');
      } else {
        console.info('[Supabase Sync Success] Profile recorded into Supabase:', employee_no);
      }
    } catch (err) {
      console.error('[Supabase Network Error]', err);
      // Still preserved in memory & local storage
    }
  }

  return newProfile;
}

export async function toggleProfileActive(identifier: string): Promise<boolean> {
  const current = getProfiles();
  const idx = current.findIndex(p => p.employee_no === identifier || p.id === identifier);
  if (idx === -1) return false;

  const target = current[idx];
  const newStatus = (target.status === 'unactive' || target.active === false) ? 'active' : 'unactive';
  target.status = newStatus;
  target.active = newStatus === 'active';
  memoryProfiles = [...current];
  setStored(STORAGE_KEYS.PROFILES, memoryProfiles);

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_no: target.employee_no,
          status: newStatus
        })
      });

      if (!res.ok) {
        console.error('[Supabase Sync Error] Failed to update status in Supabase');
      } else {
        console.info('[Supabase Sync Success] Status updated in Supabase:', target.employee_no, newStatus);
      }
    } catch (err) {
      console.error('[Supabase Network Error]', err);
    }
  }

  addAuditLog('profiles', target.employee_no, 'update', { status: newStatus === 'active' ? 'unactive' : 'active' }, { status: newStatus });
  return true;
}

export async function deleteProfile(identifier: string): Promise<boolean> {
  const current = getProfiles();
  const target = current.find(p => p.employee_no === identifier || p.id === identifier);
  if (!target) return false;

  const updated = current.filter(p => p.employee_no !== identifier && p.id !== identifier);
  memoryProfiles = updated;
  setStored(STORAGE_KEYS.PROFILES, updated);

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/profiles?employee_no=${encodeURIComponent(target.employee_no)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error('[Supabase Sync Error] Failed to delete profile in Supabase:', errJson);
      } else {
        console.info('[Supabase Sync Success] Profile deleted from Supabase:', target.employee_no);
      }
    } catch (err) {
      console.error('[Supabase Network Error]', err);
    }
  }

  addAuditLog('profiles', target.employee_no, 'void', { profile: target }, null);
  return true;
}

export function getProducts(): Product[] {
  return INITIAL_PRODUCTS;
}

export function getTanks(): Tank[] {
  return INITIAL_TANKS;
}

export function getSamplingPoints(): SamplingPoint[] {
  return INITIAL_SAMPLING_POINTS;
}

export function getParameters(): Parameter[] {
  return INITIAL_PARAMETERS;
}

export function getParameterLimits(): ParameterLimit[] {
  return INITIAL_LIMITS;
}

export function getProductSpecs(productId?: string): ProductSpec[] {
  if (!productId) return INITIAL_SPECS;
  return INITIAL_SPECS.filter(s => s.product_id === productId);
}

export function getRejectionReasons(): RejectionReason[] {
  return INITIAL_REJECTION_REASONS;
}

// Calculate real-time shift slot index (0 = 0700, 1 = 0800, ..., 23 = 0600)
export function getRealtimeSlotIndex(): number {
  const now = new Date();
  const mytHourStr = now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour12: false,
    hour: '2-digit',
  });
  const mytHour = parseInt(mytHourStr, 10);
  if (mytHour >= 7) {
    return mytHour - 7;
  } else {
    return mytHour + 17;
  }
}

// 2. Process Sheet (RF-FR-004)
export function getActiveProcessSheet(): ProcessSheet {
  return getStored<ProcessSheet>(STORAGE_KEYS.SHEET, memorySheet);
}

export function saveProcessEntry(updatedEntry: Partial<ProcessEntry> & { slot_index: number }): { success: boolean; entry: ProcessEntry; error?: string } {
  const currentSheet = getActiveProcessSheet();
  if (currentSheet.status === 'verified') {
    return {
      success: false,
      entry: {} as ProcessEntry,
      error: 'This sheet has been verified and locked. Only an Administrator can unlock the sheet for editing.'
    };
  }

  const profile = getCurrentProfile();
  const role = getCurrentRole();

  // Real-time window enforcement: Readings can only be recorded during the active live window slot
  const currentSlot = getRealtimeSlotIndex();
  if (updatedEntry.slot_index !== currentSlot) {
    const slotLabel = String(((updatedEntry.slot_index + 7) % 24) * 100).padStart(4, '0');
    const curLabel = String(((currentSlot + 7) % 24) * 100).padStart(4, '0');
    return {
      success: false,
      entry: {} as ProcessEntry,
      error: `Access Denied: Recording time window for slot ${slotLabel} is closed (Read-Only). Hourly readings can only be saved during the active live window slot (${curLabel}).`
    };
  }

  const limits = getParameterLimits();

  const entries = [...(currentSheet.entries || [])];
  const existingIdx = entries.findIndex(e => e.slot_index === updatedEntry.slot_index);

  // Soft/hard limit validation
  let hasDeviation = false;
  const observedDeviations: { key: string; label: string; val: number; sMin?: number | null; sMax?: number | null }[] = [];

  // Check vacuum
  if (updatedEntry.vacuum_torr !== undefined && updatedEntry.vacuum_torr !== null) {
    const lim = limits.find(l => l.field_key === 'vacuum_torr');
    if (lim?.hard_max && updatedEntry.vacuum_torr > lim.hard_max) {
      return { success: false, entry: {} as ProcessEntry, error: `Vacuum ${updatedEntry.vacuum_torr} exceeds physical hard limit (${lim.hard_max} Torr)!` };
    }
    if ((lim?.soft_max && updatedEntry.vacuum_torr > lim.soft_max) || (lim?.soft_min && updatedEntry.vacuum_torr < lim.soft_min)) {
      hasDeviation = true;
      observedDeviations.push({ key: 'vacuum_torr', label: 'Processing Vacuum', val: updatedEntry.vacuum_torr, sMin: lim.soft_min, sMax: lim.soft_max });
    }
  }

  // Check tray 1-7 temps
  for (let t = 1; t <= 7; t++) {
    const key = `tray_${t}_temp_c` as keyof ProcessEntry;
    const val = updatedEntry[key] as number | undefined | null;
    if (val !== undefined && val !== null) {
      const lim = limits.find(l => l.field_key === key);
      if (lim?.hard_max && val > lim.hard_max) {
        return { success: false, entry: {} as ProcessEntry, error: `Tray ${t} temp ${val}°C exceeds hard limit (${lim.hard_max}°C)!` };
      }
      if ((lim?.soft_max && val > lim.soft_max) || (lim?.soft_min && val < lim.soft_min)) {
        hasDeviation = true;
        observedDeviations.push({ key, label: `Tray ${t} Temperature`, val, sMin: lim.soft_min, sMax: lim.soft_max });
      }
    }
  }

  const slotLabel = String(((updatedEntry.slot_index + 7) % 24) * 100).padStart(4, '0');
  const now = new Date().toISOString();

  let finalEntry: ProcessEntry;

  const prodObj = getProducts().find(p => p.id === updatedEntry.product_id);
  const productName = prodObj?.name || updatedEntry.product_name || 'PL 65 Matsuyama';

  if (existingIdx >= 0) {
    const prev = entries[existingIdx];
    finalEntry = {
      ...prev,
      ...updatedEntry,
      product_name: productName,
      slot_label: slotLabel,
      has_deviation: hasDeviation,
      amended_by: prev.recorded_by ? profile.id : undefined,
      amended_by_name: prev.recorded_by ? profile.full_name : undefined,
      amended_at: prev.recorded_by ? now : undefined,
      recorded_by: prev.recorded_by || profile.id,
      recorded_by_name: prev.recorded_by_name || profile.full_name,
      recorded_at: prev.recorded_at || now,
    };
    entries[existingIdx] = finalEntry;
  } else {
    finalEntry = {
      ...updatedEntry,
      product_name: productName,
      id: `entry-${Date.now()}-${updatedEntry.slot_index}`,
      sheet_id: currentSheet.id,
      slot_label: slotLabel,
      slot_start: now,
      has_deviation: hasDeviation,
      recorded_by: profile.id,
      recorded_by_name: profile.full_name,
      recorded_at: now,
    };
    entries.push(finalEntry);
  }

  // Update deviations table if any detected
  if (observedDeviations.length > 0) {
    const currentDevs = getDeviations();
    observedDeviations.forEach(d => {
      currentDevs.unshift({
        id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entry_id: finalEntry.id,
        slot_label: slotLabel,
        field_key: d.key,
        field_label: d.label,
        observed: d.val,
        soft_min: d.sMin,
        soft_max: d.sMax,
        acknowledged_by: null,
        acknowledged_at: null,
        action_taken: null,
        created_at: now,
      });
    });
    setStored(STORAGE_KEYS.DEVIATIONS, currentDevs);
    memoryDeviations = currentDevs;
  }

  // Update sheet
  currentSheet.entries = entries;
  setStored(STORAGE_KEYS.SHEET, currentSheet);
  memorySheet = currentSheet;

  // Add audit log
  addAuditLog('process_entries', finalEntry.id, existingIdx >= 0 ? 'update' : 'insert', null, finalEntry);

  // Auto-dispatch product sample to RF-FR-001 QC Lab Analysis queue
  if (productName && !finalEntry.no_production_reason) {
    try {
      const currentReports = getSampleReports();
      const slotTimeCheck = `${slotLabel.slice(0, 2)}:00`;
      const existingReportIdx = currentReports.findIndex(
        r => r.sample_date === currentSheet.shift_date && (r.time_check === slotTimeCheck || r.lot_no?.endsWith(`-${slotLabel}`))
      );

      if (existingReportIdx >= 0) {
        // If sample exists and is awaiting results, sync with updated product
        const existing = currentReports[existingReportIdx];
        if (existing.status === 'awaiting_results' || !existing.decision) {
          existing.product_id = finalEntry.product_id || prodObj?.id || 'prod-26';
          existing.product_name = productName;
          existing.submitted_by = profile.id;
          existing.submitted_by_name = profile.full_name;
          setStored(STORAGE_KEYS.REPORTS, currentReports);
          memoryReports = currentReports;
        }
      } else {
        // Auto-create new QC sample report for this hour's product
        const reportId = `rep-${Date.now()}-${slotLabel}`;
        const cleanProdCode = (prodObj?.code || productName.split(' ')[0] || 'PL65').replace(/[^a-zA-Z0-9]/g, '');
        const cleanDateCode = currentSheet.shift_date.replace(/-/g, '').slice(2);
        const lotNo = `LOT-${cleanProdCode}-${cleanDateCode}-${slotLabel}`;
        const reportNo = `SAR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;

        const params = getParameters();
        const results: SampleResult[] = [];

        // Build requested parameter slots for QC test entry
        params.forEach(param => {
          if (param.code === 'SFC' && param.series_values) {
            param.series_values.forEach(temp => {
              results.push({
                id: `res-${Date.now()}-${temp}`,
                report_id: reportId,
                parameter_id: param.id,
                parameter_code: param.code,
                parameter_name: `SFC @ ${temp}°C`,
                unit: param.unit,
                series_key: temp,
                requested: true,
              });
            });
          } else {
            results.push({
              id: `res-${Date.now()}-${param.code}`,
              report_id: reportId,
              parameter_id: param.id,
              parameter_code: param.code,
              parameter_name: param.name,
              unit: param.unit,
              requested: true,
            });
          }
        });

        const newQCReport: SampleReport = {
          id: reportId,
          plant_id: INITIAL_PLANT.id,
          report_no: reportNo,
          sample_date: currentSheet.shift_date,
          time_check: slotTimeCheck,
          lot_no: lotNo,
          product_id: finalEntry.product_id || prodObj?.id || 'prod-26',
          product_name: productName,
          product_other: null,
          feed_tank_id: 'tank-01',
          feed_tank_code: 'TK-101A',
          discharge_tank_id: 'tank-04',
          discharge_tank_code: 'TK-201A',
          crystallizer_no: 'CR-04',
          batch_no: `B${cleanDateCode}${slotLabel.slice(0, 2)}`,
          sampling_point_id: 'sp-01',
          sampling_point_name: 'Deodorizer Outlet Pipe (Header 4)',
          submitted_by: profile.id,
          submitted_by_name: profile.full_name,
          remark_flushing: false,
          remark_cooling: false,
          remark_pushover: false,
          remarks: `Auto-dispatched from Hourly Process Log (Hour ${slotLabel} - ${productName})`,
          status: 'awaiting_results',
          created_by: profile.id,
          created_at: now,
          results,
        };

        currentReports.unshift(newQCReport);
        setStored(STORAGE_KEYS.REPORTS, currentReports);
        memoryReports = currentReports;

        addAuditLog('sample_reports', reportId, 'insert', null, newQCReport);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: currentReports }));
        window.dispatchEvent(new CustomEvent('refinery_sheet_updated', { detail: currentSheet }));
      }
    } catch (e) {
      console.warn('[Auto-QC] Failed to auto-dispatch QC sample:', e);
    }
  }

  return { success: true, entry: finalEntry };
}

// Copy Previous Hour logic
export function copyPreviousHour(slotIndex: number): { success: boolean; data?: Partial<ProcessEntry>; prevSlotLabel?: string; error?: string } {
  if (slotIndex <= 0) {
    return { success: false, error: 'Cannot copy for the 0700 first hour of the shift.' };
  }
  const sheet = getActiveProcessSheet();
  if (sheet.status === 'verified') {
    return { success: false, error: 'This sheet has been verified and locked. Readings cannot be copied or modified.' };
  }
  const currentSlot = getRealtimeSlotIndex();
  if (slotIndex !== currentSlot) {
    return { success: false, error: 'Access Denied: Readings can only be copied into the active live window slot.' };
  }

  // Find closest previous recorded entry (check slotIndex - 1, then search backwards for any earlier slot)
  let prevEntry = sheet.entries?.find(e => e.slot_index === slotIndex - 1);
  if (!prevEntry && sheet.entries && sheet.entries.length > 0) {
    const priorEntries = sheet.entries
      .filter(e => e.slot_index < slotIndex)
      .sort((a, b) => b.slot_index - a.slot_index);
    if (priorEntries.length > 0) {
      prevEntry = priorEntries[0];
    } else {
      // Fallback to any recorded entry in the sheet
      prevEntry = [...sheet.entries].sort((a, b) => b.slot_index - a.slot_index)[0];
    }
  }

  if (!prevEntry) {
    return { success: false, error: 'No previous recorded readings found in this shift sheet to copy.' };
  }

  const prevSlotLabel = prevEntry.slot_label || String(((prevEntry.slot_index + 7) % 24) * 100).padStart(4, '0');

  // Return non-identifying measurements
  const cloned: Partial<ProcessEntry> = {
    product_id: prevEntry.product_id,
    product_name: prevEntry.product_name,
    oil_feed_rate_litre: prevEntry.oil_feed_rate_litre,
    deod_time_set_hr: prevEntry.deod_time_set_hr,
    vacuum_torr: prevEntry.vacuum_torr,
    tray_1_temp_c: prevEntry.tray_1_temp_c,
    tray_2_temp_c: prevEntry.tray_2_temp_c,
    tray_3_temp_c: prevEntry.tray_3_temp_c,
    tray_4_temp_c: prevEntry.tray_4_temp_c,
    tray_5_temp_c: prevEntry.tray_5_temp_c,
    tray_6_temp_c: prevEntry.tray_6_temp_c,
    tray_7_temp_c: prevEntry.tray_7_temp_c,
    bc101_water_in_c: prevEntry.bc101_water_in_c,
    bc101_water_out_c: prevEntry.bc101_water_out_c,
    chill_water_in_c: prevEntry.chill_water_in_c,
    chill_water_out_c: prevEntry.chill_water_out_c,
    booster_press_bar: prevEntry.booster_press_bar,
    ejector_press_bar: prevEntry.ejector_press_bar,
    strip_steam_pct_of_oil: prevEntry.strip_steam_pct_of_oil,
    strip_steam_flow_kghr: prevEntry.strip_steam_flow_kghr,
    fp101a_press_bar: prevEntry.fp101a_press_bar,
    fp101b_press_bar: prevEntry.fp101b_press_bar,
  };

  return { success: true, data: cloned, prevSlotLabel };
}

// Supervisor Verification with Electronic Signature
export function verifySheet(sheetId: string, passwordConfirm: string): { success: boolean; error?: string } {
  if (!passwordConfirm || passwordConfirm.length < 4) {
    return { success: false, error: 'Electronic signature password is required (minimum 4 characters).' };
  }
  const sheet = getActiveProcessSheet();
  const profile = getCurrentProfile();
  const role = getCurrentRole();

  if (role !== 'supervisor' && role !== 'admin') {
    return { success: false, error: 'Only a Shift Supervisor or Administrator can verify this sheet.' };
  }

  const expectedPassword = profile.password || 'password123';
  if (passwordConfirm.trim() !== expectedPassword) {
    return { success: false, error: 'Electronic signature verification password is incorrect.' };
  }

  sheet.status = 'verified';
  sheet.verified_by = profile.id;
  sheet.verified_by_name = profile.full_name;
  sheet.verified_at = new Date().toISOString();

  setStored(STORAGE_KEYS.SHEET, sheet);
  memorySheet = sheet;

  addAuditLog('process_sheets', sheetId, 'update', { status: 'open' }, { status: 'verified', verified_by: profile.full_name });
  return { success: true };
}

// Admin Unlock Sheet with Mandatory Justification & Electronic Signature
export function unlockSheet(sheetId: string, reason: string, passwordConfirm: string): { success: boolean; error?: string } {
  const profile = getCurrentProfile();
  const role = getCurrentRole();

  if (role !== 'admin' && profile.role !== 'admin') {
    return { 
      success: false, 
      error: 'Only the Administrator role is authorized to unlock process sheets.' 
    };
  }

  if (!reason || reason.trim().length < 5) {
    return { 
      success: false, 
      error: 'Please enter a correction reason / justification for the audit trail record (minimum 5 characters).' 
    };
  }

  const expectedPassword = profile.password || 'password123';
  if (!passwordConfirm || passwordConfirm.trim() !== expectedPassword) {
    return { 
      success: false, 
      error: 'Admin electronic signature password is incorrect. Please verify your password.' 
    };
  }

  const sheet = getActiveProcessSheet();
  const previousStatus = sheet.status;
  const previousVerifiedBy = sheet.verified_by_name;

  sheet.status = 'open';
  sheet.verified_by = null;
  sheet.verified_by_name = null;
  sheet.verified_at = null;

  setStored(STORAGE_KEYS.SHEET, sheet);
  memorySheet = sheet;

  addAuditLog(
    'process_sheets', 
    sheetId, 
    'update', 
    { status: previousStatus, verified_by: previousVerifiedBy }, 
    { 
      status: 'open', 
      action: 'admin_unlocked',
      unlocked_by: profile.full_name, 
      employee_no: profile.employee_no,
      reason: reason.trim(),
      timestamp: new Date().toISOString()
    }
  );

  return { success: true };
}

// 3. Deviations
export function getDeviations(): Deviation[] {
  return getStored<Deviation[]>(STORAGE_KEYS.DEVIATIONS, memoryDeviations);
}

export function acknowledgeDeviation(deviationId: string, actionTaken: string): { success: boolean; error?: string } {
  if (!actionTaken || actionTaken.trim().length < 5) {
    return { success: false, error: 'Corrective action narrative must be at least 5 characters.' };
  }
  const devs = getDeviations();
  const profile = getCurrentProfile();
  const idx = devs.findIndex(d => d.id === deviationId);
  if (idx === -1) return { success: false, error: 'Deviation not found.' };

  devs[idx].acknowledged_by = profile.id;
  devs[idx].acknowledged_by_name = profile.full_name;
  devs[idx].acknowledged_at = new Date().toISOString();
  devs[idx].action_taken = actionTaken;

  setStored(STORAGE_KEYS.DEVIATIONS, devs);
  memoryDeviations = devs;

  addAuditLog('deviations', deviationId, 'update', null, devs[idx]);
  return { success: true };
}

// 4. Sample Reports & Lab (RF-FR-001)
export function getSampleReports(): SampleReport[] {
  return getStored<SampleReport[]>(STORAGE_KEYS.REPORTS, memoryReports);
}

export function getSampleReport(id: string): SampleReport | undefined {
  const list = getSampleReports();
  return list.find(r => r.id === id);
}

export function createSampleReport(data: {
  sample_date: string;
  time_check: string;
  lot_no: string;
  product_id: string;
  product_other?: string | null;
  feed_tank_id?: string;
  discharge_tank_id?: string;
  crystallizer_no?: string;
  batch_no?: string;
  sampling_point_id?: string;
  remark_flushing: boolean;
  remark_cooling: boolean;
  remark_pushover: boolean;
  remarks?: string;
  selected_parameter_ids: string[];
}): { success: boolean; report?: SampleReport; error?: string } {
  const profile = getCurrentProfile();
  const products = getProducts();
  const tanks = getTanks();
  const sps = getSamplingPoints();
  const params = getParameters();

  const prod = products.find(p => p.id === data.product_id);
  const feed = tanks.find(t => t.id === data.feed_tank_id);
  const disc = tanks.find(t => t.id === data.discharge_tank_id);
  const sp = sps.find(s => s.id === data.sampling_point_id);

  const reportId = `rep-${Date.now()}`;
  const reportNo = `SAR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;

  // Prepare requested parameter results
  const results: SampleResult[] = [];
  data.selected_parameter_ids.forEach(pId => {
    const param = params.find(p => p.id === pId);
    if (!param) return;
    if (param.code === 'SFC' && param.series_values) {
      param.series_values.forEach(temp => {
        results.push({
          id: `res-${Date.now()}-${temp}`,
          report_id: reportId,
          parameter_id: param.id,
          parameter_code: param.code,
          parameter_name: `SFC @ ${temp}°C`,
          unit: param.unit,
          series_key: temp,
          requested: true,
        });
      });
    } else {
      results.push({
        id: `res-${Date.now()}-${param.code}`,
        report_id: reportId,
        parameter_id: param.id,
        parameter_code: param.code,
        parameter_name: param.name,
        unit: param.unit,
        requested: true,
      });
    }
  });

  const newReport: SampleReport = {
    id: reportId,
    plant_id: INITIAL_PLANT.id,
    report_no: reportNo,
    sample_date: data.sample_date,
    time_check: data.time_check,
    lot_no: data.lot_no,
    product_id: data.product_id,
    product_name: prod ? prod.name : data.product_other || 'Others',
    product_other: data.product_other,
    feed_tank_id: data.feed_tank_id,
    feed_tank_code: feed?.code,
    discharge_tank_id: data.discharge_tank_id,
    discharge_tank_code: disc?.code,
    crystallizer_no: data.crystallizer_no,
    batch_no: data.batch_no,
    sampling_point_id: data.sampling_point_id,
    sampling_point_name: sp?.name,
    submitted_by: profile.id,
    submitted_by_name: profile.full_name,
    remark_flushing: data.remark_flushing,
    remark_cooling: data.remark_cooling,
    remark_pushover: data.remark_pushover,
    remarks: data.remarks,
    status: 'awaiting_results',
    created_by: profile.id,
    created_at: new Date().toISOString(),
    results,
  };

  const reports = getSampleReports();
  reports.unshift(newReport);
  setStored(STORAGE_KEYS.REPORTS, reports);
  memoryReports = reports;

  addAuditLog('sample_reports', reportId, 'insert', null, newReport);
  return { success: true, report: newReport };
}

// Enter QC Results
export function updateSampleResults(
  reportId: string, 
  resultsData: { resultId: string; value_numeric?: number | null; value_text?: string | null }[]
): { success: boolean; error?: string } {
  const reports = getSampleReports();
  const report = reports.find(r => r.id === reportId);
  if (!report || !report.results) return { success: false, error: 'Report not found.' };

  const profile = getCurrentProfile();
  const specs = getProductSpecs(report.product_id || undefined);

  resultsData.forEach(item => {
    const res = report.results!.find(r => r.id === item.resultId);
    if (!res) return;
    res.value_numeric = item.value_numeric;
    res.value_text = item.value_text;
    res.entered_by = profile.id;
    res.entered_by_name = profile.full_name;
    res.entered_at = new Date().toISOString();

    // Check spec
    const spec = specs.find(s => s.parameter_id === res.parameter_id && (res.series_key ? s.series_key === res.series_key : true));
    if (spec && res.value_numeric !== undefined && res.value_numeric !== null) {
      let pass = true;
      if (spec.min_value !== undefined && spec.min_value !== null && res.value_numeric < spec.min_value) pass = false;
      if (spec.max_value !== undefined && spec.max_value !== null && res.value_numeric > spec.max_value) pass = false;
      res.in_spec = pass;
    } else if (res.parameter_code === 'ODOUR' && res.value_text) {
      res.in_spec = res.value_text.toLowerCase() !== 'off';
    } else {
      res.in_spec = true;
    }
  });

  report.status = 'results_entered';
  setStored(STORAGE_KEYS.REPORTS, reports);
  memoryReports = reports;

  addAuditLog('sample_results', reportId, 'update', null, { status: 'results_entered' });
  return { success: true };
}

// QC Decision (Accept / Reject / Concession)
export function submitQCDecision(data: {
  report_id: string;
  decision: 'accept' | 'accept_concession' | 'reject';
  reason_id?: string;
  reason_detail?: string;
  failed_parameters?: string[];
  disposition?: 'rework' | 'reprocess' | 'downgrade' | 'hold' | 'scrap';
  password_confirm: string;
}): { success: boolean; error?: string } {
  if (!data.password_confirm || data.password_confirm.length < 4) {
    return { success: false, error: 'Electronic signature password required (min 4 chars).' };
  }
  if (data.decision !== 'accept') {
    if (!data.reason_id) {
      return { success: false, error: 'Rejection/concession requires a valid reason code.' };
    }
    if (!data.reason_detail || data.reason_detail.trim().length < 10) {
      return { success: false, error: 'Detailed reason narrative must be at least 10 characters for audit compliance.' };
    }
    if (data.decision === 'reject' && !data.disposition) {
      return { success: false, error: 'Product disposition (Rework, Reprocess, Downgrade, Hold, Scrap) is required.' };
    }
  }

  const reports = getSampleReports();
  const report = reports.find(r => r.id === data.report_id);
  if (!report) return { success: false, error: 'Sample report not found.' };

  const profile = getCurrentProfile();
  const reasons = getRejectionReasons();
  const reasonObj = reasons.find(r => r.id === data.reason_id);

  const decisionObj: QCDecision = {
    id: `dec-${Date.now()}`,
    report_id: data.report_id,
    decision: data.decision,
    reason_id: data.reason_id,
    reason_label: reasonObj?.label,
    reason_detail: data.reason_detail,
    failed_parameters: data.failed_parameters,
    disposition: data.disposition,
    decided_by: profile.id,
    decided_by_name: profile.full_name,
    decided_at: new Date().toISOString(),
  };

  report.decision = decisionObj;
  report.status = 'decided';

  setStored(STORAGE_KEYS.REPORTS, reports);
  memoryReports = reports;

  addAuditLog('qc_decisions', decisionObj.id, 'insert', null, decisionObj);
  return { success: true };
}

// 5. Audit Log
export function getAuditLogs(): AuditLogEntry[] {
  return getStored<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, memoryAuditLogs);
}

export function addAuditLog(
  tableName: string, 
  recordId: string, 
  action: 'insert' | 'update' | 'void', 
  oldRow?: unknown, 
  newRow?: unknown
): void {
  const logs = getAuditLogs();
  const profile = getCurrentProfile();
  const newEntry: AuditLogEntry = {
    id: Date.now(),
    table_name: tableName,
    record_id: recordId,
    action,
    actor_name: profile.full_name,
    old_row: oldRow as Record<string, unknown>,
    new_row: newRow as Record<string, unknown>,
    occurred_at: new Date().toISOString(),
  };
  logs.unshift(newEntry);
  setStored(STORAGE_KEYS.AUDIT_LOGS, logs);
  memoryAuditLogs = logs;
}
