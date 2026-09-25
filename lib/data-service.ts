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
  INITIAL_AUDIT_LOGS,
  DEFAULT_PRODUCT_ID,
  DEFAULT_FEED_TANK_ID,
  DEFAULT_DISCHARGE_TANK_ID,
  DEFAULT_SAMPLING_POINT_ID,
  PARAM_IDS
} from './mock-data';

import { supabase, isSupabaseConfigured } from './supabase';
import { sanitizeInputString } from './security';

const PLANT_ADMIN_SIGNATURE = 'NISSHIN-DEODORIZER-SECURE-AUTH-2026';

// =============================================================================
// Hierarchical Structured RFC-4122 UUID Standard Generator
// =============================================================================
export function makeSheetUuid(dateStr: string): string {
  const compact = (dateStr || '2026-09-20').replace(/-/g, '');
  return `60000000-0000-0000-0000-0000${compact}`;
}

export function makeEntryUuid(dateStr: string, slotIndex: number): string {
  const parts = (dateStr || '2026-09-20').split('-');
  const mmdd = `${parts[1] || '09'}${parts[2] || '20'}`;
  const hexSlot = (slotIndex ?? 0).toString(16).padStart(2, '0');
  return `61000000-${mmdd}-0000-0000-0000000000${hexSlot}`;
}

export function makeSampleReportUuid(seed?: number | string): string {
  const num = typeof seed === 'number' ? seed : parseInt(String(seed || Date.now()).replace(/\D/g, '').slice(-12), 10) || Math.floor(Math.random() * 1000000);
  const hexNum = (num % 0xffffffffffff).toString(16).padStart(12, '0');
  return `70000000-0000-0000-0000-${hexNum}`;
}

export function makeSampleResultUuid(reportSeq: number | string, paramIndex: number): string {
  const rNum = typeof reportSeq === 'number' ? reportSeq : parseInt(String(reportSeq).replace(/\D/g, '').slice(-4), 10) || 1;
  const rHex = (rNum % 0xffff).toString(16).padStart(4, '0');
  const pHex = (paramIndex % 0xffffffffffff).toString(16).padStart(12, '0');
  return `71000000-${rHex}-0000-0000-${pHex}`;
}

export function makeDecisionUuid(seed?: number | string): string {
  const num = typeof seed === 'number' ? seed : parseInt(String(seed || Date.now()).replace(/\D/g, '').slice(-12), 10) || Math.floor(Math.random() * 1000000);
  const hexNum = (num % 0xffffffffffff).toString(16).padStart(12, '0');
  return `80000000-0000-0000-0000-${hexNum}`;
}

export function makeDeviationUuid(seed?: number | string): string {
  const num = typeof seed === 'number' ? seed : parseInt(String(seed || Date.now()).replace(/\D/g, '').slice(-12), 10) || Math.floor(Math.random() * 1000000);
  const hexNum = (num % 0xffffffffffff).toString(16).padStart(12, '0');
  return `90000000-0000-0000-0000-${hexNum}`;
}

export const STORAGE_KEYS = {
  AUTH_USER: 'refinery_auth_user',
  CURRENT_ROLE: 'refinery_current_role',
  PROFILES: 'refinery_staff_profiles',
  SHEET: 'refinery_active_sheet',
  ALL_SHEETS: 'refinery_all_sheets',
  REPORTS: 'refinery_sample_reports',
  DEVIATIONS: 'refinery_deviations',
  AUDIT_LOGS: 'refinery_audit_logs',
};

// In-Memory fallback store
let memoryAuthUser: Profile | null = null;
let memoryRole: UserRole = 'operator';
let memoryProfiles: Profile[] = JSON.parse(JSON.stringify(INITIAL_PROFILES));
let memorySheet: ProcessSheet = JSON.parse(JSON.stringify(INITIAL_SHEET));
let memoryAllSheets: Record<string, ProcessSheet> = {
  '2026-09-20': JSON.parse(JSON.stringify(INITIAL_SHEET)),
};
let memoryReports: SampleReport[] = JSON.parse(JSON.stringify(INITIAL_REPORTS));
let memoryDeviations: Deviation[] = JSON.parse(JSON.stringify(INITIAL_DEVIATIONS));
let memoryAuditLogs: AuditLogEntry[] = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));

// Helpers to sync with browser storage if available
export function getStored<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

export function setStored<T>(key: string, val: T): void {
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
  qc_analyst: ['qc', 'export', 'report'],
  qc_manager: ['qc', 'export', 'report', 'analytics'],
  admin: ['admin', 'supervisor', 'process', 'report', 'qc', 'analytics', 'export'],
  viewer: ['export', 'report'],
};

export const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  operator: 'process',
  supervisor: 'supervisor',
  qc_analyst: 'qc',
  qc_manager: 'qc',
  admin: 'process',
  viewer: 'export',
};

export function generateNextEmployeeId(role: UserRole): string {
  const meta = ROLE_ID_SERIES[role] || { prefix: 'ST', start: 1000 };
  const all = getProfiles();
  const existingNums = all
    .filter(p => (p?.employee_no || '').toUpperCase().startsWith(`${meta.prefix}-`))
    .map(p => {
      const parts = (p?.employee_no || '').split('-');
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

// Live Supabase Authentication Engine: Queries Supabase for live credentials with offline fallback
export async function authenticateUser(identifier: string, password?: string): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();

  // 1. Proactively query Supabase directly first to get live credentials & latest full_name
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`employee_no.ilike.${cleanId},full_name.ilike.%${cleanId}%,role.ilike.${cleanId}`)
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        const liveUser = data[0];
        const mappedUser: Profile = {
          id: liveUser.employee_no,
          employee_no: liveUser.employee_no,
          full_name: liveUser.full_name,
          role: liveUser.role,
          status: liveUser.status || (liveUser.active === false ? 'unactive' : 'active'),
          active: liveUser.status === 'active' || liveUser.active === true,
          password: liveUser.password || 'password123',
          created_at: liveUser.created_at || new Date().toISOString(),
        };

        if (mappedUser.status === 'unactive' || mappedUser.active === false) {
          return {
            success: false,
            error: `Account (${mappedUser.employee_no} - ${mappedUser.full_name}) has been deactivated by the Plant Administrator. Please contact plant administration.`
          };
        }

        const expectedPassword = mappedUser.password || 'password123';
        if (!password || password.trim() !== expectedPassword) {
          return {
            success: false,
            error: 'The password entered is incorrect. Please ensure you enter the accurate password for this ID.'
          };
        }

        setAuthUser(mappedUser);

        // Update local profiles list with live user
        const all = getProfiles();
        const existingIdx = all.findIndex(p => p.employee_no === mappedUser.employee_no);
        if (existingIdx !== -1) {
          all[existingIdx] = mappedUser;
        } else {
          all.push(mappedUser);
        }
        setStored(STORAGE_KEYS.PROFILES, all);
        memoryProfiles = all;

        return { success: true, profile: mappedUser };
      }
    } catch (dbErr) {
      console.warn('[Auth] Direct Supabase auth query fallback:', dbErr);
    }
  }

  // 2. Fall back to offline/local loginUser
  return loginUser(identifier, password);
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
    const res = await fetch('/api/profiles', { 
      cache: 'no-store',
      headers: {
        'x-plant-admin-signature': PLANT_ADMIN_SIGNATURE,
      },
    });
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

// Auto-sync on client load and Supabase Realtime channel listener
if (typeof window !== 'undefined') {
  // Initial sync upon client mounting
  setTimeout(() => {
    syncProfilesFromSupabase().catch(() => {});
    syncProcessSheetsFromSupabase().catch(() => {});
    syncSampleReportsFromSupabase().catch(() => {});
    syncAuditLogsFromSupabase().catch(() => {});
  }, 150);

  // Background auto-sync interval (every 20 seconds)
  setInterval(() => {
    syncProfilesFromSupabase().catch(() => {});
    syncProcessSheetsFromSupabase().catch(() => {});
    syncSampleReportsFromSupabase().catch(() => {});
    syncAuditLogsFromSupabase().catch(() => {});
  }, 20000);

  // Live Supabase Realtime PostgreSQL Change listener
  try {
    if (supabase) {
      supabase
        .channel('refinery_profiles_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            console.info('[Supabase Realtime] Profile table change detected:', payload.eventType, payload.new || payload.old);
            syncProfilesFromSupabase().catch(() => {});
          }
        )
        .subscribe();

      supabase
        .channel('refinery_sheets_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'process_sheets' },
          () => {
            console.info('[Supabase Realtime] Process sheets change detected');
            syncProcessSheetsFromSupabase().catch(() => {});
          }
        )
        .subscribe();

      supabase
        .channel('refinery_entries_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'process_entries' },
          () => {
            console.info('[Supabase Realtime] Process entries change detected');
            syncProcessSheetsFromSupabase().catch(() => {});
          }
        )
        .subscribe();

      supabase
        .channel('refinery_reports_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sample_reports' },
          (payload) => {
            console.info('[Supabase Realtime] Sample reports change detected:', payload.eventType);
            syncSampleReportsFromSupabase().catch(() => {});
          }
        )
        .subscribe();

      supabase
        .channel('refinery_decisions_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'qc_decisions' },
          () => {
            console.info('[Supabase Realtime] QC decisions change detected');
            syncSampleReportsFromSupabase().catch(() => {});
          }
        )
        .subscribe();

      supabase
        .channel('refinery_audit_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'audit_log' },
          (payload) => {
            console.info('[Supabase Realtime] Audit log change detected:', payload.eventType);
            syncAuditLogsFromSupabase().catch(() => {});
          }
        )
        .subscribe();
    }
  } catch (subErr) {
    console.warn('[Supabase Realtime] Failed to initialize realtime channels:', subErr);
  }
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
    let savedSuccessfully = false;

    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-plant-admin-signature': PLANT_ADMIN_SIGNATURE,
        },
        body: JSON.stringify({
          employee_no: newProfile.employee_no,
          full_name: sanitizeInputString(newProfile.full_name),
          role: newProfile.role,
          status: newProfile.status,
          password: newProfile.password,
          created_at: newProfile.created_at
        })
      });

      if (res.ok) {
        savedSuccessfully = true;
        console.info('[Supabase Sync Success] Profile recorded into Supabase via API:', employee_no);
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[Supabase API Sync Warning]', errJson);
      }
    } catch (apiErr) {
      console.warn('[Supabase API Fetch Warning]', apiErr);
    }

    // Direct Supabase Client fallback if API route failed
    if (!savedSuccessfully && supabase) {
      try {
        const { error: directErr } = await supabase
          .from('profiles')
          .upsert([{
            employee_no: newProfile.employee_no,
            full_name: newProfile.full_name,
            role: newProfile.role,
            status: newProfile.status,
            password: newProfile.password,
            created_at: newProfile.created_at
          }], { onConflict: 'employee_no' });

        if (!directErr) {
          savedSuccessfully = true;
          console.info('[Supabase Direct Sync Success] Profile saved directly via client:', employee_no);
        } else {
          console.error('[Supabase Direct Client Error]', directErr);
        }
      } catch (clientErr) {
        console.error('[Supabase Direct Exception]', clientErr);
      }
    }

    if (!savedSuccessfully) {
      // Roll back optimistic update if Supabase could not be written
      memoryProfiles = current;
      setStored(STORAGE_KEYS.PROFILES, current);
      throw new Error(`Failed to save user ${employee_no} into Supabase database. Operation rolled back.`);
    }

    // Immediately re-sync profiles from Supabase to confirm canonical state
    await syncProfilesFromSupabase();
  }

  addAuditLog('profiles', newProfile.employee_no, 'insert', null, newProfile);
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
    let patched = false;
    try {
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-plant-admin-signature': PLANT_ADMIN_SIGNATURE,
        },
        body: JSON.stringify({
          employee_no: target.employee_no,
          status: newStatus
        })
      });

      if (res.ok) {
        patched = true;
        console.info('[Supabase Sync Success] Status updated in Supabase:', target.employee_no, newStatus);
      }
    } catch (err) {
      console.warn('[Supabase Network Error]', err);
    }

    if (!patched && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('employee_no', target.employee_no);
      } catch (err) {
        console.error('[Supabase Client Direct Update Error]', err);
      }
    }

    await syncProfilesFromSupabase();
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
    let deleted = false;
    try {
      const res = await fetch(`/api/profiles?employee_no=${encodeURIComponent(target.employee_no)}`, {
        method: 'DELETE',
        headers: {
          'x-plant-admin-signature': PLANT_ADMIN_SIGNATURE,
        },
      });

      if (res.ok) {
        deleted = true;
        console.info('[Supabase Sync Success] Profile deleted from Supabase:', target.employee_no);
      }
    } catch (err) {
      console.warn('[Supabase Network Error]', err);
    }

    if (!deleted && supabase) {
      try {
        await supabase
          .from('profiles')
          .delete()
          .eq('employee_no', target.employee_no);
      } catch (err) {
        console.error('[Supabase Client Direct Delete Error]', err);
      }
    }

    await syncProfilesFromSupabase();
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

