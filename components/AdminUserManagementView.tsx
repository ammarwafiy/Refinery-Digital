'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  KeyRound, 
  Activity, 
  Layers, 
  FlaskConical, 
  Cpu, 
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  ShieldAlert,
  Trash2,
  HardDrive,
  Download,
  ExternalLink,
  Database,
  Calendar,
  Archive,
  FileSpreadsheet,
  Zap,
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import GliderTabs from './GliderTabs';
import { 
  getProfiles, 
  addProfile, 
  generateNextEmployeeId, 
  getCurrentRole, 
  getCurrentProfile, 
  setCurrentRole,
  setAuthUser,
  toggleProfileActive,
  deleteProfile,
  syncProfilesFromSupabase,
  ROLE_ID_SERIES,
  getDatabaseStorageMetrics,
  generateFullArchivePackage,
  getArchivePreviewCounts,
  executePruneRetentionPolicy,
  StorageMetrics
} from '@/lib/data-service';

export default function AdminUserManagementView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentRole, setCurrentRoleState] = useState<UserRole>('operator');
  const [currentProfile, setCurrentProfileState] = useState<Profile>(getCurrentProfile());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Add User Form State
  const [selectedRole, setSelectedRole] = useState<UserRole>('operator');
  const [fullName, setFullName] = useState('');
  const [customPassword, setCustomPassword] = useState('password123');
  const [autoId, setAutoId] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Just now');

  // Navigation Sub-tab
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'personnel' | 'retention'>('personnel');

  // Retention & Auto-Archive / Prune State
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [retentionPreset, setRetentionPreset] = useState<'all' | 'today' | '30' | '90' | '180' | '365' | 'custom'>('all');
  const [customCutoffDate, setCustomCutoffDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);
  const [downloadedPackageInfo, setDownloadedPackageInfo] = useState<{ filename: string; count: number } | null>(null);
  const [prunePassword, setPrunePassword] = useState('');
  const [isPruning, setIsPruning] = useState(false);
  const [pruneStatusMessage, setPruneStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom Toast & Modal Notification State (Replaces native browser alert, confirm, prompt)
  const [toasts, setToasts] = useState<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
  }[]>([]);

  const showToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  interface ConfirmModalState {
    isOpen: boolean;
    type: 'danger' | 'warning' | 'info';
    title: string;
    badgeText?: string;
    description: string;
    details?: {
      name?: string;
      employeeNo?: string;
      extraNote?: string;
    };
    confirmButtonText: string;
    confirmButtonVariant?: 'danger' | 'warning' | 'primary';
    requiresPassword?: boolean;
    passwordPlaceholder?: string;
    defaultPassword?: string;
    onConfirm: (password?: string) => Promise<void> | void;
  }

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [modalPasswordInput, setModalPasswordInput] = useState('');
  const [modalIsSubmitting, setModalIsSubmitting] = useState(false);

  const refreshStorage = () => {
    try {
      const metrics = getDatabaseStorageMetrics();
      setStorageMetrics(metrics);
    } catch (e) {
      console.warn('Failed to calculate storage metrics:', e);
    }
  };

  useEffect(() => {
    refreshData();
    refreshStorage();

    // Trigger background sync with Supabase
    setIsSyncing(true);
    syncProfilesFromSupabase().then(() => {
      refreshData();
      refreshStorage();
      setIsSyncing(false);
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }).catch(() => {
      setIsSyncing(false);
    });

    const handleSyncEvent = () => {
      refreshData();
      refreshStorage();
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    window.addEventListener('refinery_profiles_synced', handleSyncEvent);
    return () => {
      window.removeEventListener('refinery_profiles_synced', handleSyncEvent);
    };
  }, []);

  const refreshData = () => {
    const list = getProfiles();
    setProfiles(list);
    const r = getCurrentRole();
    setCurrentRoleState(r);
    setCurrentProfileState(getCurrentProfile());
    setAutoId(generateNextEmployeeId(selectedRole));
    refreshStorage();
  };

  const getEffectiveCutoffDate = () => {
    if (retentionPreset === 'all') return 'all';
    if (retentionPreset === 'today') return new Date().toISOString().split('T')[0];
    if (retentionPreset === 'custom') return customCutoffDate;
    const days = parseInt(retentionPreset, 10);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const handleDownloadArchive = (forceAll = false) => {
    try {
      const isAll = forceAll || retentionPreset === 'all';
      const cutoff = isAll ? 'all' : getEffectiveCutoffDate();
      const pkg = generateFullArchivePackage(cutoff, { isFullBackup: isAll });

      // Trigger JSON file download (complete structured data)
      const blobJson = new Blob([pkg.jsonContent], { type: 'application/json;charset=utf-8;' });
      const urlJson = URL.createObjectURL(blobJson);
      const aJson = document.createElement('a');
      aJson.href = urlJson;
      aJson.download = `${pkg.filename}.json`;
      document.body.appendChild(aJson);
      aJson.click();
      document.body.removeChild(aJson);
      URL.revokeObjectURL(urlJson);

      // Trigger CSV summary download
      const blobCsv = new Blob([pkg.csvSummaryContent], { type: 'text/csv;charset=utf-8;' });
      const urlCsv = URL.createObjectURL(blobCsv);
      const aCsv = document.createElement('a');
      aCsv.href = urlCsv;
      aCsv.download = `${pkg.filename}_summary.csv`;
      document.body.appendChild(aCsv);
      aCsv.click();
      document.body.removeChild(aCsv);
      URL.revokeObjectURL(urlCsv);

      setHasDownloadedBackup(true);
      setDownloadedPackageInfo({ filename: pkg.filename, count: pkg.recordsArchivedCount });
      setPruneStatusMessage({
        type: 'success',
        text: `✓ Backup downloaded successfully (${pkg.recordsArchivedCount} records packaged). You may now store this file into Google Drive.`
      });
      showToast(
        'success',
        'Backup Downloaded Successfully',
        `${pkg.recordsArchivedCount} records (${pkg.counts.reports} QC Reports, ${pkg.counts.deviations} Deviations, ${pkg.counts.auditLogs} Audit Logs, ${pkg.counts.sheets} Shift Sheets) exported to Excel (.csv) & .json!`
      );
    } catch (err: any) {
      setPruneStatusMessage({
        type: 'error',
        text: `Failed to generate archive package: ${err?.message || 'Unknown error'}`
      });
      showToast('error', 'Download Error', err?.message || 'Failed to generate backup package');
    }
  };

  const handleExecutePrune = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDownloadedBackup) {
      showToast(
        'warning',
        'ISO 9001 Safety Protocol',
        'You must download the cold backup package to your computer or Google Drive prior to executing database pruning.'
      );
      return;
    }

    const cutoff = getEffectiveCutoffDate();
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Database Pruning Authorization',
      badgeText: 'ISO 9001 / HACCP RETENTION',
      description: `Are you sure you want to permanently prune Supabase database records older than ${cutoff}?`,
      details: {
        extraNote: `• Sample reports and deviations before ${cutoff} will be permanently removed from Supabase.\n• Active shift sheets, plant specifications, tank calibrations & staff accounts will NOT be touched.`
      },
      confirmButtonText: 'Confirm & Prune Records',
      confirmButtonVariant: 'danger',
      onConfirm: async () => {
        setIsPruning(true);
        setPruneStatusMessage(null);

        try {
          const res = await executePruneRetentionPolicy(cutoff, prunePassword);
          if (res.success) {
            const successMsg = res.message || 'Database pruning executed successfully!';
            setPruneStatusMessage({
              type: 'success',
              text: successMsg
            });
            showToast('success', 'Prune Completed', successMsg);
            setPrunePassword('');
            setHasDownloadedBackup(false);
            refreshStorage();
            refreshData();
          } else {
            const errorMsg = res.error || 'Pruning rejected. Verification failed.';
            setPruneStatusMessage({
              type: 'error',
              text: errorMsg
            });
            showToast('error', 'Pruning Rejected', errorMsg);
          }
        } catch (err: any) {
          const errorMsg = err?.message || 'An error occurred during database pruning.';
          setPruneStatusMessage({
            type: 'error',
            text: errorMsg
          });
          showToast('error', 'System Error', errorMsg);
        } finally {
          setIsPruning(false);
        }
      }
    });
  };

  const handleOneClickAutoPrune = async () => {
    if (!isAdmin) {
      showToast(
        'error',
        'Access Denied',
        'Only Plant Administrators are authorized to execute data retention policies & pruning.'
      );
      return;
    }

    const cutoff = getEffectiveCutoffDate();
    setModalPasswordInput('password123');
    setConfirmModal({
      isOpen: true,
      type: 'warning',
      title: '1-Click Auto Archive & Prune (Fast Track)',
      badgeText: 'FAST-TRACK MAINTENANCE',
      description: 'The system will download full backups (.json & .csv) to your computer and prune legacy records from Supabase simultaneously.',
      details: {
        extraNote: `Retention cutoff: Records dated before ${cutoff} will be archived & purged automatically.`
      },
      requiresPassword: true,
      defaultPassword: 'password123',
      passwordPlaceholder: 'Enter Administrator Password...',
      confirmButtonText: 'Download & Prune Now',
      confirmButtonVariant: 'warning',
      onConfirm: async (passwordInput?: string) => {
        const pass = passwordInput || 'password123';
        setIsPruning(true);
        setPruneStatusMessage(null);

        try {
          const pkg = generateFullArchivePackage(cutoff);

          // 1. Auto-download JSON
          const blobJson = new Blob([pkg.jsonContent], { type: 'application/json;charset=utf-8;' });
          const urlJson = URL.createObjectURL(blobJson);
          const aJson = document.createElement('a');
          aJson.href = urlJson;
          aJson.download = `${pkg.filename}.json`;
          document.body.appendChild(aJson);
          aJson.click();
          document.body.removeChild(aJson);
          URL.revokeObjectURL(urlJson);

          // 2. Auto-download CSV
          const blobCsv = new Blob([pkg.csvSummaryContent], { type: 'text/csv;charset=utf-8;' });
          const urlCsv = URL.createObjectURL(blobCsv);
          const aCsv = document.createElement('a');
          aCsv.href = urlCsv;
          aCsv.download = `${pkg.filename}_summary.csv`;
          document.body.appendChild(aCsv);
          aCsv.click();
          document.body.removeChild(aCsv);
          URL.revokeObjectURL(urlCsv);

          // 3. Execute prune
          const res = await executePruneRetentionPolicy(cutoff, pass);

          if (res.success) {
            const successMsg = `⚡ 1-Click Auto Archive & Prune Completed! Backup archive (${pkg.recordsArchivedCount} records) downloaded and Supabase database pruned for records before ${cutoff}.`;
            setPruneStatusMessage({
              type: 'success',
              text: successMsg
            });
            showToast('success', 'Archive & Prune Completed', `Backup downloaded & ${pkg.recordsArchivedCount} records pruned.`);
            refreshStorage();
            refreshData();

            // 4. Open Google Drive in new tab
            window.open('https://drive.google.com', '_blank');
          } else {
            const errorMsg = res.error || 'Prune authorization failed. Incorrect administrator password.';
            setPruneStatusMessage({
              type: 'error',
              text: errorMsg
            });
            showToast('error', 'Prune Execution Failed', errorMsg);
          }
        } catch (err: any) {
          const errorMsg = err?.message || 'Error during 1-click execution.';
          setPruneStatusMessage({
            type: 'error',
            text: errorMsg
          });
          showToast('error', 'Error', errorMsg);
        } finally {
          setIsPruning(false);
        }
      }
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const res = await syncProfilesFromSupabase();
      refreshData();
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (res.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `✓ Live Supabase Database Synchronized! Loaded ${res.count} profiles.` 
        });
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: `Sync warning: ${res.error || 'Could not reach Supabase API'}. Showing cached profiles.` 
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error syncing with Supabase.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRoleSelectChange = (role: UserRole) => {
    setSelectedRole(role);
    setAutoId(generateNextEmployeeId(role));
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the employee full name.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const created = await addProfile({
        full_name: fullName.trim(),
        role: selectedRole,
        employee_no: autoId,
        password: customPassword.trim() || 'password123',
      });

      refreshData();
      setFullName('');
      const successMsg = `✓ Staff member ${created.full_name} (${created.employee_no}) registered and synced to Supabase database successfully!`;
      setStatusMessage({ 
        type: 'success', 
        text: successMsg 
      });
      showToast('success', 'Staff Member Registered', successMsg);
      setAutoId(generateNextEmployeeId(selectedRole));
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to register staff member. Please try again.';
      setStatusMessage({ type: 'error', text: errMsg });
      showToast('error', 'Failed to Register Staff', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (employeeNo: string, currentActive: boolean, name: string) => {
    if (employeeNo === currentProfile.employee_no || employeeNo === currentProfile.id) {
      showToast(
        'warning',
        'Action Prohibited',
        'You cannot deactivate your own active session profile.'
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: currentActive ? 'warning' : 'info',
      title: currentActive ? 'Deactivate Staff Account' : 'Reactivate Staff Account',
      badgeText: currentActive ? 'STATUS: UNACTIVE' : 'STATUS: ACTIVE',
      description: currentActive
        ? `Are you sure you want to deactivate this staff account? The user will not be able to log in until reactivated.`
        : `Are you sure you want to reactivate this staff account in the system?`,
      details: {
        name,
        employeeNo,
        extraNote: currentActive
          ? 'Staff cannot log in, but all historical audit trails and signatures are permanently preserved.'
          : 'Staff can now log in again using their employee ID credentials.'
      },
      confirmButtonText: currentActive ? 'Deactivate Staff' : 'Reactivate Staff',
      confirmButtonVariant: currentActive ? 'warning' : 'primary',
      onConfirm: async () => {
        await toggleProfileActive(employeeNo);
        refreshData();
        const msg = `✓ Account status for "${name}" changed to: ${currentActive ? 'UNACTIVE' : 'ACTIVE'} and synchronized to Supabase.`;
        setStatusMessage({
          type: 'success',
          text: msg
        });
        showToast('success', 'Staff Status Updated', msg);
      }
    });
  };

  const handleDeleteUser = async (employeeNo: string, name: string) => {
    if (employeeNo === currentProfile.employee_no || employeeNo === currentProfile.id) {
      showToast(
        'warning',
        'Action Prohibited',
        'You cannot delete your own active Administrator profile.'
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Confirm Staff Account Deletion',
      badgeText: 'PERMANENT DELETION',
      description: `Are you sure you want to delete this staff account from the plant system and Supabase database?`,
      details: {
        name,
        employeeNo,
        extraNote: 'This action is permanent. This staff account will be removed from the system and Supabase and cannot be restored.'
      },
      confirmButtonText: 'Yes, Delete Account',
      confirmButtonVariant: 'danger',
      onConfirm: async () => {
        try {
          await deleteProfile(employeeNo);
          refreshData();
          const msg = `✓ Staff account "${name}" (${employeeNo}) deleted from system & Supabase successfully.`;
          setStatusMessage({
            type: 'success',
            text: msg
          });
          showToast('success', 'Staff Account Deleted', msg);
        } catch {
          const errMsg = `Failed to delete staff account ${name}. Please try again.`;
          setStatusMessage({ type: 'error', text: errMsg });
          showToast('error', 'Deletion Error', errMsg);
        }
      }
    });
  };

  const handleSwitchToAdmin = () => {
    const all = getProfiles();
    const adminUser = all.find(p => p.employee_no === 'ADM001') || all.find(p => p.role === 'admin') || all[0];
    setCurrentRole('admin');
    setAuthUser(adminUser);
    setCurrentRoleState('admin');
    setCurrentProfileState(adminUser);
    const switchMsg = `Session switched to Plant Administrator: ${adminUser.full_name} (${adminUser.employee_no}). Full administrative permissions granted.`;
    setStatusMessage({
      type: 'success',
      text: switchMsg
    });
    showToast('info', 'Sesi Pentadbir Diaktifkan', switchMsg);
  };

  const isAdmin = currentRole === 'admin';

  // Filtered Profiles: prioritize standard profiles
  const filteredProfiles = profiles
    .filter(p => {
      const matchesSearch = 
        p.employee_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      const isStdA = a.employee_no.startsWith('OPR') || a.employee_no.startsWith('SUP') || a.employee_no.startsWith('QCS') || a.employee_no.startsWith('MGR') || a.employee_no.startsWith('ADM') || a.employee_no.startsWith('USR');
      const isStdB = b.employee_no.startsWith('OPR') || b.employee_no.startsWith('SUP') || b.employee_no.startsWith('QCS') || b.employee_no.startsWith('MGR') || b.employee_no.startsWith('ADM') || b.employee_no.startsWith('USR');
      if (isStdA && !isStdB) return -1;
      if (!isStdA && isStdB) return 1;
      return 0;
    });

  // Metrics
  const totalCount = profiles.length;
  const operatorCount = profiles.filter(p => p.role === 'operator').length;
  const supervisorCount = profiles.filter(p => p.role === 'supervisor').length;
  const qcCount = profiles.filter(p => p.role === 'qc_analyst' || p.role === 'qc_manager').length;
  const adminCount = profiles.filter(p => p.role === 'admin').length;

  const roleStyles: Record<UserRole, { bg: string; text: string; border: string }> = {
    operator: { bg: 'bg-emerald-950/50', text: 'text-emerald-400', border: 'border-emerald-800/60' },
    supervisor: { bg: 'bg-amber-950/50', text: 'text-amber-400', border: 'border-amber-800/60' },
    qc_analyst: { bg: 'bg-sky-950/50', text: 'text-sky-400', border: 'border-sky-800/60' },
    qc_manager: { bg: 'bg-cyan-950/50', text: 'text-cyan-300', border: 'border-cyan-700/60' },
    admin: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-700/60' },
    viewer: { bg: 'bg-slate-800/60', text: 'text-slate-400', border: 'border-slate-700/60' },
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <section className="panel head">
        <div>
          <h2>Plant administration and user management</h2>
          <p className="meta">
            Role-based access control, sequential ID generation and the deodorizer personnel directory
          </p>
        </div>
        <div className="stats">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="ghost"
          >
            {isSyncing ? 'Syncing...' : 'Sync Supabase'}
          </button>
          <span className="hint">
            Current user <b style={{ color: 'var(--text)', fontWeight: 500 }}>{currentProfile.full_name} ({currentProfile.employee_no})</b>
          </span>
          <span className="bd r">{currentRole}</span>
        </div>
      </section>

      {/* 2. Admin Section Navigation Sub-Tabs */}
      <div style={{ maxWidth: '520px' }}>
        <GliderTabs
          items={[
            { id: 'personnel', label: 'Personnel and access control' },
            { id: 'retention', label: 'Data retention and prune policy' },
          ]}
          activeId={activeAdminSubTab}
          onChange={(id) => {
            setActiveAdminSubTab(id as 'personnel' | 'retention');
            if (id === 'retention') {
              refreshStorage();
            }
          }}
        />
      </div>

      {activeAdminSubTab === 'personnel' ? (
        <>
          {/* RBAC Warning Banner if not Admin */}
          {!isAdmin && (
            <div className="panel" style={{ borderColor: 'var(--amber)', background: 'rgba(224,160,48,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: '12px' }}>
              <span style={{ color: 'var(--amber)', fontSize: '12px' }}>
                <b>RESTRICTED VIEW MODE:</b> Logged in as <span className="bd a">[{currentRole}]</span>. Staff registration and status modification require Administrator privileges.
              </span>
              <button
                type="button"
                onClick={handleSwitchToAdmin}
                className="ghost"
                style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
              >
                Switch to Admin Profile
              </button>
            </div>
          )}

          {/* Notification Banner */}
          {statusMessage && (
            <div className={`panel ${statusMessage.type === 'error' ? 'al' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
              <span style={{ fontSize: '12px', color: statusMessage.type === 'error' ? 'var(--redt)' : 'var(--green)' }}>
                {statusMessage.text}
              </span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="ghost"
                style={{ padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* KPI Stats Strip */}
          <div className="cards c5">
            <div className="panel">
              <label>Total staff</label>
              <b>{totalCount}</b>
              <p>Registered in plant</p>
            </div>
            <div className="panel">
              <label>Operators</label>
              <b>{operatorCount}</b>
              <p>Series OP-1xxx</p>
            </div>
            <div className="panel">
              <label>Supervisors</label>
              <b>{supervisorCount}</b>
              <p>Series SV-2xxx</p>
            </div>
            <div className="panel">
              <label>QC laboratory</label>
              <b>{qcCount}</b>
              <p>Series QC / QM</p>
            </div>
            <div className="panel">
              <label>Admin & audit</label>
              <b>{adminCount}</b>
              <p>Series AD / AU</p>
            </div>
          </div>

          {/* Main Grid: Add User & Personnel Directory */}
          <div className="two" style={{ gridTemplateColumns: '360px minmax(0, 1fr)' }}>
            {/* Left Column: Register Staff */}
            <section className="panel">
              <div className="ph">Register new staff member</div>
              <div style={{ padding: '20px' }}>
                <form onSubmit={handleAddUserSubmit}>
                  <div className="fld">
                    <label htmlFor="ro">Assigned role</label>
                    <select
                      id="ro"
                      className="inp w"
                      style={{ height: '42px' }}
                      disabled={!isAdmin}
                      value={selectedRole}
                      onChange={(e) => handleRoleSelectChange(e.target.value as UserRole)}
                    >
                      <option value="operator">Plant Operator (Series OP-1xxx)</option>
                      <option value="supervisor">Shift Supervisor (Series SV-2xxx)</option>
                      <option value="qc_analyst">QC Laboratory Analyst (Series QC-3xxx)</option>
                      <option value="qc_manager">Quality Control Manager (Series QM-4xxx)</option>
                      <option value="admin">Plant Administrator / Admin (Series AD-5xxx)</option>
                      <option value="viewer">Quality Auditor (Series AU-9xxx)</option>
                    </select>
                  </div>

                  <div className="fld">
                    <label htmlFor="ri">Employee ID (auto-generated)</label>
                    <input id="ri" value={autoId} readOnly />
                  </div>

                  <div className="fld">
                    <label htmlFor="rn">Full name</label>
                    <input
                      id="rn"
                      disabled={!isAdmin}
                      required
                      placeholder="e.g. Muhammad Faizal bin Roslan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="fld">
                    <label htmlFor="rp">Initial password</label>
                    <input
                      id="rp"
                      disabled={!isAdmin}
                      type="password"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <button
                    className="primary wide"
                    type="submit"
                    disabled={!isAdmin || isSubmitting}
                  >
                    {isSubmitting ? 'Registering...' : 'Register staff and generate credentials'}
                  </button>

                  <p className="hint" style={{ marginTop: '12px', fontSize: '12px' }}>
                    Staff can change the initial password after signing in.
                  </p>
                </form>
              </div>
            </section>

            {/* Right Column: Personnel Directory Table */}
            <section className="panel">
              <div className="ph">
                <span>
                  Active plant personnel <span className="bd">{filteredProfiles.length}</span>
                </span>
                <div className="dr">
                  <input
                    className="inp"
                    type="search"
                    style={{ width: '190px' }}
                    placeholder="Search ID or name"
                    aria-label="Search staff"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    className="inp"
                    style={{ width: '150px' }}
                    aria-label="Filter by role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All roles</option>
                    <option value="operator">Operator (OP)</option>
                    <option value="supervisor">Supervisor (SV)</option>
                    <option value="qc_analyst">QC Analyst (QC)</option>
                    <option value="qc_manager">QC Manager (QM)</option>
                    <option value="admin">Admin (AD)</option>
                    <option value="viewer">Viewer (AU)</option>
                  </select>
                </div>
              </div>

              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Password</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                          No personnel found matching search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((p) => {
                        const isCurrent = p.employee_no === currentProfile.employee_no || p.id === currentProfile.id;
                        const isActive = p.status === 'active' || (p.status !== 'unactive' && p.active !== false);

                        return (
                          <tr key={p.employee_no || p.id}>
                            <td><b>{p.employee_no}</b></td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {p.avatar_url ? (
                                  <img
                                    src={p.avatar_url}
                                    alt={p.full_name}
                                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--raised)', display: 'grid', placeItems: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                    {(p.full_name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span>{p.full_name}</span>
                                {isCurrent && <span className="bd" style={{ marginLeft: '4px' }}>You</span>}
                              </div>
                            </td>
                            <td><span className="bd">{p.role}</span></td>
                            <td>
                              <span className={`bd ${isActive ? 'g' : 'r'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td><span className="bd a">{p.password ? 'Custom' : 'Default'}</span></td>
                            <td style={{ color: 'var(--muted)' }}>
                              {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }) : '26 Sep 2026'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {isAdmin ? (
                                <div className="dr" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="ghost transition-all duration-150 active:scale-[0.96] cursor-pointer"
                                    disabled={isCurrent}
                                    onClick={() => handleToggleStatus(p.employee_no, isActive, p.full_name)}
                                  >
                                    {isActive ? 'Set inactive' : 'Reactivate'}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost dng transition-all duration-150 active:scale-[0.96] cursor-pointer"
                                    disabled={isCurrent}
                                    onClick={() => handleDeleteUser(p.employee_no, p.full_name)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <span className="hint">Admin Only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <p className="foot">
                21 CFR Part 11 audit trail: all personnel additions and status changes are permanently logged.
              </p>
            </section>
          </div>
        </>
      ) : (
        /* Retention & Supabase Prune Sub-Tab View */
        <div className="space-y-6">
          {/* RBAC Warning if not Admin */}
          {!isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">RESTRICTED ACCESS:</span> Data retention archiving and database pruning are restricted exclusively to the Plant Administrator (*Admin*).
                </div>
              </div>
              <button
                onClick={handleSwitchToAdmin}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold whitespace-nowrap transition-colors shadow-xs cursor-pointer text-xs"
              >
                Switch to Admin Profile (AD-5010)
              </button>
            </div>
          )}

          {/* Retention Notification Banner */}
          {pruneStatusMessage && (
            <div className={`flex items-center justify-between p-4 rounded-xl border text-xs font-mono ${
              pruneStatusMessage.type === 'success' 
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' 
                : 'bg-rose-950/50 border-rose-800 text-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {pruneStatusMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <span>{pruneStatusMessage.text}</span>
              </div>
              <button 
                onClick={() => setPruneStatusMessage(null)}
                className="text-slate-400 hover:text-slate-800 font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Database Health & Capacity Meter */}
          <div className="p-5 rounded-xl bg-[#101927] border border-[#1F2E43] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0A1018] border border-[#1F2E43] text-[#009FE3]">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-100 tracking-wide">
                      Supabase PostgreSQL Storage Capacity & Health
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Continuous monitoring against Supabase Free Tier cap (500.0 MB). Tabular refinery data generates ~8.7 MB/year.
                  </p>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-xs text-slate-400">Total Quota Cap:</div>
                <div className="text-sm font-bold text-slate-100">500.0 MB <span className="text-slate-500 text-xs font-normal">(Supabase Limit)</span></div>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">
                  Storage Used: <b className="text-sky-400 font-bold">{((storageMetrics?.estimatedStorageUsedKB || 28672) / 1024).toFixed(2)} MB</b> / 500.0 MB
                </span>
                <span className="text-green-600 font-bold">
                  {storageMetrics?.safeLimitPercentage || 5.72}% Used · {(500 - ((storageMetrics?.estimatedStorageUsedKB || 28672) / 1024)).toFixed(1)} MB Safe Headroom
                </span>
              </div>
              <div className="w-full bg-[#0A1018] rounded-full h-3 border border-[#1F2E43] p-0.5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-[#009FE3] transition-all duration-500"
                  style={{ width: `${Math.max(storageMetrics?.safeLimitPercentage || 5.72, 3)}%` }}
                />
              </div>
            </div>

            {/* Storage Item Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43] hover:border-slate-600 transition-colors">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">QC Sample Reports</div>
                <div className="text-lg font-bold font-mono text-[#009FE3] mt-0.5">
                  {storageMetrics?.totalReports || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {storageMetrics?.decidedReports || 0} decided (eligible)
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43] hover:border-slate-600 transition-colors">
                <div className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Active Shift Sheet</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {storageMetrics?.activeSheetEntries || 0}
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5 font-mono">
                  🛡️ Always Protected
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43] hover:border-slate-600 transition-colors">
                <div className="text-[10px] font-mono text-amber-400 uppercase font-semibold">Quality Deviations</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {storageMetrics?.deviationsCount || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  CAPA & out-of-spec logs
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43] hover:border-slate-600 transition-colors">
                <div className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">Audit Trail (CFR 21)</div>
                <div className="text-lg font-bold font-mono text-indigo-400 mt-0.5">
                  {storageMetrics?.auditLogsCount || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Tamper-evident events
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43] hover:border-slate-600 transition-colors">
                <div className="text-[10px] font-mono text-blue-400 uppercase font-semibold">Staff Accounts</div>
                <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                  {storageMetrics?.profilesCount || 0}
                </div>
                <div className="text-[10px] text-blue-400 mt-0.5 font-mono">
                  🔒 Master Data (Permanent)
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Fast-Track Auto Banner */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#101927] border border-[#009FE3]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0A1018] border border-[#1F2E43] text-[#009FE3] shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 tracking-wide">
                    1-Click Auto Archive & Prune (Automated Dual-Action)
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-mono bg-[#009FE3]/20 text-[#009FE3] border border-[#009FE3]/40 rounded font-bold">
                    FAST TRACK
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  The system will generate & download cold backups (.json & .csv), prune legacy records from Supabase, and open Google Drive automatically.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!isAdmin || isPruning}
              onClick={handleOneClickAutoPrune}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#009FE3] hover:bg-[#0089C4] text-white font-semibold text-xs font-mono transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap border border-[#009FE3]/50"
            >
              <Zap className="h-4 w-4" />
              <span>{isPruning ? 'Processing...' : '⚡ Run Auto Archive & Prune (1-Click)'}</span>
            </button>
          </div>

          {/* 2-Step Safe Archive & Prune Workflow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* STEP 1: Cold Storage Export (Google Drive Archive) */}
            <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2E43] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1018] border border-[#1F2E43] text-[#009FE3] font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 tracking-wide">
                      STEP 1: Export to Cold Storage (Google Drive)
                    </h3>
                    <span className="text-[10px] font-mono text-[#009FE3] font-medium">
                      Mandatory Pre-Prune Backup · Zero Data Loss Guarantee
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Prior to clearing legacy data from Supabase, download a cold backup package. This package bundles full JSON raw data alongside a summary CSV for archiving in <b>Google Drive</b> or company cloud repositories.
              </p>

              {/* Retention Policy Period Selector */}
              <div className="space-y-2 text-xs font-mono">
                <label className="block text-slate-500 font-semibold">
                  Select Retention Cutoff Policy:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Records', desc: 'Full Backup (100% Current Data)' },
                    { id: 'today', label: 'Today', desc: 'Up to 22 Sep 2026' },
                    { id: '30', label: 'Past 30 Days', desc: 'Records < 30 days old' },
                    { id: '90', label: 'Past 90 Days', desc: 'Quarterly (Default)' },
                    { id: '180', label: 'Past 180 Days', desc: 'Semi-Annual' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setRetentionPreset(preset.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        retentionPreset === preset.id
                          ? 'bg-[#009FE3] border-[#009FE3] text-white font-semibold'
                          : 'bg-[#0A1018] border-[#1F2E43] text-slate-300 hover:text-white hover:bg-[#172235]'
                      }`}
                    >
                      <div className="font-bold text-xs">{preset.label}</div>
                      <div className={`text-[10px] ${retentionPreset === preset.id ? 'text-sky-100' : 'text-slate-500'}`}>{preset.desc}</div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRetentionPreset('custom')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      retentionPreset === 'custom'
                        ? 'bg-gradient-to-r from-sky-600 to-sky-500 border-sky-500/60 text-white shadow-md shadow-sky-950/40 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-sky-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">Custom Date</div>
                    <div className={`text-[10px] ${retentionPreset === 'custom' ? 'text-sky-100' : 'text-slate-500'}`}>Select Date</div>
                  </button>
                </div>

                {/* Custom Date Picker */}
                {retentionPreset === 'custom' && (
                  <div className="pt-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sky-400" />
                    <input
                      type="date"
                      value={customCutoffDate}
                      onChange={(e) => setCustomCutoffDate(e.target.value)}
                      className="bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-[#009FE3] focus:outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Effective Cutoff Date Banner */}
              <div className="p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Effective Prune Cutoff Date:</span>
                <span className="text-[#009FE3] font-bold bg-[#101927] px-2.5 py-1 rounded border border-[#1F2E43]">
                  {retentionPreset === 'all' ? 'ALL RECORDS (NO CUTOFF LIMIT)' : getEffectiveCutoffDate()}
                </span>
              </div>

              {/* Dynamic Live Preview Box */}
              {(() => {
                const effectiveCutoff = getEffectiveCutoffDate();
                const preview = getArchivePreviewCounts(effectiveCutoff, retentionPreset === 'all');
                return (
                  <div className="p-3.5 rounded-lg bg-[#0A1018] border border-[#1F2E43] space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-medium">Archive Package Contents:</span>
                      <span className={`px-2.5 py-0.5 rounded font-bold ${preview.total > 0 ? 'bg-[#009FE3]/20 text-[#009FE3] border border-[#009FE3]/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800'}`}>
                        {preview.total} Records Found
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-center">
                      <div className="p-2 rounded-lg bg-[#101927] border border-[#1F2E43]">
                        <div className="text-[#009FE3] font-bold text-xs">{preview.reports}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">QC Reports</div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#101927] border border-[#1F2E43]">
                        <div className="text-emerald-400 font-bold text-xs">{preview.sheets}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">Shift Sheets</div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#101927] border border-[#1F2E43]">
                        <div className="text-amber-400 font-bold text-xs">{preview.deviations}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">Deviations</div>
                      </div>
                      <div className="p-2 rounded-lg bg-[#101927] border border-[#1F2E43]">
                        <div className="text-indigo-400 font-bold text-xs">{preview.auditLogs}</div>
                        <div className="text-slate-400 text-[9px] mt-0.5">Audit Logs</div>
                      </div>
                    </div>
                    {preview.total === 0 ? (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-[11px] font-sans flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <b>Why 0 Records?</b> Current plant data is dated <b>September 2026</b>. The selected retention cutoff ({effectiveCutoff}) targets legacy data prior to that date. Select <b>"All Records"</b> or <b>"Today"</b> above to export all operational records to Excel & JSON.
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-green-600 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span>Excel (.csv) & .json backup will contain all {preview.total} records completely.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Download Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadArchive(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#009FE3] hover:bg-[#0089C4] text-white font-semibold py-3 px-4 rounded-lg text-xs font-mono transition-all cursor-pointer border border-[#009FE3]/50"
                >
                  <Download className="h-4 w-4" />
                  <span>📥 Download Full Plant Backup (.JSON + .CSV) — All Current Records</span>
                </button>

                {retentionPreset !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleDownloadArchive(false)}
                    className="w-full flex items-center justify-center gap-2 border border-[#1F2E43] bg-[#0A1018] text-[#009FE3] hover:bg-[#172235] font-semibold py-2.5 px-4 rounded-lg text-xs font-mono transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Selective Backup ({getEffectiveCutoffDate()})</span>
                  </button>
                )}

                {/* Google Drive Direct Link */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43] text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Archive className="h-4 w-4 text-[#009FE3]" />
                    <span>Upload downloaded file to Google Drive:</span>
                  </div>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101927] hover:bg-[#172235] text-[#009FE3] text-[11px] font-semibold transition-colors border border-[#1F2E43]"
                  >
                    <span>Open Google Drive</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {hasDownloadedBackup && downloadedPackageInfo && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <span>
                      Archive generated: <b>{downloadedPackageInfo.filename}.json</b> ({downloadedPackageInfo.count} records). Step 2 is now unlocked!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2: Prune Supabase Database (Protected) */}
            <div className={`rounded-xl border ${
              hasDownloadedBackup ? 'border-amber-500/60 bg-[#101927]' : 'border-[#1F2E43] bg-[#101927]'
            } p-5 space-y-4`}>
              <div className="flex items-center justify-between border-b border-[#1F2E43] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    hasDownloadedBackup 
                      ? 'bg-amber-950/80 border border-amber-700 text-amber-300' 
                      : 'bg-[#0A1018] border border-[#1F2E43] text-slate-500'
                  } font-bold text-xs`}>
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 tracking-wide">
                      STEP 2: Execute Supabase Database Prune
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Admin Electronic Signature & 21 CFR Part 11 Audit Trail
                    </span>
                  </div>
                </div>
                {hasDownloadedBackup ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-700 rounded font-bold animate-pulse">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-[#0A1018] text-slate-400 border border-[#1F2E43] rounded font-bold">
                    LOCKED
                  </span>
                )}
              </div>

              {!hasDownloadedBackup ? (
                <div className="p-4 rounded-lg bg-[#0A1018] border border-[#1F2E43] text-slate-400 text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <Lock className="h-4 w-4" />
                    <span>Safety Protection Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Database pruning is locked until you complete <b>STEP 1</b> (Download Backup). This guarantees zero accidental loss of operational history.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs font-mono space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Data Pruning Verification:</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                    All Sample Reports (with <i>decided</i> status) and Deviations dated before <b>{getEffectiveCutoffDate()}</b> will be pruned from Supabase. Active shift sheets, user profiles, and product specifications REMAIN safe.
                  </p>
                </div>
              )}

              {/* Prune Form */}
              <form onSubmit={handleExecutePrune} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">
                    Administrator Electronic Signature Password:
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="password"
                      disabled={!hasDownloadedBackup || !isAdmin || isPruning}
                      required
                      placeholder={hasDownloadedBackup ? "Enter administrator password..." : "Complete Step 1 first..."}
                      value={prunePassword}
                      onChange={(e) => setPrunePassword(e.target.value)}
                      className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Confirms authorization per ISO 9001:2015 §8.5.3 (Control of Outputs).
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!hasDownloadedBackup || !isAdmin || isPruning || !prunePassword.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg text-xs font-mono transition-all cursor-pointer border border-rose-500/40"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {isPruning ? 'Pruning Supabase Database...' : `Permanently Prune Records Before ${getEffectiveCutoffDate()}`}
                  </span>
                </button>
              </form>

              {/* Audit & Compliance Standards Card */}
              <div className="p-3.5 rounded-lg bg-[#0A1018] border border-[#1F2E43] text-[11px] font-mono text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#009FE3] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>REGULATORY COMPLIANCE SAFEGUARDS:</span>
                </div>
                <ul className="space-y-1 text-[10px] text-slate-400">
                  <li>• <b>Zero Data Loss:</b> Complete cold backup is always downloaded before prune execution.</li>
                  <li>• <b>Immutable Audit Trail:</b> Every prune execution is stamped with Admin ID & timestamp in <code>audit_log</code>.</li>
                  <li>• <b>Protected Active Shift:</b> The active shift sheet and running tanks are excluded from pruning.</li>
                </ul>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING TOAST NOTIFICATION CONTAINER (REPLACES NATIVE alert())           */}
      {/* ========================================================================= */}
      <div 
        aria-live="polite" 
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 flex items-start gap-3 ${
              t.type === 'success'
                ? 'bg-[#101927] border-emerald-700/80 text-emerald-100 shadow-black/50'
                : t.type === 'warning'
                ? 'bg-[#101927] border-amber-700/80 text-amber-100 shadow-black/50'
                : t.type === 'error'
                ? 'bg-[#101927] border-rose-700/80 text-rose-100 shadow-black/50'
                : 'bg-[#101927] border-[#1F2E43] text-slate-100 shadow-black/50'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-sky-400" />}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold font-mono tracking-wide uppercase">
                  {t.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#172235] transition-colors cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* CUSTOM GLASSMORPHISM CONFIRMATION MODAL (REPLACES window.confirm & prompt)*/}
      {/* ========================================================================= */}
      {confirmModal && confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 select-none animate-alert-overlay-in"
          onClick={() => {
            if (!modalIsSubmitting) {
              setConfirmModal(null);
              setModalPasswordInput('');
            }
          }}
        >
          <div 
            className="relative max-w-md w-full bg-[#0F1524] border border-[#1F2E43] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.75)] overflow-hidden animate-alert-content-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient highlight strip */}
            <div 
              className={`h-1.5 w-full ${
                confirmModal.type === 'danger'
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600'
                  : confirmModal.type === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500'
                  : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600'
              }`} 
            />

            <div className="p-6 space-y-4">
              {/* Header with icon and title */}
              <div className="flex items-start gap-3.5">
                <div 
                  className={`p-3 rounded-xl shrink-0 shadow-xs ${
                    confirmModal.type === 'danger'
                      ? 'bg-rose-950/80 border border-rose-800 text-red-600'
                      : confirmModal.type === 'warning'
                      ? 'bg-amber-950/80 border border-amber-800 text-amber-600'
                      : 'bg-sky-950/80 border border-sky-800 text-sky-400'
                  }`}
                >
                  {confirmModal.type === 'danger' && <Trash2 className="h-6 w-6" />}
                  {confirmModal.type === 'warning' && <AlertTriangle className="h-6 w-6" />}
                  {confirmModal.type === 'info' && <ShieldCheck className="h-6 w-6" />}
                </div>

                <div className="flex-1 min-w-0">
                  {confirmModal.badgeText && (
                    <span 
                      className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mb-1.5 border uppercase ${
                        confirmModal.type === 'danger'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : confirmModal.type === 'warning'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                          : 'bg-sky-950/80 text-sky-300 border-sky-800'
                      }`}
                    >
                      {confirmModal.badgeText}
                    </span>
                  )}
                  <h3 className="text-base font-bold text-slate-100 tracking-wide">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {confirmModal.description}
                  </p>
                </div>
              </div>

              {/* Staff details card if available */}
              {confirmModal.details?.name && (
                <div className="bg-[#0A1018] border border-[#1F2E43] rounded-lg p-3.5 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    Maklumat Kakitangan Terlibat:
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-100">
                      {confirmModal.details.name}
                    </div>
                    {confirmModal.details.employeeNo && (
                      <span className="text-xs font-mono font-bold text-[#009FE3] bg-[#009FE3]/10 border border-[#009FE3]/30 px-2.5 py-0.5 rounded-lg">
                        {confirmModal.details.employeeNo}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Extra note or consequences */}
              {confirmModal.details?.extraNote && (
                <div 
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    confirmModal.type === 'danger'
                      ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                      : confirmModal.type === 'warning'
                      ? 'bg-amber-950/50 border-amber-800 text-amber-200'
                      : 'bg-slate-50 border border-slate-200 text-slate-500'
                  }`}
                >
                  <p className="whitespace-pre-line font-sans">
                    {confirmModal.details.extraNote}
                  </p>
                </div>
              )}

              {/* Password Input for Secure Actions (e.g. 1-Click Prune) */}
              {confirmModal.requiresPassword && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-mono text-slate-500 block font-semibold">
                    Kata Laluan Pentadbir (Admin Authorization):
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={modalPasswordInput}
                      onChange={(e) => setModalPasswordInput(e.target.value)}
                      placeholder={confirmModal.passwordPlaceholder || 'Kata laluan pentadbir...'}
                      className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3]"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1F2E43]">
                <button
                  type="button"
                  disabled={modalIsSubmitting}
                  onClick={() => {
                    setConfirmModal(null);
                    setModalPasswordInput('');
                  }}
                  className="px-4 py-2.5 rounded-lg border border-[#1F2E43] bg-[#0A1018] hover:bg-[#172235] text-slate-300 font-mono text-xs transition-all duration-150 active:scale-[0.97] cursor-pointer disabled:opacity-50 select-none"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={modalIsSubmitting || (confirmModal.requiresPassword && !modalPasswordInput.trim())}
                  onClick={async () => {
                    setModalIsSubmitting(true);
                    try {
                      await confirmModal.onConfirm(modalPasswordInput);
                      setConfirmModal(null);
                      setModalPasswordInput('');
                    } finally {
                      setModalIsSubmitting(false);
                    }
                  }}
                  className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold text-white flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md select-none ${
                    confirmModal.confirmButtonVariant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500 border border-rose-500/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                      : confirmModal.confirmButtonVariant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500 border border-amber-500/50 hover:shadow-[0_0_15px_rgba(217,119,6,0.4)]'
                      : 'bg-[#009FE3] hover:bg-[#0089C4] border border-[#009FE3]/50 hover:shadow-[0_0_15px_rgba(0,159,227,0.4)]'
                  }`}
                >
                  {modalIsSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {confirmModal.type === 'danger' && <Trash2 className="h-3.5 w-3.5" />}
                      {confirmModal.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5" />}
                      {confirmModal.type === 'info' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      <span>{confirmModal.confirmButtonText}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
