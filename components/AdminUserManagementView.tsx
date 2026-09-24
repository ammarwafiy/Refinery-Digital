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
        text: `✓ Sandaran dimuat turun (${pkg.recordsArchivedCount} rekod dibungkus). Anda kini boleh simpan fail ini ke Google Drive.`
      });
      showToast(
        'success',
        'Sandaran Berjaya Dimuat Turun',
        `${pkg.recordsArchivedCount} rekod (${pkg.counts.reports} Laporan QC, ${pkg.counts.deviations} Sisihan, ${pkg.counts.auditLogs} Audit Log, ${pkg.counts.sheets} Lembaran Syif) telah dieksport ke fail Excel (.csv) & .json!`
      );
    } catch (err: any) {
      setPruneStatusMessage({
        type: 'error',
        text: `Failed to generate archive package: ${err?.message || 'Unknown error'}`
      });
      showToast('error', 'Ralat Muat Turun', err?.message || 'Gagal menjana fail sandaran');
    }
  };

  const handleExecutePrune = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasDownloadedBackup) {
      showToast(
        'warning',
        'Syarat Keselamatan ISO 9001',
        'Anda mesti memuat turun pakej sandaran (backup) ke komputer / Google Drive terlebih dahulu sebelum melaksanakan pembersihan.'
      );
      return;
    }

    const cutoff = getEffectiveCutoffDate();
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Pengesahan Pembersihan Pangkalan Data',
      badgeText: 'ISO 9001 / HACCP RETENTION',
      description: `Adakah anda pasti ingin membersihkan rekod Supabase yang lebih lama daripada ${cutoff}?`,
      details: {
        extraNote: `• Rekod laporan sampel & sisihan sebelum ${cutoff} akan dipadam secara kekal daripada Supabase.\n• Lembaran syif aktif, spesifikasi loji, kalibrasi tangki & akaun staf TIDAK akan disentuh.`
      },
      confirmButtonText: 'Sahkan & Bersihkan Rekod',
      confirmButtonVariant: 'danger',
      onConfirm: async () => {
        setIsPruning(true);
        setPruneStatusMessage(null);

        try {
          const res = await executePruneRetentionPolicy(cutoff, prunePassword);
          if (res.success) {
            const successMsg = res.message || 'Database pruning berjaya dilaksanakan!';
            setPruneStatusMessage({
              type: 'success',
              text: successMsg
            });
            showToast('success', 'Pembersihan Selesai', successMsg);
            setPrunePassword('');
            setHasDownloadedBackup(false);
            refreshStorage();
            refreshData();
          } else {
            const errorMsg = res.error || 'Pruning ditolak. Pengesahan gagal.';
            setPruneStatusMessage({
              type: 'error',
              text: errorMsg
            });
            showToast('error', 'Pruning Ditolak', errorMsg);
          }
        } catch (err: any) {
          const errorMsg = err?.message || 'Ralat berlaku semasa pembersihan pangkalan data.';
          setPruneStatusMessage({
            type: 'error',
            text: errorMsg
          });
          showToast('error', 'Ralat Sistem', errorMsg);
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
        'Akses Ditolak',
        'Hanya Pentadbir Loji (Plant Administrator) dibenarkan melaksanakan pengekalan data & pembersihan.'
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
      description: 'Sistem akan memuat turun sandaran (.json & .csv) ke komputer anda dan membersihkan rekod lama di Supabase secara serentak.',
      details: {
        extraNote: `Tarikh had pengekalan: Rekod sebelum ${cutoff} akan diarkibkan & dipadam secara automatik.`
      },
      requiresPassword: true,
      defaultPassword: 'password123',
      passwordPlaceholder: 'Masukkan Kata Laluan Pentadbir...',
      confirmButtonText: 'Muat Turun & Bersihkan Sekarang',
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
            const successMsg = `⚡ 1-Click Auto Archive & Prune Selesai! Fail sandaran (${pkg.recordsArchivedCount} rekod) telah dimuat turun dan Supabase telah dibersihkan untuk rekod sebelum ${cutoff}.`;
            setPruneStatusMessage({
              type: 'success',
              text: successMsg
            });
            showToast('success', 'Arkib & Prune Selesai', `Sandaran dimuat turun & ${pkg.recordsArchivedCount} rekod dibersihkan.`);
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
            showToast('error', 'Gagal Melaksanakan Prune', errorMsg);
          }
        } catch (err: any) {
          const errorMsg = err?.message || 'Error during 1-click execution.';
          setPruneStatusMessage({
            type: 'error',
            text: errorMsg
          });
          showToast('error', 'Ralat', errorMsg);
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
      showToast('success', 'Pendaftaran Kakitangan Berjaya', successMsg);
      setAutoId(generateNextEmployeeId(selectedRole));
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to register staff member. Please try again.';
      setStatusMessage({ type: 'error', text: errMsg });
      showToast('error', 'Gagal Mendaftar Staf', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (employeeNo: string, currentActive: boolean, name: string) => {
    if (employeeNo === currentProfile.employee_no || employeeNo === currentProfile.id) {
      showToast(
        'warning',
        'Tindakan Disekat',
        'Anda tidak boleh menyahaktifkan akaun anda sendiri yang sedang digunakan.'
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: currentActive ? 'warning' : 'info',
      title: currentActive ? 'Nyahaktifkan Akaun Staff' : 'Aktifkan Semula Akaun Staff',
      badgeText: currentActive ? 'STATUS: UNACTIVE' : 'STATUS: ACTIVE',
      description: currentActive
        ? `Adakah anda pasti ingin menyahaktifkan akaun kakitangan ini? Kakitangan tidak akan dapat log masuk ke sistem sehingga diaktifkan semula.`
        : `Adakah anda pasti ingin mengaktifkan semula akaun kakitangan ini ke dalam sistem?`,
      details: {
        name,
        employeeNo,
        extraNote: currentActive
          ? 'Kakitangan tidak boleh log masuk, tetapi semua sejarah rekod log audit terdahulu dikekalkan.'
          : 'Kakitangan kini boleh log masuk semula menggunakan kelayakan ID staf mereka.'
      },
      confirmButtonText: currentActive ? 'Nyahaktifkan Kakitangan' : 'Aktifkan Semula Kakitangan',
      confirmButtonVariant: currentActive ? 'warning' : 'primary',
      onConfirm: async () => {
        await toggleProfileActive(employeeNo);
        refreshData();
        const msg = `✓ Status akaun "${name}" kini ditukar kepada: ${currentActive ? 'UNACTIVE' : 'ACTIVE'} dan dikemas kini ke Supabase.`;
        setStatusMessage({
          type: 'success',
          text: msg
        });
        showToast('success', 'Status Kakitangan Dikemas Kini', msg);
      }
    });
  };

  const handleDeleteUser = async (employeeNo: string, name: string) => {
    if (employeeNo === currentProfile.employee_no || employeeNo === currentProfile.id) {
      showToast(
        'warning',
        'Tindakan Disekat',
        'Anda tidak boleh memadam akaun Administrator aktif anda sendiri.'
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Sahkan Pemadaman Akaun Staff',
      badgeText: 'TINDAKAN KEKAL / PERMANENT DELETE',
      description: `Adakah anda pasti ingin memadam akaun kakitangan ini daripada sistem loji dan pangkalan data Supabase?`,
      details: {
        name,
        employeeNo,
        extraNote: 'Tindakan ini adalah kekal. Akaun kakitangan ini akan dipadamkan daripada sistem dan Supabase serta tidak boleh dipulihkan semula.'
      },
      confirmButtonText: 'Ya, Padam Akaun Ini',
      confirmButtonVariant: 'danger',
      onConfirm: async () => {
        try {
          await deleteProfile(employeeNo);
          refreshData();
          const msg = `✓ Akaun kakitangan "${name}" (${employeeNo}) berjaya dipadam dari sistem & Supabase.`;
          setStatusMessage({
            type: 'success',
            text: msg
          });
          showToast('success', 'Akaun Staff Dipadam', msg);
        } catch {
          const errMsg = `Gagal memadam akaun kakitangan ${name}. Sila cuba lagi.`;
          setStatusMessage({ type: 'error', text: errMsg });
          showToast('error', 'Ralat Pemadaman', errMsg);
        }
      }
    });
  };

  const handleSwitchToAdmin = () => {
    const all = getProfiles();
    const adminUser = all.find(p => p.role === 'admin') || all[0];
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

  // Filtered Profiles
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      p.employee_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#101927] border border-[#1F2E43]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A1018] border border-[#1F2E43] text-[#009FE3]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide">
                Plant Administration & User Management
              </h1>
              <span className="rounded bg-[#0A1018] px-2 py-0.5 text-[10px] font-mono text-[#009FE3] border border-[#009FE3]/30 font-semibold">
                ADMIN ACCESS ONLY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Role-Based Access Control (RBAC), Consistent Sequential ID Generation & Nisshin Deodorizer Personnel Directory
            </p>
          </div>
        </div>

        {/* Current Admin Badge & Supabase Sync */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#172235] hover:bg-[#1F2E43] text-slate-200 border border-[#1F2E43] hover:border-[#009FE3]/50 text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-50"
            title="Fetch and synchronize latest user profiles directly with Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#009FE3] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Supabase'}</span>
          </button>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-medium">Current User:</span>
            <span className="text-xs font-semibold text-slate-200 font-mono">
              {currentProfile.full_name} ({currentProfile.employee_no})
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${roleStyles[currentRole]?.bg} ${roleStyles[currentRole]?.text} ${roleStyles[currentRole]?.border}`}>
            {currentRole}
          </span>
        </div>
      </div>

      {/* Admin Section Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1F2E43] pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveAdminSubTab('personnel')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeAdminSubTab === 'personnel'
              ? 'bg-[#009FE3] text-white border border-[#009FE3]'
              : 'bg-[#101927] text-slate-400 hover:text-slate-200 hover:bg-[#172235] border border-[#1F2E43]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Personnel & Access Control</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveAdminSubTab('retention');
            refreshStorage();
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeAdminSubTab === 'retention'
              ? 'bg-[#009FE3] text-white border border-[#009FE3]'
              : 'bg-[#101927] text-slate-400 hover:text-slate-200 hover:bg-[#172235] border border-[#1F2E43]'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>Data Retention & Supabase Prune Policy</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-[#0A1018] text-[#009FE3] border border-[#009FE3]/40 rounded font-mono font-bold">
            500 MB PROTECT
          </span>
        </button>
      </div>

      {activeAdminSubTab === 'personnel' ? (
        <>
          {/* RBAC Warning Banner if not Admin */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-300 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">RESTRICTED VIEW MODE:</span> You are logged in with role <span className="uppercase text-amber-400 font-bold">[{currentRole}]</span>. Staff registration and status modification are restricted to the Plant Administrator (*Admin*).
            </div>
          </div>
          <button
            onClick={handleSwitchToAdmin}
            className="px-3 py-1.5 rounded-lg bg-[#009FE3] hover:bg-[#0089C4] text-white font-semibold whitespace-nowrap transition-all cursor-pointer text-xs border border-[#009FE3]/50"
          >
            Switch to Admin Profile (AD-5010)
          </button>
        </div>
      )}

      {/* Notification Banner */}
      {statusMessage && (
        <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-mono ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
            : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-800 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg bg-[#101927] border border-[#1F2E43] hover:border-slate-600 transition-colors">
          <div className="text-[11px] font-mono text-slate-400 uppercase font-medium">Total Staff</div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Registered in plant</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#101927] border border-[#1F2E43] hover:border-slate-600 transition-colors">
          <div className="text-[11px] font-mono text-emerald-400 uppercase font-semibold">Operator (OP)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{operatorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series OP-1xxx</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#101927] border border-[#1F2E43] hover:border-slate-600 transition-colors">
          <div className="text-[11px] font-mono text-amber-400 uppercase font-semibold">Supervisor (SV)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{supervisorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series SV-2xxx</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#101927] border border-[#1F2E43] hover:border-slate-600 transition-colors">
          <div className="text-[11px] font-mono text-[#009FE3] uppercase font-semibold">QC Laboratory (QC/QM)</div>
          <div className="text-xl font-bold font-mono text-[#009FE3] mt-1">{qcCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series QC-3xxx / QM-4xxx</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#101927] border border-[#1F2E43] hover:border-slate-600 transition-colors">
          <div className="text-[11px] font-mono text-blue-400 uppercase font-semibold">Admin & Audit (AD/AU)</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">{adminCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series AD-5xxx / AU-9xxx</div>
        </div>
      </div>

      {/* Main Grid: Add User (Admin Exclusive) & ID Standards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Add User Form (Admin Exclusive) */}
        <div className="lg:col-span-1 rounded-xl border border-[#1F2E43] bg-[#101927] p-5">
          <div className="flex items-center gap-2.5 mb-4 border-b border-[#1F2E43] pb-3">
            <UserPlus className="h-5 w-5 text-[#009FE3]" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">
                Register New Staff Member
              </h2>
              <span className="text-[10px] font-mono text-slate-400">
                Exclusive Plant Administrator Function (Admin)
              </span>
            </div>
          </div>

          <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs font-mono">
            {/* Role Select */}
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">
                Assigned Role / Department:
              </label>
              <select
                disabled={!isAdmin}
                value={selectedRole}
                onChange={(e) => handleRoleSelectChange(e.target.value as UserRole)}
                className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#009FE3] disabled:opacity-50 cursor-pointer"
              >
                <option value="operator" className="bg-[#101927] text-slate-200">Plant Operator (RF-FR-004 · Series OP-1xxx)</option>
                <option value="supervisor" className="bg-[#101927] text-slate-200">Shift Supervisor (Series SV-2xxx)</option>
                <option value="qc_analyst" className="bg-[#101927] text-slate-200">QC Laboratory Analyst (Series QC-3xxx)</option>
                <option value="qc_manager" className="bg-[#101927] text-slate-200">Quality Control Manager (Series QM-4xxx)</option>
                <option value="admin" className="bg-[#101927] text-slate-200">Plant Administrator / Admin (Series AD-5xxx)</option>
                <option value="viewer" className="bg-[#101927] text-slate-200">Quality Auditor (ISO/HACCP · Series AU-9xxx)</option>
              </select>
            </div>

            {/* Auto Generated Consistent ID Preview */}
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">
                Auto-Generated Sequential Employee ID (Plant Standard):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={autoId}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-[#009FE3] font-bold tracking-wider cursor-not-allowed font-mono"
                />
                <span className="text-[10px] font-mono text-[#009FE3] bg-[#009FE3]/10 px-2.5 py-2 rounded-lg border border-[#009FE3]/30 whitespace-nowrap font-semibold">
                  Auto-Sequential
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                System detects highest existing series ID and auto-increments by +1.
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">
                Staff Full Name:
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                required
                placeholder="e.g. Muhammad Faizal bin Roslan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg px-3 py-2 text-sm font-sans text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] disabled:opacity-50"
              />
            </div>

            {/* Temporary Initial Password */}
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">
                Initial Default Password:
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] disabled:opacity-50"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Default standard: `password123`. Personnel can change after sign-in.
              </span>
            </div>

            <button
              type="submit"
              disabled={!isAdmin || isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-[#009FE3] hover:bg-[#0089C4] disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition-all mt-2 cursor-pointer disabled:cursor-not-allowed border border-[#009FE3]/50"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Staff & Generate Credentials'}</span>
            </button>
          </form>

          {/* Standards Summary Card */}
          <div className="mt-5 p-3.5 rounded-lg bg-[#0A1018] border border-[#1F2E43] text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-[#009FE3] font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>CONSISTENT NUMBERING SCHEME:</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-[10px]">
              <li>• <b className="text-emerald-400 font-semibold">OP-1xxx</b>: Plant Shift Operator (Morning/Evening/Night)</li>
              <li>• <b className="text-amber-400 font-semibold">SV-2xxx</b>: Shift Supervisor (Sheet Verification)</li>
              <li>• <b className="text-sky-400 font-semibold">QC-3xxx</b>: Lab Analyst (FFA/IV/Colour/SFC Testing)</li>
              <li>• <b className="text-cyan-400 font-semibold">QM-4xxx</b>: Quality Manager (Product Disposition)</li>
              <li>• <b className="text-blue-400 font-semibold">AD-5xxx</b>: Plant Administrator & Specification Config</li>
              <li>• <b className="text-slate-400 font-semibold">AU-9xxx</b>: External Auditor (ISO Record Audits)</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Plant Staff Directory Table */}
        <div className="lg:col-span-2 rounded-xl border border-[#1F2E43] bg-[#101927] p-5 flex flex-col justify-between">
          <div>
            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#009FE3]" />
                  <span>Active Plant Personnel Directory ({filteredProfiles.length})</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-400">
                  Synchronized with Supabase PostgreSQL & Local Storage
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search ID or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#0A1018] border border-[#1F2E43] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#009FE3] w-36 sm:w-48 font-mono"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#0A1018] border border-[#1F2E43] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#009FE3] font-mono cursor-pointer"
                >
                  <option value="all" className="bg-[#101927] text-slate-200">All Roles</option>
                  <option value="operator" className="bg-[#101927] text-slate-200">Operator (OP)</option>
                  <option value="supervisor" className="bg-[#101927] text-slate-200">Supervisor (SV)</option>
                  <option value="qc_analyst" className="bg-[#101927] text-slate-200">QC Analyst (QC)</option>
                  <option value="qc_manager" className="bg-[#101927] text-slate-200">QC Manager (QM)</option>
                  <option value="admin" className="bg-[#101927] text-slate-200">Admin (AD)</option>
                  <option value="viewer" className="bg-[#101927] text-slate-200">Viewer / Audit (AU)</option>
                </select>
              </div>
            </div>

            {/* Table Container */}
            <div className="rounded-xl border border-[#1F2E43] overflow-x-auto bg-[#0A1018]">
              <table className="w-full text-left text-xs font-mono min-w-[700px]">
                <thead className="bg-[#101927] border-b border-[#1F2E43] text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Employee ID (employee_no)</th>
                    <th className="py-2.5 px-3.5 font-sans font-semibold">Staff Name (full_name)</th>
                    <th className="py-2.5 px-3.5">Role (role)</th>
                    <th className="py-2.5 px-3.5">Status (status)</th>
                    <th className="py-2.5 px-3.5">Password (password)</th>
                    <th className="py-2.5 px-3.5">Created Date (created_at)</th>
                    <th className="py-2.5 px-3.5 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2E43] bg-[#0A1018]">
                  {filteredProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No personnel found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProfiles.map((p) => {
                      const badge = roleStyles[p.role] || roleStyles.operator;
                      const isCurrent = p.employee_no === currentProfile.employee_no || p.id === currentProfile.id;
                      const isActive = p.status === 'active' || (p.status !== 'unactive' && p.active !== false);

                      return (
                        <tr key={p.employee_no || p.id} className="hover:bg-[#101927] transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-[#009FE3]">
                            {p.employee_no}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-200 font-sans font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{p.full_name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-[#009FE3]/20 text-[#009FE3] border border-[#009FE3]/40 px-1.5 py-0.2 rounded font-mono font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {p.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-400 text-[10px] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                                unactive
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#101927] border border-[#1F2E43] text-slate-300 text-[11px] font-mono">
                              {p.password || 'password123'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-400 text-[11px]">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleStatus(p.employee_no, isActive, p.full_name)}
                                  disabled={isCurrent}
                                  className={`text-[10px] px-2 py-1 rounded transition-colors font-semibold ${
                                    isCurrent
                                      ? 'opacity-30 cursor-not-allowed text-slate-500'
                                      : isActive
                                        ? 'text-red-600 hover:bg-rose-950/50 border border-rose-800/60 cursor-pointer'
                                        : 'text-green-600 hover:bg-emerald-950/50 border border-emerald-800/60 cursor-pointer'
                                  }`}
                                  title={isCurrent ? 'Cannot deactivate your own active account' : undefined}
                                >
                                  {isActive ? 'Set Unactive' : 'Set Active'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(p.employee_no, p.full_name)}
                                  disabled={isCurrent}
                                  className={`text-[10px] px-2 py-1 rounded transition-colors font-semibold flex items-center gap-1 ${
                                    isCurrent
                                      ? 'opacity-30 cursor-not-allowed text-slate-500'
                                      : 'text-red-600 hover:bg-rose-950/50 border border-rose-800/60 cursor-pointer shadow-xs'
                                  }`}
                                  title={isCurrent ? 'Cannot delete your own active administrator account' : `Permanently delete ${p.full_name} (${p.employee_no})`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Admin Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Footer Note */}
          <div className="mt-4 pt-3 border-t border-[#1F2E43] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>21 CFR Part 11 Audit Trail: All personnel additions and status modifications are permanently logged.</span>
            <span className="text-slate-500 font-medium">Nisshin Deodorizer · Lam Soon</span>
          </div>
        </div>

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
                    <span className="rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-800 font-semibold flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      OPTIMAL SAFE ZONE
                    </span>
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
                    1-Click Auto Archive & Prune (Automatik 2 Langkah Sekaligus)
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-mono bg-[#009FE3]/20 text-[#009FE3] border border-[#009FE3]/40 rounded font-bold">
                    FAST TRACK
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Sistem akan menjana & memuat turun sandaran (.json & .csv), terus membersihkan rekod lama di Supabase, dan membuka Google Drive secara automatik.
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
              <span>{isPruning ? 'Memproses...' : '⚡ Jalankan Auto Archive & Prune (1-Click)'}</span>
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
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#009FE3]/10 text-[#009FE3] border border-[#009FE3]/30 rounded font-semibold">
                  SAFETY LOCK
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Sebelum rekod lama dibersihkan daripada Supabase, muat turun salinan sandaran (backup). Pakej ini mengandungi fail JSON data mentah lengkap beserta ringkasan CSV untuk disimpan ke dalam <b>Google Drive</b> atau simpanan awan syarikat anda.
              </p>

              {/* Retention Policy Period Selector */}
              <div className="space-y-2 text-xs font-mono">
                <label className="block text-slate-500 font-semibold">
                  Select Retention Cutoff Policy:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Semua Rekod', desc: 'Full Backup (100% Data Semasa)' },
                    { id: 'today', label: 'Hari Ini', desc: 'Sehingga 22 Sep 2026' },
                    { id: '30', label: '30 Hari Lalu', desc: 'Rekod < 30 hari' },
                    { id: '90', label: '90 Hari Lalu', desc: 'Suku Tahun (Lalai)' },
                    { id: '180', label: '180 Hari Lalu', desc: 'Setengah Tahun' },
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
                    <div className="font-bold text-xs">Tarikh Custom</div>
                    <div className={`text-[10px] ${retentionPreset === 'custom' ? 'text-sky-100' : 'text-slate-500'}`}>Pilih Sendiri</div>
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
                  {retentionPreset === 'all' ? 'SEMUA REKOD (TIADA HAD TARIKH)' : getEffectiveCutoffDate()}
                </span>
              </div>

              {/* Dynamic Live Preview Box */}
              {(() => {
                const effectiveCutoff = getEffectiveCutoffDate();
                const preview = getArchivePreviewCounts(effectiveCutoff, retentionPreset === 'all');
                return (
                  <div className="p-3.5 rounded-lg bg-[#0A1018] border border-[#1F2E43] space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-medium">Kandungan Rekod Untuk Dieksport:</span>
                      <span className={`px-2.5 py-0.5 rounded font-bold ${preview.total > 0 ? 'bg-[#009FE3]/20 text-[#009FE3] border border-[#009FE3]/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800'}`}>
                        {preview.total} Rekod Ditemui
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
                          <b>Kenapa 0 Rekod?</b> Semua data loji dalam sistem sekarang bertarikh <b>September 2026</b>. Dasar had tarikh yang dipilih ({effectiveCutoff}) hanya mencari rekod lama sebelum tarikh tersebut. Sila pilih preset <b>"Semua Rekod"</b> atau <b>"Hari Ini"</b> di atas untuk memuat turun semua rekod ke dalam fail Excel & JSON anda.
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-green-600 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span>Fail Excel (.csv) & .json akan mengandungi kesemua {preview.total} rekod ini secara lengkap.</span>
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
                  <span>📥 Muat Turun Full Plant Backup (.JSON + .CSV) — Semua Rekod Semasa</span>
                </button>

                {retentionPreset !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleDownloadArchive(false)}
                    className="w-full flex items-center justify-center gap-2 border border-[#1F2E43] bg-[#0A1018] text-[#009FE3] hover:bg-[#172235] font-semibold py-2.5 px-4 rounded-lg text-xs font-mono transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Muat Turun Sandaran Mengikut Had ({getEffectiveCutoffDate()})</span>
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
                    Tindakan pembersihan (prune) disekat sehingga anda menyelesaikan <b>STEP 1</b> (Muat Turun Sandaran). Ini bagi menjamin tiada kehilangan data operasi yang tidak disengajakan.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs font-mono space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Pengesahan Pembersihan Data:</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                    Semua rekod Sample Reports (berstatus <i>decided</i>) dan Deviations sebelum <b>{getEffectiveCutoffDate()}</b> akan dipadam daripada Supabase. Shift Sheet aktif, profil pengguna, dan spesifikasi produk KEKAL selamat.
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
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!modalIsSubmitting) {
              setConfirmModal(null);
              setModalPasswordInput('');
            }
          }}
        >
          <div 
            className="relative max-w-md w-full bg-[#101927] border border-[#1F2E43] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
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
                  className="px-4 py-2.5 rounded-lg border border-[#1F2E43] bg-[#0A1018] hover:bg-[#172235] text-slate-300 font-mono text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal / Cancel
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
                  className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirmModal.confirmButtonVariant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500 border border-rose-500/50'
                      : confirmModal.confirmButtonVariant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500 border border-amber-500/50'
                      : 'bg-[#009FE3] hover:bg-[#0089C4] border border-[#009FE3]/50'
                  }`}
                >
                  {modalIsSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Memproses...</span>
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