// Return sensible default lab parameters based on product specs or product oil type
export function getDefaultParametersForProduct(productId?: string): string[] {
  const specs = getProductSpecs(productId);
  if (specs && specs.length > 0) {
    const fromSpecs = Array.from(new Set(specs.map(s => s.parameter_id)));
    if (!fromSpecs.includes(PARAM_IDS.ODOUR)) fromSpecs.push(PARAM_IDS.ODOUR);
    return fromSpecs;
  }

  // Industrial default based on product classification
  const products = getProducts();
  const prod = products.find(p => p.id === productId);
  const name = (prod?.name || '').toLowerCase();

  const standard = [
    PARAM_IDS.FFA,
    PARAM_IDS.H2O,
    PARAM_IDS.IV,
    PARAM_IDS.PV,
    PARAM_IDS.COLOUR_R,
    PARAM_IDS.COLOUR_Y,
    PARAM_IDS.ODOUR,
  ];

  if (name.includes('olein') || name.includes('superolein')) {
    return [...standard, PARAM_IDS.CLOUD_POINT];
  }
  if (name.includes('stearin') || name.includes('matsuyama') || name.includes('hard') || name.includes('fat')) {
    return [...standard, PARAM_IDS.SLIP_MELT, PARAM_IDS.CLOUD_POINT, PARAM_IDS.SFC, PARAM_IDS.TEMP];
  }
  if (name.includes('pfad') || name.includes('acid')) {
    return [PARAM_IDS.FFA, PARAM_IDS.H2O, PARAM_IDS.IV, PARAM_IDS.FAC_C12];
  }

  return standard;
}

export function getRejectionReasons(): RejectionReason[] {
  return INITIAL_REJECTION_REASONS;
}

// Calculate real-time shift date based on plant operating rule:
// Shift runs 07:00 (Today) to 06:00 (Tomorrow).
// Between 00:00:00 and 06:59:59 AM, the shift still belongs to yesterday's shift date.
export function getRealtimeShiftDate(): string {
  const now = new Date();
  const mytParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const year = mytParts.find(p => p.type === 'year')?.value || '2026';
  const month = mytParts.find(p => p.type === 'month')?.value || '09';
  const day = mytParts.find(p => p.type === 'day')?.value || '22';
  const hour = parseInt(mytParts.find(p => p.type === 'hour')?.value || '8', 10);

  if (hour < 7) {
    const d = new Date(`${year}-${month}-${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
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

// All Process Sheets Store Management
export function getAllProcessSheets(): Record<string, ProcessSheet> {
  let stored = getStored<Record<string, ProcessSheet> | null>(STORAGE_KEYS.ALL_SHEETS, null);
  if (!stored || typeof stored !== 'object') {
    stored = {};
  }

  // Preserve legacy active sheet if stored before multi-date support
  const legacy = getStored<ProcessSheet | null>(STORAGE_KEYS.SHEET, null);
  if (legacy && legacy.shift_date && !stored[legacy.shift_date]) {
    stored[legacy.shift_date] = legacy;
  }

  // Seed sample verified past sheets if missing
  let changed = false;
  if (!stored['2026-09-21']) {
    const s21: ProcessSheet = JSON.parse(JSON.stringify(INITIAL_SHEET));
    s21.id = makeSheetUuid('2026-09-21');
    s21.shift_date = '2026-09-21';
    s21.status = 'verified';
    s21.opened_at = '2026-09-21T06:55:00+08:00';
    s21.verified_by = 'SV-2014';
    s21.verified_by_name = 'Chong Wei Lun (SV-2014)';
    s21.verified_at = '2026-09-21T19:30:00+08:00';
    s21.entries = (s21.entries || []).map(e => ({
      ...e,
      id: makeEntryUuid('2026-09-21', e.slot_index),
      sheet_id: makeSheetUuid('2026-09-21'),
      slot_start: `2026-09-21T${e.slot_label.slice(0, 2)}:00:00+08:00`,
      recorded_at: `2026-09-21T${e.slot_label.slice(0, 2)}:55:00+08:00`,
    }));
    stored['2026-09-21'] = s21;
    changed = true;
  }

  if (!stored['2026-09-20']) {
    const s20: ProcessSheet = JSON.parse(JSON.stringify(INITIAL_SHEET));
    s20.status = 'verified';
    s20.verified_by = 'SV-2014';
    s20.verified_by_name = 'Chong Wei Lun (SV-2014)';
    s20.verified_at = '2026-09-20T19:30:00+08:00';
    stored['2026-09-20'] = s20;
    changed = true;
  }

  if (changed || !getStored(STORAGE_KEYS.ALL_SHEETS, null)) {
    setStored(STORAGE_KEYS.ALL_SHEETS, stored);
  }
  memoryAllSheets = stored;
  return stored;
}

export function saveAllProcessSheets(sheets: Record<string, ProcessSheet>): void {
  memoryAllSheets = sheets;
  setStored(STORAGE_KEYS.ALL_SHEETS, sheets);
}

export function getAvailableShiftDates(): string[] {
  const all = getAllProcessSheets();
  const today = getRealtimeShiftDate();
  const dateSet = new Set<string>([today, ...Object.keys(all)]);
  return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
}

// 2. Process Sheet (RF-FR-004)
export function getProcessSheetByDate(shiftDate: string): ProcessSheet {
  const all = getAllProcessSheets();
  if (all[shiftDate]) {
    return all[shiftDate];
  }

  // Find previous sheet to carry forward setpoints (stripping steam & tray steam supply)
  const prevDates = Object.keys(all).filter(d => d < shiftDate).sort((a, b) => b.localeCompare(a));
  const prevSheet = prevDates.length > 0 ? all[prevDates[0]] : null;
  const strippingSteam = prevSheet?.stripping_steam_pct ?? 1.5;
  const setSteamBar = prevSheet?.set_steam_supply_bar ?? 3.0;

  const profile = getCurrentProfile();
  const isPast = shiftDate < getRealtimeShiftDate();
  const entries: ProcessEntry[] = isPast
    ? (INITIAL_SHEET.entries || []).map(e => ({
        ...e,
        id: makeEntryUuid(shiftDate, e.slot_index),
        sheet_id: makeSheetUuid(shiftDate),
        slot_start: `${shiftDate}T${e.slot_label.slice(0, 2)}:00:00+08:00`,
        recorded_at: `${shiftDate}T${e.slot_label.slice(0, 2)}:55:00+08:00`,
      }))
    : [];

  const newSheet: ProcessSheet = {
    id: makeSheetUuid(shiftDate),
    plant_id: INITIAL_PLANT.id,
    shift_date: shiftDate,
    stripping_steam_pct: strippingSteam,
    set_steam_supply_bar: setSteamBar,
    status: isPast ? 'verified' : 'open',
    opened_by: profile?.id || 'OP-1042',
    opened_by_name: profile?.full_name || 'Plant Operator',
    opened_at: `${shiftDate}T06:55:00+08:00`,
    verified_by: isPast ? 'SV-2014' : null,
    verified_by_name: isPast ? 'Chong Wei Lun (SV-2014)' : null,
    verified_at: isPast ? `${shiftDate}T23:59:00+08:00` : null,
    entries,
  };

  all[shiftDate] = newSheet;
  saveAllProcessSheets(all);

  if (shiftDate === getRealtimeShiftDate()) {
    setStored(STORAGE_KEYS.SHEET, newSheet);
    memorySheet = newSheet;
  }

  return newSheet;
}

export function getActiveProcessSheet(): ProcessSheet {
  const realtimeDate = getRealtimeShiftDate();
  return getProcessSheetByDate(realtimeDate);
}

export function saveProcessEntry(
  updatedEntry: Partial<ProcessEntry> & { slot_index: number },
  targetShiftDate?: string
): { success: boolean; entry: ProcessEntry; error?: string } {
  const shiftDate = targetShiftDate || getRealtimeShiftDate();
  const currentSheet = getProcessSheetByDate(shiftDate);
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
  const isCurrentLiveShift = shiftDate === getRealtimeShiftDate();
  if (isCurrentLiveShift && updatedEntry.slot_index !== currentSlot && role !== 'admin') {
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
      id: makeEntryUuid(currentSheet.shift_date, updatedEntry.slot_index),
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
        id: makeDeviationUuid(Date.now() + Math.floor(Math.random() * 1000)),
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

  // Auto-sync shift setpoint/display with latest actual values entered by operator
  const latestWithStrip = [...entries]
    .filter(e => e.strip_steam_pct_of_oil != null && !isNaN(Number(e.strip_steam_pct_of_oil)))
    .sort((a, b) => b.slot_index - a.slot_index)[0];
  if (latestWithStrip?.strip_steam_pct_of_oil != null) {
    currentSheet.stripping_steam_pct = Number(latestWithStrip.strip_steam_pct_of_oil);
  } else if (finalEntry.strip_steam_pct_of_oil != null && !isNaN(Number(finalEntry.strip_steam_pct_of_oil))) {
    currentSheet.stripping_steam_pct = Number(finalEntry.strip_steam_pct_of_oil);
  }

  const latestWithTray = [...entries]
    .filter(e => e.tray_steam_supply_bar != null && !isNaN(Number(e.tray_steam_supply_bar)))
    .sort((a, b) => b.slot_index - a.slot_index)[0];
  if (latestWithTray?.tray_steam_supply_bar != null) {
    currentSheet.set_steam_supply_bar = Number(latestWithTray.tray_steam_supply_bar);
  } else if (finalEntry.tray_steam_supply_bar != null && !isNaN(Number(finalEntry.tray_steam_supply_bar))) {
    currentSheet.set_steam_supply_bar = Number(finalEntry.tray_steam_supply_bar);
  }

  // Update sheet
  currentSheet.entries = entries;
  const allSheets = getAllProcessSheets();
  allSheets[currentSheet.shift_date] = currentSheet;
  saveAllProcessSheets(allSheets);

  if (currentSheet.shift_date === getRealtimeShiftDate()) {
    setStored(STORAGE_KEYS.SHEET, currentSheet);
    memorySheet = currentSheet;
  }

  // Add audit log
  addAuditLog('process_entries', finalEntry.id, existingIdx >= 0 ? 'update' : 'insert', null, finalEntry);

  // Auto-dispatch product sample to RF-FR-001 QC Lab Analysis queue (Mandatory SOP)
  finalEntry.auto_dispatch_qc = updatedEntry.auto_dispatch_qc !== undefined ? updatedEntry.auto_dispatch_qc : true;
  const defaultSpecParamIds = getDefaultParametersForProduct(finalEntry.product_id || undefined);
  finalEntry.qc_parameter_ids = defaultSpecParamIds;

  if (finalEntry.auto_dispatch_qc && productName && !finalEntry.no_production_reason) {
    try {
      const qcReport = ensureAutoDispatchedQC(
        updatedEntry.slot_index,
        currentSheet.shift_date,
        finalEntry.product_id || undefined
      );
      if (qcReport) {
        const currentReports = getStored<SampleReport[]>(STORAGE_KEYS.REPORTS, memoryReports);
        const repIdx = currentReports.findIndex(r => r.id === qcReport.id);
        if (repIdx >= 0) {
          if (profile) {
            currentReports[repIdx].submitted_by = profile.id;
            currentReports[repIdx].submitted_by_name = profile.full_name;
          }
          setStored(STORAGE_KEYS.REPORTS, currentReports);
          memoryReports = currentReports;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: currentReports }));
            window.dispatchEvent(new CustomEvent('refinery_sheet_updated', { detail: currentSheet }));
          }
        }
      }
    } catch (e) {
      console.warn('[Auto-QC] Failed to sync auto-dispatched QC sample on save:', e);
    }
  }

  // Trigger Supabase background sync
  if (supabase) {
    syncProcessSheetToSupabase(currentSheet).catch(e => {
      console.warn('[Process Sheet Sync] Background sync warning:', e);
    });
  }

  return { success: true, entry: finalEntry };
}

// Proactive Auto-Dispatch: Immediately generates & enqueues sample lot in RF-FR-001 QC Lab when timeline slot changes or process entry recorded
export function ensureAutoDispatchedQC(
  slotIndex?: number,
  shiftDate?: string,
  explicitProductId?: string
): SampleReport | null {
  try {
    const targetSlotIndex = slotIndex !== undefined ? slotIndex : getRealtimeSlotIndex();
    const realtimeDate = getRealtimeShiftDate();
    const targetShiftDate = shiftDate || realtimeDate;
    const slotLabel = String(((targetSlotIndex + 7) % 24) * 100).padStart(4, '0');
    const slotTimeCheck = `${slotLabel.slice(0, 2)}:00`;

    const currentReports = getStored<SampleReport[]>(STORAGE_KEYS.REPORTS, memoryReports);
    const existingReportIdx = currentReports.findIndex(
      r => r.sample_date === targetShiftDate && (r.time_check === slotTimeCheck || r.lot_no?.endsWith(`-${slotLabel}`))
    );

    // Determine product to use
    let productId: string | undefined = explicitProductId;
    const allSheets = getAllProcessSheets();
    const targetSheet = allSheets[targetShiftDate];

    if (!productId && targetSheet && targetSheet.entries) {
      const thisEntry = targetSheet.entries.find(e => e.slot_index === targetSlotIndex);
      if (thisEntry && thisEntry.product_id) {
        productId = thisEntry.product_id;
      } else {
        // Look backward in current sheet
        const pastEntries = [...targetSheet.entries]
          .filter(e => e.slot_index < targetSlotIndex && !!e.product_id)
          .sort((a, b) => b.slot_index - a.slot_index);
        if (pastEntries.length > 0 && pastEntries[0].product_id) {
          productId = pastEntries[0].product_id;
        }
      }
    }

    // If still not found, search previous date sheets
    if (!productId) {
      const pastDates = Object.keys(allSheets)
        .filter(d => d < targetShiftDate)
        .sort((a, b) => b.localeCompare(a));
      for (const d of pastDates) {
        const pastSheet = allSheets[d];
        if (pastSheet.entries && pastSheet.entries.length > 0) {
          const sorted = [...pastSheet.entries].filter(e => !!e.product_id).sort((a, b) => b.slot_index - a.slot_index);
          if (sorted.length > 0 && sorted[0].product_id) {
            productId = sorted[0].product_id;
            break;
          }
        }
      }
    }

    // Default fallback
    if (!productId) {
      productId = DEFAULT_PRODUCT_ID; // PL 65 Matsuyama
    }

    const allProducts = getProducts();
    const prodObj = allProducts.find(p => p.id === productId) || INITIAL_PRODUCTS.find(p => p.id === productId);
    const productName = prodObj?.name || 'PL 65 Matsuyama';
    const allParams = getParameters();
    const defaultSpecParamIds = getDefaultParametersForProduct(productId);

    const buildResults = (repId: string): SampleResult[] => {
      const resultsList: SampleResult[] = [];
      let resSeq = 1;
      allParams.forEach(param => {
        const isReq = defaultSpecParamIds.length > 0 ? defaultSpecParamIds.includes(param.id) : true;
        if (param.is_series && param.series_values) {
          param.series_values.forEach(temp => {
            resultsList.push({
              id: makeSampleResultUuid(repId, resSeq++),
              report_id: repId,
              parameter_id: param.id,
              parameter_code: param.code,
              parameter_name: `${param.name} ${temp}°C`,
              unit: param.unit,
              series_key: temp,
              requested: isReq,
            });
          });
        } else {
          resultsList.push({
            id: makeSampleResultUuid(repId, resSeq++),
            report_id: repId,
            parameter_id: param.id,
            parameter_code: param.code,
            parameter_name: param.name,
            unit: param.unit,
            requested: isReq,
          });
        }
      });
      return resultsList;
    };

    if (existingReportIdx >= 0) {
      const existing = currentReports[existingReportIdx];
      // If report already exists and is awaiting results, sync product if explicit product changed
      if (explicitProductId && (existing.status === 'awaiting_results' || !existing.decision)) {
        if (existing.product_id !== explicitProductId) {
          existing.product_id = explicitProductId;
          existing.product_name = productName;
          if (existing.status === 'awaiting_results' && (!existing.results || existing.results.every(r => r.value_numeric == null && !r.value_text))) {
            existing.results = buildResults(existing.id);
          }
          setStored(STORAGE_KEYS.REPORTS, currentReports);
          memoryReports = currentReports;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: currentReports }));
          }
        }
      }
      return existing;
    }

    // Auto-create new QC sample report immediately for this timeline slot
    const reportSeq = Math.floor(1000 + Math.random() * 9000);
    const reportId = makeSampleReportUuid(reportSeq);
    const cleanProdCode = (prodObj?.code || productName.split(' ')[0] || 'PL65').replace(/[^a-zA-Z0-9]/g, '');
    const cleanDateCode = targetShiftDate.replace(/-/g, '').slice(2);
    const lotNo = `LOT-${cleanProdCode}-${cleanDateCode}-${slotLabel}`;
    const reportNo = `SAR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const now = new Date().toISOString();
    const profile = getCurrentProfile();

    const targetSheetForEntry = allSheets[targetShiftDate];
    const matchingEntry = targetSheetForEntry?.entries?.find(e => e.slot_index === targetSlotIndex);
    const submitterId = matchingEntry?.recorded_by || profile?.id || 'OP-1042';
    const submitterName = matchingEntry?.recorded_by_name || profile?.full_name || 'Process Log Auto-Dispatch';

    const newQCReport: SampleReport = {
      id: reportId,
      plant_id: INITIAL_PLANT.id,
      report_no: reportNo,
      sample_date: targetShiftDate,
      time_check: slotTimeCheck,
      lot_no: lotNo,
      product_id: productId,
      product_name: productName,
      product_other: null,
      feed_tank_id: DEFAULT_FEED_TANK_ID,
      feed_tank_code: 'TK-101A',
      discharge_tank_id: DEFAULT_DISCHARGE_TANK_ID,
      discharge_tank_code: 'TK-201A',
      crystallizer_no: 'CR-04',
      batch_no: `B${cleanDateCode}${slotLabel.slice(0, 2)}`,
      sampling_point_id: DEFAULT_SAMPLING_POINT_ID,
      sampling_point_name: 'Deodorizer Outlet Pipe (Header 4)',
      submitted_by: submitterId,
      submitted_by_name: submitterName,
      remark_flushing: false,
      remark_cooling: false,
      remark_pushover: false,
      remarks: `Auto-dispatched from Process Log (Hour ${slotLabel} - ${productName})`,
      status: 'awaiting_results',
      created_by: submitterId,
      created_at: now,
      results: buildResults(reportId),
    };

    currentReports.unshift(newQCReport);
    setStored(STORAGE_KEYS.REPORTS, currentReports);
    memoryReports = currentReports;

    addAuditLog('sample_reports', reportId, 'insert', null, newQCReport);

    if (supabase) {
      syncSampleReportToSupabase(newQCReport).catch(e => {
        console.warn('[Auto-QC] Background sync warning:', e);
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: currentReports }));
    }

    return newQCReport;
  } catch (e) {
    console.warn('[Auto-QC] Failed to ensure auto-dispatched QC sample:', e);
    return null;
  }
}

/**
 * Comprehensive Auto-Dispatch Sync:
 * Scans all process entries in the active process sheet(s) that have recorded production readings
 * and ensures that an awaiting sample lot exists in RF-FR-001 QC Lab for every single recorded hour.
 */
export function syncAllProcessEntriesToQC(targetShiftDate?: string): number {
  try {
    const allSheets = getAllProcessSheets();
    const realtimeDate = getRealtimeShiftDate();
    const datesToSync = new Set<string>();

    if (targetShiftDate) {
      datesToSync.add(targetShiftDate);
    }
    datesToSync.add(realtimeDate);

    // Also include any sheets stored in allSheets that have entries
    Object.keys(allSheets).forEach(d => {
      const s = allSheets[d];
      if (s && s.entries && s.entries.length > 0) {
        datesToSync.add(d);
      }
    });

    let dispatchedCount = 0;

    datesToSync.forEach(dateStr => {
      const sheet = allSheets[dateStr] || getProcessSheetByDate(dateStr);
      if (!sheet || !Array.isArray(sheet.entries)) return;

      sheet.entries.forEach(entry => {
        // Only dispatch entries that represent production (not shut down / no production)
        if (entry.no_production_reason) return;
        if (entry.auto_dispatch_qc === false) return;

        // An entry has data if product_id is set or any operational readings are logged
        const hasData = Boolean(
          entry.product_id ||
          entry.oil_feed_rate_litre != null ||
          entry.vacuum_torr != null ||
          entry.tray_1_temp_c != null ||
          entry.strip_steam_pct_of_oil != null ||
          entry.recorded_by != null
        );

        if (hasData) {
          const res = ensureAutoDispatchedQC(entry.slot_index, dateStr, entry.product_id || undefined);
          if (res) dispatchedCount++;
        }
      });
    });

    // Also ensure active realtime slot for live shift
    const currentSlot = getRealtimeSlotIndex();
    ensureAutoDispatchedQC(currentSlot, realtimeDate);

    return dispatchedCount;
  } catch (e) {
    console.warn('[Auto-QC] syncAllProcessEntriesToQC error:', e);
    return 0;
  }
}

// Copy Previous Hour logic
export function copyPreviousHour(
  slotIndex: number,
  targetShiftDate?: string
): { success: boolean; data?: Partial<ProcessEntry>; prevSlotLabel?: string; error?: string } {
  if (slotIndex <= 0) {
    return { success: false, error: 'Cannot copy for the 0700 first hour of the shift.' };
  }
  const sheet = targetShiftDate ? getProcessSheetByDate(targetShiftDate) : getActiveProcessSheet();
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

  // If this is a fresh sheet and no entries exist yet today, check yesterday's or previous sheet
  if (!prevEntry) {
    const all = getAllProcessSheets();
    const prevDates = Object.keys(all).filter(d => d < sheet.shift_date).sort((a, b) => b.localeCompare(a));
    for (const d of prevDates) {
      const pastSheet = all[d];
      if (pastSheet.entries && pastSheet.entries.length > 0) {
        prevEntry = [...pastSheet.entries].sort((a, b) => b.slot_index - a.slot_index)[0];
        if (prevEntry) break;
      }
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
    auto_dispatch_qc: prevEntry.auto_dispatch_qc !== false,
    qc_parameter_ids: prevEntry.qc_parameter_ids,
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
    tray_steam_supply_bar: prevEntry.tray_steam_supply_bar,
    strip_steam_pct_of_oil: prevEntry.strip_steam_pct_of_oil,
    strip_steam_flow_kghr: prevEntry.strip_steam_flow_kghr,
    fp101a_press_bar: prevEntry.fp101a_press_bar,
    fp101b_press_bar: prevEntry.fp101b_press_bar,
  };

  return { success: true, data: cloned, prevSlotLabel };
}

// Supervisor Verification with Electronic Signature
export function verifyProcessSheet(
  sheetId: string, 
  passwordConfirm: string,
  targetShiftDate?: string
): { success: boolean; error?: string } {
  if (!passwordConfirm || passwordConfirm.length < 4) {
    return { success: false, error: 'Electronic signature password is required (minimum 4 characters).' };
  }
  const sheet = targetShiftDate ? getProcessSheetByDate(targetShiftDate) : getActiveProcessSheet();
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

  const allSheets = getAllProcessSheets();
  allSheets[sheet.shift_date] = sheet;
  saveAllProcessSheets(allSheets);

  if (sheet.shift_date === getRealtimeShiftDate()) {
    setStored(STORAGE_KEYS.SHEET, sheet);
    memorySheet = sheet;
  }

  addAuditLog('process_sheets', sheetId, 'update', { status: 'open' }, { status: 'verified', verified_by: profile.full_name });
  return { success: true };
}

export const verifySheet = verifyProcessSheet;

// Admin Unlock Sheet with Mandatory Justification & Electronic Signature
export function unlockSheet(
  sheetId: string, 
  reason: string, 
  passwordConfirm: string,
  targetShiftDate?: string
): { success: boolean; error?: string } {
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

  const sheet = targetShiftDate ? getProcessSheetByDate(targetShiftDate) : getActiveProcessSheet();
  const previousStatus = sheet.status;
  const previousVerifiedBy = sheet.verified_by_name;

  sheet.status = 'open';
  sheet.verified_by = null;
  sheet.verified_by_name = null;
  sheet.verified_at = null;

  const allSheets = getAllProcessSheets();
  allSheets[sheet.shift_date] = sheet;
  saveAllProcessSheets(allSheets);

  if (sheet.shift_date === getRealtimeShiftDate()) {
    setStored(STORAGE_KEYS.SHEET, sheet);
    memorySheet = sheet;
  }

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
  // Automatically sync all recorded process entries to QC Lab queue so all hours are present
  syncAllProcessEntriesToQC();

  const reports = getStored<SampleReport[]>(STORAGE_KEYS.REPORTS, memoryReports);
  let migrated = false;
  reports.forEach(rep => {
    if (rep.results && rep.results.length > 0) {
      const hasLegacySfcSeries = rep.results.some(
        r => (r.parameter_code === 'SFC' || r.parameter_id === 'param-sfc') && r.series_key != null
      );
      if (hasLegacySfcSeries) {
        migrated = true;
        const hasSingleSfc = rep.results.some(
          r => (r.parameter_code === 'SFC' || r.parameter_id === 'param-sfc') && r.series_key == null
        );
        rep.results = rep.results.map(r => {
          if ((r.parameter_code === 'SFC' || r.parameter_id === 'param-sfc') && r.series_key != null) {
            return {
              ...r,
              parameter_id: 'param-temp',
              parameter_code: 'TEMP',
              parameter_name: `Temperature ${r.series_key}°C`,
              unit: '-',
            };
          }
          if ((r.parameter_code === 'TEMP' || r.parameter_id === 'param-temp') && (r.unit === '%' || !r.unit)) {
            migrated = true;
            return {
              ...r,
              unit: '-',
            };
          }
          return r;
        });
        if (!hasSingleSfc) {
          rep.results.push({
            id: `res-${rep.id}-SFC`,
            report_id: rep.id,
            parameter_id: 'param-sfc',
            parameter_code: 'SFC',
            parameter_name: 'Solid Fat Content (SFC)',
            unit: '%',
            requested: true,
            value_numeric: undefined,
          });
        }
      }
    }
  });
  if (migrated) {
    setStored(STORAGE_KEYS.REPORTS, reports);
    memoryReports = reports;
  }
  return reports;
}

export function getSampleReport(id: string): SampleReport | undefined {
  const list = getSampleReports();
  return list.find(r => r.id === id);
}

// Derive standard uppercase shortcode for product lot numbering
export function deriveProductLotCode(product?: Product | null, customOther?: string | null): string {
  if (!product && !customOther) return 'PROD';
  const nameOrCode = product?.code || customOther || product?.name || 'PROD';
  const upper = nameOrCode.toUpperCase().replace(/[\s\-_]+/g, '_');

  // Exact & substring matches for refinery products
  if (upper.includes('PL_65') || upper.includes('PL65')) return 'PL65';
  if (upper.includes('PL_60') || upper.includes('PL60')) return 'PL60';
  if (upper.includes('PL_56') || upper.includes('PL56')) return 'PL56';
  if (upper.includes('PFAD')) return 'PFAD';
  if (upper.includes('RPMO')) return 'RPMO';
  if (upper.includes('RPKO')) return 'RPKO';
  if (upper.includes('RPKL')) return 'RPKL';
  if (upper.includes('RSTN_S') || upper.includes('RSTN(S)')) return 'RSTNS';
  if (upper.includes('RSTN_H') || upper.includes('RSTN(H)')) return 'RSTNH';
  if (upper.includes('RSTN')) return 'RSTN';
  if (upper.includes('CHOCOHI_357') || upper.includes('CHOC_357') || upper.includes('CHOCOHI 357') || upper.includes('357A')) return 'CHOC357';
  if (upper.includes('CHOCOHI_369') || upper.includes('CHOC_369') || upper.includes('CHOCOHI 369') || upper.includes('369A')) return 'CHOC369';
  if (upper.includes('DAISY')) return 'DAISY';
  if (upper.includes('NATUREL_LITE') || upper.includes('NATL')) return 'NATL';
  if (upper.includes('NATUREL_OLIVE') || upper.includes('NATO')) return 'NATO';
  if (upper.includes('PASTRIFET') || upper.includes('PASTRI')) return 'PASTRI';
  if (upper.includes('SHORTENING') || upper.includes('SHORT')) return 'SHORT';
  if (upper.includes('FARM_COW') || upper.includes('FCOW')) return 'FCOW';
  if (upper.includes('FLUSH')) return 'FLUSH';
  if (upper.includes('SPLASH')) return 'SPLASH';
  if (upper.includes('PALM_FAT') || upper.includes('PFAT')) return 'PFAT';
  if (upper.includes('RBDPO') || upper.includes('RBD_PALM_OIL')) return 'RBDPO';
  if (upper.includes('RBDPOL') || upper.includes('RBD_PALM_OLEIN')) return 'RBDPOL';
  if (upper.includes('RBDPS') || upper.includes('RBD_PALM_STEARIN')) return 'RBDPS';

  // Fallback: extract first 6 alphanumeric letters
  const cleaned = upper.replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 6) || 'PROD';
}

// Automatically generate next sequential Lot number based on product & date (e.g. LOT-PL65-2609-04)
export function generateNextLotNo(productId?: string, sampleDate?: string, customOther?: string): string {
  const products = getProducts();
  const prod = products.find(p => p.id === productId);
  const code = deriveProductLotCode(prod, customOther);

  // Extract YYMM from sampleDate (e.g. '2026-09-22' -> '2609')
  const dateStr = sampleDate || new Date().toISOString().split('T')[0];
  const parts = dateStr.split('-');
  const yymm = parts.length >= 2 
    ? `${parts[0].slice(-2)}${parts[1].padStart(2, '0')}`
    : '2609';

  const prefix = `LOT-${code}-${yymm}-`;

  // Scan through existing local and synced reports to find highest sequence
  const allReports = getSampleReports();
  let maxSeq = 0;

  allReports.forEach(r => {
    if (r.lot_no && r.lot_no.startsWith(prefix)) {
      const rest = r.lot_no.substring(prefix.length);
      const numMatch = rest.match(/^(\d+)/);
      if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        if (!isNaN(n) && n > maxSeq) {
          maxSeq = n;
        }
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${nextSeq}`;
}

// Background Synchronization of QC Decision to Supabase qc_decisions table
export async function syncQCDecisionToSupabase(decision: QCDecision): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client unavailable' };
  try {
    const payload: any = {
      id: decision.id || makeDecisionUuid(),
      report_id: decision.report_id,
      decision: decision.decision,
      reason_id: decision.reason_id || null,
      reason_detail: decision.reason_detail || null,
      failed_parameters: Array.isArray(decision.failed_parameters) ? decision.failed_parameters : [],
      disposition: decision.disposition || null,
      decided_by: decision.decided_by || null,
      decided_at: decision.decided_at || new Date().toISOString(),
    };

    const { error } = await supabase
      .from('qc_decisions')
      .upsert(payload, { onConflict: 'report_id' });

    if (error) {
      console.warn('[Supabase Sync] Decision upsert warning:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Decision sync error:', err);
    return { success: false, error: err?.message };
  }
}

// Background Synchronization of Sample Report and Lab Results to Supabase Database
export async function syncSampleReportToSupabase(report: SampleReport): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    // 1. Resolve UUIDs from Supabase reference tables
    const [prodsRes, paramsRes, tanksRes, spsRes] = await Promise.all([
      supabase.from('products').select('id, code, name'),
      supabase.from('parameters').select('id, code, name'),
      supabase.from('tanks').select('id, code'),
      supabase.from('sampling_points').select('id, name')
    ]);

    const sbProducts = prodsRes.data || [];
    const sbParams = paramsRes.data || [];
    const sbTanks = tanksRes.data || [];
    const sbSps = spsRes.data || [];

    // Match Product in Supabase
    let sbProductId: string | null = null;
    let sbProductOther: string | null = report.product_other || null;

    if (report.product_id && report.product_id !== 'others') {
      const localProd = getProducts().find(p => p.id === report.product_id);
      const matched = sbProducts.find(p => 
        (localProd && p.code === localProd.code) || 
        (localProd && p.name.toLowerCase() === localProd.name.toLowerCase()) ||
        (report.product_name && p.name.toLowerCase() === report.product_name.toLowerCase())
      );
      if (matched) {
        sbProductId = matched.id;
      } else {
        sbProductOther = report.product_name || 'Others';
      }
    } else {
      sbProductOther = report.product_other || report.product_name || 'Others';
    }

    // Match Tank UUIDs
    let sbFeedTankId: string | null = null;
    let sbDiscTankId: string | null = null;
    if (report.feed_tank_code) {
      const match = sbTanks.find(t => t.code === report.feed_tank_code);
      if (match) sbFeedTankId = match.id;
    }
    if (report.discharge_tank_code) {
      const match = sbTanks.find(t => t.code === report.discharge_tank_code);
      if (match) sbDiscTankId = match.id;
    }

    // Match Sampling Point UUID
    let sbSpId: string | null = null;
    if (report.sampling_point_name) {
      const match = sbSps.find(s => s.name === report.sampling_point_name);
      if (match) sbSpId = match.id;
    }

    const plantId = INITIAL_PLANT.id || '11111111-1111-1111-1111-111111111111';

    let formattedTime = report.time_check || '08:00:00';
    if (formattedTime.length === 5) formattedTime += ':00';

    const dbReportPayload: any = {
      id: report.id || makeSampleReportUuid(),
      plant_id: plantId,
      report_no: report.report_no,
      sample_date: report.sample_date,
      time_check: formattedTime,
      lot_no: report.lot_no,
      product_id: sbProductId,
      product_other: sbProductOther,
      feed_tank_id: sbFeedTankId,
      discharge_tank_id: sbDiscTankId,
      crystallizer_no: report.crystallizer_no || null,
      batch_no: report.batch_no || null,
      sampling_point_id: sbSpId,
      submitted_by_name: report.submitted_by_name || 'QC Laboratory',
      remark_flushing: Boolean(report.remark_flushing),
      remark_cooling: Boolean(report.remark_cooling),
      remark_pushover: Boolean(report.remark_pushover),
      remarks: report.remarks || null,
      status: report.status || 'draft',
    };

    const { data: upsertedReport, error: repErr } = await supabase
      .from('sample_reports')
      .upsert(dbReportPayload, { onConflict: 'report_no' })
      .select('id')
      .single();

    if (repErr) {
      console.warn('[Supabase Sync] Report upsert warning:', repErr);
      return { success: false, error: repErr.message };
    }

    const sbReportUuid = upsertedReport?.id || report.id;
    if (sbReportUuid && Array.isArray(report.results) && report.results.length > 0) {
      const resultsToUpsert: any[] = [];
      let rIdx = 1;
      report.results.forEach(res => {
        const matchedParam = sbParams.find(p => p.code === res.parameter_code);
        if (matchedParam) {
          resultsToUpsert.push({
            id: res.id || makeSampleResultUuid(sbReportUuid, rIdx++),
            report_id: sbReportUuid,
            parameter_id: matchedParam.id,
            series_key: res.series_key != null ? Number(res.series_key) : null,
            requested: res.requested !== false,
            value_numeric: res.value_numeric != null ? Number(res.value_numeric) : null,
            value_text: res.value_text || null,
            in_spec: res.in_spec != null ? res.in_spec : null,
            entered_by: res.entered_by || null,
          });
        }
      });

      if (resultsToUpsert.length > 0) {
        const { error: resultsErr } = await supabase
          .from('sample_results')
          .upsert(resultsToUpsert, { onConflict: 'report_id,parameter_id,series_key' });
        if (resultsErr) {
          console.warn('[Supabase Sync] Results upsert warning:', resultsErr);
        }
      }
    }

    // If report has an attached QC decision, sync to qc_decisions table as well
    if (sbReportUuid && report.decision) {
      syncQCDecisionToSupabase({ ...report.decision, report_id: sbReportUuid }).catch(decErr => {
        console.warn('[Supabase Sync] QC Decision auto-sync warning:', decErr);
      });
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Error syncing sample report to Supabase:', err);
    return { success: false, error: err?.message || 'Sync failed' };
  }
}

// Fetch live sample reports from Supabase and synchronize with local storage
export async function syncSampleReportsFromSupabase(): Promise<{ success: boolean; count: number }> {
  if (!supabase) return { success: false, count: 0 };
  try {
    const { data: remoteReports, error: repErr } = await supabase
      .from('sample_reports')
      .select(`
        *,
        product:products(id, code, name),
        feed_tank:tanks!feed_tank_id(id, code),
        discharge_tank:tanks!discharge_tank_id(id, code),
        sampling_point:sampling_points(id, name),
        decisions:qc_decisions(*),
        results:sample_results(
          id,
          parameter_id,
          series_key,
          requested,
          value_numeric,
          value_text,
          in_spec,
          entered_by,
          parameter:parameters(id, code, name, unit)
        )
      `)
      .order('sample_date', { ascending: false });

    if (repErr || !Array.isArray(remoteReports) || remoteReports.length === 0) {
      return { success: false, count: 0 };
    }

    const currentReports = getSampleReports();
    const mergedReports: SampleReport[] = [...currentReports];

    remoteReports.forEach((sbRep: any) => {
      const existingIdx = mergedReports.findIndex(r => r.report_no === sbRep.report_no);
      
      const mappedResults: SampleResult[] = Array.isArray(sbRep.results) ? sbRep.results.map((r: any) => ({
        id: r.id,
        report_id: sbRep.id,
        parameter_id: r.parameter?.id || r.parameter_id,
        parameter_code: r.parameter?.code || '',
        parameter_name: r.parameter?.name || '',
        unit: r.parameter?.unit || null,
        series_key: r.series_key != null ? Number(r.series_key) : null,
        requested: r.requested !== false,
        value_numeric: r.value_numeric,
        value_text: r.value_text,
        in_spec: r.in_spec,
      })) : [];

      const sbDec = Array.isArray(sbRep.decisions) && sbRep.decisions.length > 0 ? sbRep.decisions[0] : sbRep.decisions;
      let mappedDecision: QCDecision | undefined = undefined;
      if (sbDec) {
        const reasonObj = getRejectionReasons().find(r => r.id === sbDec.reason_id);
        mappedDecision = {
          id: sbDec.id,
          report_id: sbRep.id,
          decision: sbDec.decision,
          reason_id: sbDec.reason_id,
          reason_label: reasonObj?.label,
          reason_detail: sbDec.reason_detail,
          failed_parameters: sbDec.failed_parameters,
          disposition: sbDec.disposition,
          decided_by: sbDec.decided_by,
          decided_by_name: getProfiles().find(p => p.id === sbDec.decided_by)?.full_name || sbDec.decided_by,
          decided_at: sbDec.decided_at,
        };
      }

      const mappedReport: SampleReport = {
        id: sbRep.id,
        plant_id: sbRep.plant_id,
        report_no: sbRep.report_no,
        sample_date: sbRep.sample_date,
        time_check: (sbRep.time_check || '').slice(0, 5) || '08:00',
        lot_no: sbRep.lot_no,
        product_id: sbRep.product_id,
        product_name: sbRep.product?.name || sbRep.product_other || 'Others',
        product_other: sbRep.product_other,
        feed_tank_id: sbRep.feed_tank_id,
        feed_tank_code: sbRep.feed_tank?.code,
        discharge_tank_id: sbRep.discharge_tank_id,
        discharge_tank_code: sbRep.discharge_tank?.code,
        crystallizer_no: sbRep.crystallizer_no,
        batch_no: sbRep.batch_no,
        sampling_point_id: sbRep.sampling_point_id,
        sampling_point_name: sbRep.sampling_point?.name,
        submitted_by: sbRep.submitted_by,
        submitted_by_name: sbRep.submitted_by_name || 'Operator',
        remark_flushing: Boolean(sbRep.remark_flushing),
        remark_cooling: Boolean(sbRep.remark_cooling),
        remark_pushover: Boolean(sbRep.remark_pushover),
        remarks: sbRep.remarks,
        status: sbRep.status as any,
        created_by: sbRep.created_by || 'system',
        created_at: sbRep.created_at || new Date().toISOString(),
        results: mappedResults.length > 0 ? mappedResults : undefined,
        decision: mappedDecision,
      };

      if (existingIdx >= 0) {
        mergedReports[existingIdx] = { ...mergedReports[existingIdx], ...mappedReport };
      } else {
        mergedReports.unshift(mappedReport);
      }
    });

    memoryReports = mergedReports;
    setStored(STORAGE_KEYS.REPORTS, mergedReports);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: mergedReports }));
    }

    return { success: true, count: remoteReports.length };
  } catch (syncErr) {
    console.warn('[Supabase Sync] Fetch error:', syncErr);
    return { success: false, count: 0 };
  }
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
  selected_temperatures?: number[];
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

  const reportSeq = Math.floor(1000 + Math.random() * 9000);
  const reportId = makeSampleReportUuid(reportSeq);
  const reportNo = `SAR-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;

  // Prepare requested parameter results
  const results: SampleResult[] = [];
  let resSeq = 1;
  data.selected_parameter_ids.forEach(pId => {
    const param = params.find(p => p.id === pId);
    if (!param) return;
    if (param.is_series && param.series_values) {
      const activeTemps = data.selected_temperatures && data.selected_temperatures.length > 0
        ? param.series_values.filter(t => data.selected_temperatures!.includes(t))
        : param.series_values;
      activeTemps.forEach(temp => {
        results.push({
          id: makeSampleResultUuid(reportSeq, resSeq++),
          report_id: reportId,
          parameter_id: param.id,
          parameter_code: param.code,
          parameter_name: `${param.name} ${temp}°C`,
          unit: param.unit,
          series_key: temp,
          requested: true,
        });
      });
    } else {
      results.push({
        id: makeSampleResultUuid(reportSeq, resSeq++),
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

  // Auto-sync new sample report & parameter requests to Supabase
  syncSampleReportToSupabase(newReport).catch(err => {
    console.warn('[Supabase Sync] Auto-sync failed on createSampleReport:', err);
  });

  return { success: true, report: newReport };
}

// Enter QC Results
export function updateSampleResults(
  reportId: string, 
  resultsData: { 
    resultId: string; 
    parameter_id?: string;
    parameter_code?: string;
    parameter_name?: string;
    unit?: string | null;
    series_key?: number | null;
    value_numeric?: number | null; 
    value_text?: string | null; 
    requested?: boolean; 
  }[],
  remarksData?: {
    remark_flushing?: boolean;
    remark_cooling?: boolean;
    remark_pushover?: boolean;
    remarks?: string | null;
    sampling_point_id?: string | null;
    sampling_point_name?: string;
    crystallizer_no?: string | null;
    batch_no?: string | null;
  }
): { success: boolean; error?: string } {
  const reports = getSampleReports();
  const report = reports.find(r => r.id === reportId);
  if (!report) return { success: false, error: 'Report not found.' };
  if (!report.results) report.results = [];

  const profile = getCurrentProfile();
  const specs = getProductSpecs(report.product_id || undefined);

  // Update remarks and operational condition checkboxes if provided
  if (remarksData) {
    if (remarksData.remark_flushing !== undefined) report.remark_flushing = remarksData.remark_flushing;
    if (remarksData.remark_cooling !== undefined) report.remark_cooling = remarksData.remark_cooling;
    if (remarksData.remark_pushover !== undefined) report.remark_pushover = remarksData.remark_pushover;
    if (remarksData.remarks !== undefined) report.remarks = remarksData.remarks;
    if (remarksData.sampling_point_id !== undefined) report.sampling_point_id = remarksData.sampling_point_id;
    if (remarksData.sampling_point_name !== undefined) report.sampling_point_name = remarksData.sampling_point_name;
    if (remarksData.crystallizer_no !== undefined) report.crystallizer_no = remarksData.crystallizer_no;
    if (remarksData.batch_no !== undefined) report.batch_no = remarksData.batch_no;
  }

  resultsData.forEach(item => {
    let res = report.results!.find(r => r.id === item.resultId);
    if (!res) {
      if (!item.parameter_id) return;
      res = {
        id: item.resultId,
        report_id: reportId,
        parameter_id: item.parameter_id,
        parameter_code: item.parameter_code || '',
        parameter_name: item.parameter_name || '',
        unit: item.unit ?? null,
        series_key: item.series_key ?? null,
        requested: item.requested !== false,
      };
      report.results!.push(res);
    }

    if (item.requested !== undefined) {
      res.requested = item.requested;
    }
    res.value_numeric = item.value_numeric;
    res.value_text = item.value_text;
    res.entered_by = profile.id;
    res.entered_by_name = profile.full_name;
    res.entered_at = new Date().toISOString();

    // If unticked/not requested, do not validate against spec
    if (res.requested === false) {
      res.in_spec = null;
      return;
    }

    // Check spec
    const spec = specs.find(s => s.parameter_id === res!.parameter_id && (res!.series_key != null ? Number(s.series_key) === Number(res!.series_key) : s.series_key == null));
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: reports }));
  }

  addAuditLog('sample_results', reportId, 'update', null, { status: 'results_entered' });

  // Auto-sync updated report and lab results to Supabase
  syncSampleReportToSupabase(report).catch(err => {
    console.warn('[Supabase Sync] Auto-sync failed on updateSampleResults:', err);
  });

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
    id: makeDecisionUuid(),
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: reports }));
  }

  addAuditLog('qc_decisions', decisionObj.id, 'insert', null, decisionObj);

  // Auto-sync decision status to Supabase
  syncSampleReportToSupabase(report).catch(err => {
    console.warn('[Supabase Sync] Auto-sync failed on submitQCDecision:', err);
  });
  syncQCDecisionToSupabase(decisionObj).catch(err => {
    console.warn('[Supabase Sync] Decision direct sync warning on submitQCDecision:', err);
  });

  return { success: true };
}

// 5. Audit Log
export function getAuditLogs(): AuditLogEntry[] {
  return getStored<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, memoryAuditLogs);
}

// Sync single audit log entry to Supabase audit_log table in background
export async function syncAuditLogToSupabase(entry: AuditLogEntry): Promise<void> {
  if (!supabase) return;
  try {
    const payload = {
      table_name: entry.table_name,
      action: entry.action,
      actor: entry.actor_name,
      old_row: entry.old_row || null,
      new_row: entry.new_row || null,
      occurred_at: entry.occurred_at,
    };
    await supabase.from('audit_log').insert(payload);
  } catch (err) {
    console.warn('[Supabase Sync] Audit log insert warning:', err);
  }
}

// Fetch live database-level audit logs from Supabase and synchronize with local storage
export async function syncAuditLogsFromSupabase(): Promise<{ success: boolean; count: number }> {
  if (!supabase) return { success: false, count: 0 };
  try {
    const { data: remoteLogs, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(300);

    if (error || !remoteLogs) return { success: false, count: 0 };

    const localLogs = getAuditLogs();
    const map = new Map<string, AuditLogEntry>();

    // Index existing local logs
    localLogs.forEach(l => map.set(String(l.id), l));

    // Overlay Supabase logs
    remoteLogs.forEach((row: any) => {
      const key = `sb_${row.id}`;
      const actorName = row.actor 
        || row.new_row?.submitted_by_name 
        || row.new_row?.recorded_by_name 
        || row.new_row?.verified_by_name 
        || 'System / DB Trigger';

      map.set(key, {
        id: key,
        table_name: row.table_name,
        record_id: row.record_id,
        action: (row.action || 'insert') as any,
        actor_name: actorName,
        old_row: row.old_row,
        new_row: row.new_row,
        occurred_at: row.occurred_at,
      });
    });

    const merged = Array.from(map.values()).sort((a, b) => 
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );

    setStored(STORAGE_KEYS.AUDIT_LOGS, merged);
    memoryAuditLogs = merged;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refinery_audit_updated', { detail: merged }));
    }

    return { success: true, count: merged.length };
  } catch (err) {
    console.warn('[Supabase Sync] Audit logs fetch error:', err);
    return { success: false, count: 0 };
  }
}

// Sync complete Process Sheet & Hourly Entries to Supabase
export async function syncProcessSheetToSupabase(sheet: ProcessSheet): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase client unavailable' };
  try {
    const plantId = sheet.plant_id || INITIAL_PLANT.id || '11111111-1111-1111-1111-111111111111';

    // 1. Upsert process sheet
    const sheetPayload: any = {
      id: sheet.id || makeSheetUuid(sheet.shift_date),
      plant_id: plantId,
      shift_date: sheet.shift_date,
      stripping_steam_pct: sheet.stripping_steam_pct ?? 1.5,
      set_steam_supply_bar: sheet.set_steam_supply_bar ?? 3.0,
      status: sheet.status || 'open',
    };

    const { data: upsertedSheet, error: sheetErr } = await supabase
      .from('process_sheets')
      .upsert(sheetPayload, { onConflict: 'plant_id,shift_date' })
      .select('id')
      .single();

    if (sheetErr) {
      console.warn('[Supabase Sync] Process sheet upsert warning:', sheetErr);
      return { success: false, error: sheetErr.message };
    }

    const sbSheetId = upsertedSheet?.id || sheet.id;
    if (sbSheetId && Array.isArray(sheet.entries) && sheet.entries.length > 0) {
      // Fetch products to match product_id UUID
      const { data: sbProds } = await supabase.from('products').select('id, code, name');
      const productsList = sbProds || [];

      const entriesPayload: any[] = [];
      sheet.entries.forEach(e => {
        let sbProdId: string | null = null;
        if (e.product_id) {
          const match = productsList.find(p => p.id === e.product_id || p.name === e.product_name);
          if (match) sbProdId = match.id;
        }

        const slotLabel = e.slot_label || String(((e.slot_index + 7) % 24) * 100).padStart(4, '0');
        const hour = slotLabel.slice(0, 2);
        const slotStart = e.slot_start || `${sheet.shift_date}T${hour}:00:00+08:00`;

        // Note: slot_label is GENERATED ALWAYS STORED in PostgreSQL, omit from insert payload
        entriesPayload.push({
          id: e.id || makeEntryUuid(sheet.shift_date, e.slot_index),
          sheet_id: sbSheetId,
          slot_index: e.slot_index,
          slot_start: slotStart,
          product_id: sbProdId,
          oil_feed_rate_litre: e.oil_feed_rate_litre != null ? Number(e.oil_feed_rate_litre) : null,
          deod_time_set_hr: e.deod_time_set_hr != null ? Number(e.deod_time_set_hr) : null,
          vacuum_torr: e.vacuum_torr != null ? Number(e.vacuum_torr) : null,
          tray_1_temp_c: e.tray_1_temp_c != null ? Number(e.tray_1_temp_c) : null,
          tray_2_temp_c: e.tray_2_temp_c != null ? Number(e.tray_2_temp_c) : null,
          tray_3_temp_c: e.tray_3_temp_c != null ? Number(e.tray_3_temp_c) : null,
          tray_4_temp_c: e.tray_4_temp_c != null ? Number(e.tray_4_temp_c) : null,
          tray_5_temp_c: e.tray_5_temp_c != null ? Number(e.tray_5_temp_c) : null,
          tray_6_temp_c: e.tray_6_temp_c != null ? Number(e.tray_6_temp_c) : null,
          tray_7_temp_c: e.tray_7_temp_c != null ? Number(e.tray_7_temp_c) : null,
          bc101_water_in_c: e.bc101_water_in_c != null ? Number(e.bc101_water_in_c) : null,
          bc101_water_out_c: e.bc101_water_out_c != null ? Number(e.bc101_water_out_c) : null,
          chill_water_in_c: e.chill_water_in_c != null ? Number(e.chill_water_in_c) : null,
          chill_water_out_c: e.chill_water_out_c != null ? Number(e.chill_water_out_c) : null,
          booster_press_bar: e.booster_press_bar != null ? Number(e.booster_press_bar) : null,
          ejector_press_bar: e.ejector_press_bar != null ? Number(e.ejector_press_bar) : null,
          strip_steam_pct_of_oil: e.strip_steam_pct_of_oil != null ? Number(e.strip_steam_pct_of_oil) : null,
          strip_steam_flow_kghr: e.strip_steam_flow_kghr != null ? Number(e.strip_steam_flow_kghr) : null,
          fp101a_press_bar: e.fp101a_press_bar != null ? Number(e.fp101a_press_bar) : null,
          fp101b_press_bar: e.fp101b_press_bar != null ? Number(e.fp101b_press_bar) : null,
          remarks: e.remarks || null,
          no_production_reason: e.no_production_reason || null,
          has_deviation: Boolean(e.has_deviation),
          recorded_by: e.recorded_by || null,
          recorded_at: e.recorded_at || null,
        });
      });

      if (entriesPayload.length > 0) {
        const { error: entriesErr } = await supabase
          .from('process_entries')
          .upsert(entriesPayload, { onConflict: 'sheet_id,slot_index' });
        if (entriesErr) {
          console.warn('[Supabase Sync] Process entries upsert warning:', entriesErr);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase Sync] Process sheet sync error:', err);
    return { success: false, error: err?.message };
  }
}

// Fetch all live 24-hour process sheets and hourly entries from Supabase
export async function syncProcessSheetsFromSupabase(): Promise<{ success: boolean; count: number }> {
  if (!supabase) return { success: false, count: 0 };
  try {
    const { data: sheets, error } = await supabase
      .from('process_sheets')
      .select(`
        *,
        entries:process_entries(
          *,
          product:products(id, code, name),
          deviations(*)
        )
      `)
      .order('shift_date', { ascending: false });

    if (error || !Array.isArray(sheets) || sheets.length === 0) {
      return { success: false, count: 0 };
    }

    const allSheets = getAllProcessSheets();

    sheets.forEach((s: any) => {
      const shiftDate = s.shift_date;
      const existing = allSheets[shiftDate] || getProcessSheetByDate(shiftDate);

      const mappedEntries: ProcessEntry[] = (s.entries || []).map((e: any) => {
        const slotLabel = e.slot_label || String(((e.slot_index + 7) % 24) * 100).padStart(4, '0');
        const prodName = e.product?.name || (e.product_id ? (getProducts().find(p => p.id === e.product_id)?.name) : null);
        return {
          id: e.id || makeEntryUuid(shiftDate, e.slot_index),
          sheet_id: s.id,
          slot_index: e.slot_index,
          slot_label: slotLabel,
          slot_start: e.slot_start,
          product_id: e.product_id,
          product_name: prodName,
          oil_feed_rate_litre: e.oil_feed_rate_litre,
          deod_time_set_hr: e.deod_time_set_hr,
          vacuum_torr: e.vacuum_torr,
          tray_1_temp_c: e.tray_1_temp_c,
          tray_2_temp_c: e.tray_2_temp_c,
          tray_3_temp_c: e.tray_3_temp_c,
          tray_4_temp_c: e.tray_4_temp_c,
          tray_5_temp_c: e.tray_5_temp_c,
          tray_6_temp_c: e.tray_6_temp_c,
          tray_7_temp_c: e.tray_7_temp_c,
          bc101_water_in_c: e.bc101_water_in_c,
          bc101_water_out_c: e.bc101_water_out_c,
          chill_water_in_c: e.chill_water_in_c,
          chill_water_out_c: e.chill_water_out_c,
          booster_press_bar: e.booster_press_bar,
          ejector_press_bar: e.ejector_press_bar,
          strip_steam_pct_of_oil: e.strip_steam_pct_of_oil,
          strip_steam_flow_kghr: e.strip_steam_flow_kghr,
          fp101a_press_bar: e.fp101a_press_bar,
          fp101b_press_bar: e.fp101b_press_bar,
          remarks: e.remarks,
          no_production_reason: e.no_production_reason,
          has_deviation: Boolean(e.has_deviation),
          recorded_by: e.recorded_by,
          recorded_at: e.recorded_at,
        };
      });

      mappedEntries.sort((a, b) => a.slot_index - b.slot_index);

      allSheets[shiftDate] = {
        id: s.id,
        plant_id: s.plant_id || INITIAL_PLANT.id,
        shift_date: shiftDate,
        stripping_steam_pct: s.stripping_steam_pct,
        set_steam_supply_bar: s.set_steam_supply_bar,
        status: s.status,
        opened_by: s.opened_by || existing.opened_by || 'OP-1042',
        opened_by_name: s.opened_by_name || existing.opened_by_name || 'Ahmad Razak (Lead Operator)',
        opened_at: s.opened_at || existing.opened_at || `${shiftDate}T06:55:00+08:00`,
        verified_by: s.verified_by || existing.verified_by,
        verified_by_name: s.verified_by_name || existing.verified_by_name,
        verified_at: s.verified_at || existing.verified_at,
        entries: mappedEntries,
      };

      if (shiftDate === getRealtimeShiftDate()) {
        setStored(STORAGE_KEYS.SHEET, allSheets[shiftDate]);
        memorySheet = allSheets[shiftDate];
      }
    });

    setStored(STORAGE_KEYS.ALL_SHEETS, allSheets);
    memoryAllSheets = allSheets;

    const today = new Date().toISOString().split('T')[0];
    if (allSheets[today]) {
      setStored(STORAGE_KEYS.SHEET, allSheets[today]);
      memorySheet = allSheets[today];
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refinery_sheet_updated', { detail: allSheets }));
    }

    return { success: true, count: sheets.length };
  } catch (err) {
    console.warn('[Supabase Sync] Process sheets fetch error:', err);
    return { success: false, count: 0 };
  }
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refinery_audit_updated', { detail: logs }));
  }

  // Asynchronously sync to Supabase audit_log table
  if (supabase) {
    syncAuditLogToSupabase(newEntry).catch(() => {});
  }
}

// ==============================================================================
// 6. Data Retention & Auto-Archive / Prune Policy (Industrial Storage Protection)
// ==============================================================================

export interface StorageMetrics {
  totalReports: number;
  decidedReports: number;
  activeSheetEntries: number;
  deviationsCount: number;
  auditLogsCount: number;
  profilesCount: number;
  estimatedStorageUsedKB: number;
  supabaseLimitMB: number;
  safeLimitPercentage: number;
}

export function getDatabaseStorageMetrics(): StorageMetrics {
  const reports = getSampleReports();
  const sheet = getActiveProcessSheet();
  const deviations = getDeviations();
  const auditLogs = getAuditLogs();
  const profiles = getProfiles();

  const totalReports = reports.length;
  const decidedReports = reports.filter(r => r.status === 'decided').length;
  const activeSheetEntries = sheet.entries?.length || 0;
  const deviationsCount = deviations.length;
  const auditLogsCount = auditLogs.length;
  const profilesCount = profiles.length;

  // Approximate storage calculation:
  // Each report ~2 KB, each entry ~0.8 KB, each deviation ~0.5 KB, each audit ~0.5 KB, base system ~28000 KB (28 MB)
  const dynamicKB = (totalReports * 2.0) + (activeSheetEntries * 0.8) + (deviationsCount * 0.5) + (auditLogsCount * 0.5) + (profilesCount * 0.5);
  const totalKB = Math.round(28672 + dynamicKB); // 28 MB base catalog in KB

  const supabaseLimitMB = 500;
  const safeLimitPercentage = Number(((totalKB / (supabaseLimitMB * 1024)) * 100).toFixed(2));

  return {
    totalReports,
    decidedReports,
    activeSheetEntries,
    deviationsCount,
    auditLogsCount,
    profilesCount,
    estimatedStorageUsedKB: totalKB,
    supabaseLimitMB,
    safeLimitPercentage,
  };
}

export function getArchivePreviewCounts(cutoffDate: string, isAll?: boolean): {
  reports: number;
  deviations: number;
  auditLogs: number;
  sheets: number;
  total: number;
} {
  const reports = getSampleReports();
  const deviations = getDeviations();
  const auditLogs = getAuditLogs();
  const allSheets = getAllProcessSheets();

  if (isAll || cutoffDate === 'all' || cutoffDate === 'ALL' || cutoffDate === 'FULL') {
    const sLen = Object.values(allSheets).length;
    return {
      reports: reports.length,
      deviations: deviations.length,
      auditLogs: auditLogs.length,
      sheets: sLen,
      total: reports.length + deviations.length + auditLogs.length + sLen,
    };
  }

  const rCount = reports.filter(r => r.sample_date <= cutoffDate && (r.status === 'decided' || r.sample_date < cutoffDate)).length;
  const dCount = deviations.filter(d => (d.created_at || '').slice(0, 10) <= cutoffDate).length;
  const aCount = auditLogs.filter(a => (a.occurred_at || '').slice(0, 10) <= cutoffDate).length;
  const sCount = Object.values(allSheets).filter(s => s.shift_date <= cutoffDate).length;

  return {
    reports: rCount,
    deviations: dCount,
    auditLogs: aCount,
    sheets: sCount,
    total: rCount + dCount + aCount + sCount,
  };
}

export function generateFullArchivePackage(
  cutoffDate: string,
  options?: { isFullBackup?: boolean }
): {
  filename: string;
  jsonContent: string;
  csvSummaryContent: string;
  recordsArchivedCount: number;
  counts: {
    reports: number;
    deviations: number;
    auditLogs: number;
    sheets: number;
  };
} {
  const reports = getSampleReports();
  const deviations = getDeviations();
  const auditLogs = getAuditLogs();
  const allSheets = getAllProcessSheets();

  const isAll = options?.isFullBackup || cutoffDate === 'all' || cutoffDate === 'ALL' || cutoffDate === 'FULL';

  const archivedReports = isAll
    ? reports
    : reports.filter(r => r.sample_date <= cutoffDate && (r.status === 'decided' || r.sample_date < cutoffDate));
  const archivedDeviations = isAll
    ? deviations
    : deviations.filter(d => (d.created_at || '').slice(0, 10) <= cutoffDate);
  const archivedAuditLogs = isAll
    ? auditLogs
    : auditLogs.filter(a => (a.occurred_at || '').slice(0, 10) <= cutoffDate);
  const archivedSheets = isAll
    ? Object.values(allSheets)
    : Object.values(allSheets).filter(s => s.shift_date <= cutoffDate);

  const archiveData = {
    exported_at: new Date().toISOString(),
    plant_id: INITIAL_PLANT.id,
    plant_name: INITIAL_PLANT.name,
    cutoff_date: isAll ? 'ALL_RECORDS_UNLIMITED' : cutoffDate,
    mode: isAll ? 'FULL_PLANT_BACKUP' : 'COLD_STORAGE_ARCHIVE',
    description: isAll
      ? 'Refinery Full Plant Backup Package (Complete Historical & Operational Records)'
      : `Refinery Historical Cold Storage Backup (Records on or before ${cutoffDate})`,
    counts: {
      reports: archivedReports.length,
      deviations: archivedDeviations.length,
      auditLogs: archivedAuditLogs.length,
      processSheets: archivedSheets.length,
    },
    sample_reports: archivedReports,
    process_sheets: archivedSheets,
    deviations: archivedDeviations,
    audit_logs: archivedAuditLogs,
  };

  // Build CSV summary with rich columns for Excel inspection
  const csvHeaders = [
    'Report_No',
    'Sample_Date',
    'Time_Check',
    'Lot_No',
    'Product',
    'Feed_Tank',
    'Discharge_Tank',
    'Status',
    'Decision',
    'Reason',
    'Disposition',
    'Decided_By',
    'Decided_At'
  ];
  const csvRows = archivedReports.map(r => [
    r.report_no,
    r.sample_date,
    r.time_check,
    r.lot_no,
    `"${r.product_name}"`,
    r.feed_tank_code || 'N/A',
    r.discharge_tank_code || 'N/A',
    r.status,
    r.decision?.decision || (r.status === 'awaiting_results' ? 'Awaiting Results' : 'Pending'),
    `"${r.decision?.reason_label || r.decision?.reason_detail || 'N/A'}"`,
    r.decision?.disposition || 'N/A',
    `"${r.decision?.decided_by_name || 'N/A'}"`,
    r.decision?.decided_at || 'N/A',
  ].join(','));

  const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

  const totalCount = archivedReports.length + archivedDeviations.length + archivedAuditLogs.length + archivedSheets.length;
  const tag = isAll ? 'Full_Plant_Backup' : `Archive_${cutoffDate}`;
  const filename = `Refinery_${tag}_${Date.now()}`;

  return {
    filename,
    jsonContent: JSON.stringify(archiveData, null, 2),
    csvSummaryContent: csvContent,
    recordsArchivedCount: totalCount,
    counts: {
      reports: archivedReports.length,
      deviations: archivedDeviations.length,
      auditLogs: archivedAuditLogs.length,
      sheets: archivedSheets.length,
    }
  };
}

export async function executePruneRetentionPolicy(
  cutoffDate: string,
  adminPasswordConfirm: string
): Promise<{ success: boolean; message?: string; prunedCounts?: { reports: number; deviations: number; auditLogs: number }; error?: string }> {
  const profile = getCurrentProfile();
  const role = getCurrentRole();

  if (role !== 'admin') {
    return { success: false, error: 'Access Denied: Only the Plant Administrator can execute data retention and pruning.' };
  }

  const expectedPassword = profile.password || 'password123';
  if (!adminPasswordConfirm || adminPasswordConfirm.trim() !== expectedPassword) {
    return { success: false, error: 'Electronic signature verification failed. Incorrect administrator password.' };
  }

  const currentReports = getSampleReports();
  const currentDeviations = getDeviations();
  const currentAuditLogs = getAuditLogs();

  const toKeepReports = currentReports.filter(r => !(r.sample_date < cutoffDate && r.status === 'decided'));
  const toKeepDeviations = currentDeviations.filter(d => !(d.created_at < cutoffDate));
  const toKeepAuditLogs = currentAuditLogs.filter(a => !(a.occurred_at < cutoffDate));

  const prunedReportsCount = currentReports.length - toKeepReports.length;
  const prunedDeviationsCount = currentDeviations.length - toKeepDeviations.length;
  const prunedAuditLogsCount = currentAuditLogs.length - toKeepAuditLogs.length;

  // Update local storage
  setStored(STORAGE_KEYS.REPORTS, toKeepReports);
  memoryReports = toKeepReports;

  setStored(STORAGE_KEYS.DEVIATIONS, toKeepDeviations);
  memoryDeviations = toKeepDeviations;

  setStored(STORAGE_KEYS.AUDIT_LOGS, toKeepAuditLogs);
  memoryAuditLogs = toKeepAuditLogs;

  // Call Supabase Prune API endpoint to clean remote database
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/archive', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-plant-admin-signature': PLANT_ADMIN_SIGNATURE,
        },
        body: JSON.stringify({ cutoffDate })
      });
    } catch (e) {
      console.warn('[Prune API] Failed to reach /api/archive:', e);
    }

    window.dispatchEvent(new CustomEvent('refinery_reports_updated', { detail: toKeepReports }));
  }

  // Record official audit log entry
  addAuditLog(
    'system_maintenance',
    `prune-${Date.now()}`,
    'update',
    {
      action: 'DATA_RETENTION_PRUNE',
      cutoff_date: cutoffDate,
      pruned: { reports: prunedReportsCount, deviations: prunedDeviationsCount, audit_logs: prunedAuditLogsCount }
    },
    {
      executed_by: profile.full_name,
      employee_no: profile.employee_no,
      timestamp: new Date().toISOString()
    }
  );

  return {
    success: true,
    message: `Retention policy successfully executed! Pruned ${prunedReportsCount} sample reports, ${prunedDeviationsCount} deviations, and ${prunedAuditLogsCount} audit logs before ${cutoffDate}.`,
    prunedCounts: {
      reports: prunedReportsCount,
      deviations: prunedDeviationsCount,
      auditLogs: prunedAuditLogsCount,
    }
  };
}
