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
  const [retentionPreset, setRetentionPreset] = useState<'30' | '90' | '180' | '365' | 'custom'>('90');
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
    if (retentionPreset === 'custom') return customCutoffDate;
    const days = parseInt(retentionPreset, 10);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const handleDownloadArchive = () => {
    try {
      const cutoff = getEffectiveCutoffDate();
      const pkg = generateFullArchivePackage(cutoff);

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
        text: `✓ Cold Storage Backup downloaded (${pkg.recordsArchivedCount} records packaged). You can now upload this file to Google Drive. Step 2 (Pruning) is unlocked!`
      });
    } catch (err: any) {
      setPruneStatusMessage({
        type: 'error',
        text: `Failed to generate archive package: ${err?.message || 'Unknown error'}`
      });
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
    operator: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-600/40' },
    supervisor: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-600/40' },
    qc_analyst: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-600/40' },
    qc_manager: { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-600/40' },
    admin: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-600/40' },
    viewer: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' },
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0b1329] to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-950/50">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                Plant Administration & User Management
              </h1>
              <span className="rounded-full bg-blue-950/80 px-2.5 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/30 font-semibold">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/40 text-xs font-mono transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Fetch and synchronize latest user profiles directly with Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Supabase'}</span>
          </button>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Current User:</span>
            <span className="text-xs font-semibold text-white font-mono">
              {currentProfile.full_name} ({currentProfile.employee_no})
            </span>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${roleStyles[currentRole]?.bg} ${roleStyles[currentRole]?.text} ${roleStyles[currentRole]?.border}`}>
            {currentRole}
          </span>
        </div>
      </div>

      {/* Admin Section Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveAdminSubTab('personnel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeAdminSubTab === 'personnel'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-950/60 border border-blue-400/40'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="h-4 w-4 text-cyan-400" />
          <span>Personnel & Access Control</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveAdminSubTab('retention');
            refreshStorage();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
            activeAdminSubTab === 'retention'
              ? 'bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-md shadow-emerald-950/60 border border-emerald-400/40'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <HardDrive className="h-4 w-4 text-emerald-300" />
          <span>Data Retention & Supabase Prune Policy</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-600/40 rounded font-mono font-bold">
            500 MB PROTECT
          </span>
        </button>
      </div>

      {activeAdminSubTab === 'personnel' ? (
        <>
          {/* RBAC Warning Banner if not Admin */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">RESTRICTED VIEW MODE:</span> You are logged in with role <span className="uppercase text-amber-300 font-bold">[{currentRole}]</span>. Staff registration and status modification are restricted to the Plant Administrator (*Admin*).
            </div>
          </div>
          <button
            onClick={handleSwitchToAdmin}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap transition-colors shadow-md shadow-blue-950/50 cursor-pointer text-xs"
          >
            Switch to Admin Profile (AD-5010)
          </button>
        </div>
      )}

      {/* Notification Banner */}
      {statusMessage && (
        <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-mono ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-700 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Total Staff</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Registered in plant</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-emerald-400 uppercase">Operator (OP)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{operatorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series OP-1xxx</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-amber-400 uppercase">Supervisor (SV)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{supervisorCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series SV-2xxx</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-cyan-400 uppercase">QC Laboratory (QC/QM)</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{qcCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series QC-3xxx / QM-4xxx</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-blue-400 uppercase">Admin & Audit (AD/AU)</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">{adminCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Series AD-5xxx / AU-9xxx</div>
        </div>
      </div>

      {/* Main Grid: Add User (Admin Exclusive) & ID Standards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Add User Form (Admin Exclusive) */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <UserPlus className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Register New Staff Member
              </h2>
              <span className="text-[10px] font-mono text-slate-500">
                Exclusive Plant Administrator Function (Admin)
              </span>
            </div>
          </div>

          <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs font-mono">
            {/* Role Select */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Assigned Role / Department:
              </label>
              <select
                disabled={!isAdmin}
                value={selectedRole}
                onChange={(e) => handleRoleSelectChange(e.target.value as UserRole)}
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 cursor-pointer"
              >
                <option value="operator">Plant Operator (RF-FR-004 · Series OP-1xxx)</option>
                <option value="supervisor">Shift Supervisor (Series SV-2xxx)</option>
                <option value="qc_analyst">QC Laboratory Analyst (Series QC-3xxx)</option>
                <option value="qc_manager">Quality Control Manager (Series QM-4xxx)</option>
                <option value="admin">Plant Administrator / Admin (Series AD-5xxx)</option>
                <option value="viewer">Quality Auditor (ISO/HACCP · Series AU-9xxx)</option>
              </select>
            </div>

            {/* Auto Generated Consistent ID Preview */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Auto-Generated Sequential Employee ID (Plant Standard):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={autoId}
                  className="w-full bg-slate-900 border border-cyan-500/60 rounded-xl px-3 py-2 text-cyan-300 font-bold tracking-wider cursor-not-allowed"
                />
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-2 rounded-xl border border-emerald-800 whitespace-nowrap">
                  Auto-Sequential
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                System detects highest existing series ID and auto-increments by +1.
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Staff Full Name:
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                required
                placeholder="e.g. Muhammad Faizal bin Roslan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-sm font-sans text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
            </div>

            {/* Temporary Initial Password */}
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                Initial Default Password:
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default standard: `password123`. Personnel can change after sign-in.
              </span>
            </div>

            <button
              type="submit"
              disabled={!isAdmin || isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-blue-950/60 mt-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <UserPlus className="h-4 w-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Staff & Generate Credentials'}</span>
            </button>
          </form>

          {/* Standards Summary Card */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>CONSISTENT NUMBERING SCHEME:</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-[10px]">
              <li>• <b className="text-emerald-400">OP-1xxx</b>: Plant Shift Operator (Morning/Evening/Night)</li>
              <li>• <b className="text-amber-400">SV-2xxx</b>: Shift Supervisor (Sheet Verification)</li>
              <li>• <b className="text-cyan-400">QC-3xxx</b>: Lab Analyst (FFA/IV/Colour/SFC Testing)</li>
              <li>• <b className="text-purple-400">QM-4xxx</b>: Quality Manager (Product Disposition)</li>
              <li>• <b className="text-blue-400">AD-5xxx</b>: Plant Administrator & Specification Config</li>
              <li>• <b className="text-slate-300">AU-9xxx</b>: External Auditor (ISO Record Audits)</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Plant Staff Directory Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <span>Active Plant Personnel Directory ({filteredProfiles.length})</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500">
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
                    className="bg-[#090d16] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-48 font-mono"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="operator">Operator (OP)</option>
                  <option value="supervisor">Supervisor (SV)</option>
                  <option value="qc_analyst">QC Analyst (QC)</option>
                  <option value="qc_manager">QC Manager (QM)</option>
                  <option value="admin">Admin (AD)</option>
                  <option value="viewer">Viewer / Audit (AU)</option>
                </select>
              </div>
            </div>

            {/* Table Container */}
            <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-900/40">
              <table className="w-full text-left text-xs font-mono min-w-[700px]">
                <thead className="bg-[#090d16] border-b border-slate-800 text-slate-400 text-[11px]">
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
                <tbody className="divide-y divide-slate-800/60">
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
                        <tr key={p.employee_no || p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-cyan-400">
                            {p.employee_no}
                          </td>
                          <td className="py-2.5 px-3.5 text-white font-sans font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{p.full_name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-mono">
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
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-[10px] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-400 text-[10px] font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                                unactive
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#0b111e] border border-slate-700/60 text-slate-300 text-[11px] font-mono">
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
                                        ? 'text-rose-400 hover:bg-rose-950/60 hover:text-rose-200 border border-rose-800/40 cursor-pointer'
                                        : 'text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-200 border border-emerald-800/40 cursor-pointer'
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
                                      : 'text-red-400 hover:bg-red-950/80 hover:text-red-200 border border-red-900/60 hover:border-red-600/70 cursor-pointer shadow-sm'
                                  }`}
                                  title={isCurrent ? 'Cannot delete your own active administrator account' : `Permanently delete ${p.full_name} (${p.employee_no})`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-600">Admin Only</span>
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
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>21 CFR Part 11 Audit Trail: All personnel additions and status modifications are permanently logged.</span>
            <span className="text-slate-400">Nisshin Deodorizer · Lam Soon</span>
          </div>
        </div>

      </div>
      </>
      ) : (
        /* Retention & Supabase Prune Sub-Tab View */
        <div className="space-y-6">
          {/* RBAC Warning if not Admin */}
          {!isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">RESTRICTED ACCESS:</span> Data retention archiving and database pruning are restricted exclusively to the Plant Administrator (*Admin*).
                </div>
              </div>
              <button
                onClick={handleSwitchToAdmin}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold whitespace-nowrap transition-colors shadow-md shadow-blue-950/50 cursor-pointer text-xs"
              >
                Switch to Admin Profile (AD-5010)
              </button>
            </div>
          )}

          {/* Retention Notification Banner */}
          {pruneStatusMessage && (
            <div className={`flex items-center justify-between p-4 rounded-xl border text-xs font-mono ${
              pruneStatusMessage.type === 'success' 
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' 
                : 'bg-rose-950/60 border-rose-700 text-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {pruneStatusMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{pruneStatusMessage.text}</span>
              </div>
              <button 
                onClick={() => setPruneStatusMessage(null)}
                className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Database Health & Capacity Meter */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0b1528] to-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/50">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-wide">
                      Supabase PostgreSQL Storage Capacity & Health
                    </h2>
                    <span className="rounded-full bg-emerald-950/90 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/40 font-semibold flex items-center gap-1.5">
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
                <div className="text-sm font-bold text-white">500.0 MB <span className="text-slate-500 text-xs font-normal">(Supabase Limit)</span></div>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Storage Used: <b className="text-cyan-400 font-bold">{((storageMetrics?.estimatedStorageUsedKB || 28672) / 1024).toFixed(2)} MB</b> / 500.0 MB
                </span>
                <span className="text-emerald-400 font-bold">
                  {storageMetrics?.safeLimitPercentage || 5.72}% Used · {(500 - ((storageMetrics?.estimatedStorageUsedKB || 28672) / 1024)).toFixed(1)} MB Safe Headroom
                </span>
              </div>
              <div className="w-full bg-slate-950/80 rounded-full h-3.5 border border-slate-800 p-0.5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 transition-all duration-500 shadow-sm shadow-emerald-500/50"
                  style={{ width: `${Math.max(storageMetrics?.safeLimitPercentage || 5.72, 3)}%` }}
                />
              </div>
            </div>

            {/* Storage Item Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-slate-400 uppercase">QC Sample Reports</div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                  {storageMetrics?.totalReports || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {storageMetrics?.decidedReports || 0} decided (eligible)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-emerald-400 uppercase">Active Shift Sheet</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  {storageMetrics?.activeSheetEntries || 0}
                </div>
                <div className="text-[10px] text-emerald-500/80 mt-0.5 font-mono">
                  🛡️ Always Protected
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-amber-400 uppercase">Quality Deviations</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {storageMetrics?.deviationsCount || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  CAPA & out-of-spec logs
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-purple-400 uppercase">Audit Trail (CFR 21)</div>
                <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                  {storageMetrics?.auditLogsCount || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Tamper-evident events
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] font-mono text-blue-400 uppercase">Staff Accounts</div>
                <div className="text-lg font-bold font-mono text-blue-400 mt-0.5">
                  {storageMetrics?.profilesCount || 0}
                </div>
                <div className="text-[10px] text-blue-400/70 mt-0.5 font-mono">
                  🔒 Master Data (Permanent)
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Fast-Track Auto Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-[#0d2218] to-slate-900 border border-emerald-500/50 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-md shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    1-Click Auto Archive & Prune (Automatik 2 Langkah Sekaligus)
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-mono bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded font-bold">
                    FAST TRACK
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  Sistem akan menjana & memuat turun sandaran (.json & .csv), terus membersihkan rekod lama di Supabase, dan membuka Google Drive secara automatik.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!isAdmin || isPruning}
              onClick={handleOneClickAutoPrune}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs font-mono transition-all shadow-lg shadow-emerald-950/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Zap className="h-4 w-4" />
              <span>{isPruning ? 'Memproses...' : '⚡ Jalankan Auto Archive & Prune (1-Click)'}</span>
            </button>
          </div>

          {/* 2-Step Safe Archive & Prune Workflow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* STEP 1: Cold Storage Export (Google Drive Archive) */}
            <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-xl backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      STEP 1: Export to Cold Storage (Google Drive)
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-400">
                      Mandatory Pre-Prune Backup · Zero Data Loss Guarantee
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-semibold">
                  SAFETY LOCK
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Sebelum rekod lama dibersihkan daripada Supabase, muat turun salinan sandaran (backup). Pakej ini mengandungi fail JSON data mentah lengkap beserta ringkasan CSV untuk disimpan ke dalam <b>Google Drive</b> atau simpanan awan syarikat anda.
              </p>

              {/* Retention Policy Period Selector */}
              <div className="space-y-2 text-xs font-mono">
                <label className="block text-slate-300 font-semibold">
                  Select Retention Cutoff Policy:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '30', label: '30 Days', desc: '1 Month' },
                    { id: '90', label: '90 Days', desc: '1 Quarter (Recommended)' },
                    { id: '180', label: '180 Days', desc: '6 Months' },
                    { id: '365', label: '365 Days', desc: '1 Year' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setRetentionPreset(preset.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        retentionPreset === preset.id
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-xs">{preset.label}</div>
                      <div className="text-[10px] text-slate-500">{preset.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Date Picker */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setRetentionPreset('custom')}
                    className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      retentionPreset === 'custom'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Custom Cutoff Date
                  </button>

                  {retentionPreset === 'custom' && (
                    <div className="mt-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-cyan-400" />
                      <input
                        type="date"
                        value={customCutoffDate}
                        onChange={(e) => setCustomCutoffDate(e.target.value)}
                        className="bg-[#090d16] border border-cyan-500/60 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Effective Cutoff Date Banner */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Effective Prune Cutoff Date:</span>
                <span className="text-cyan-400 font-bold bg-[#090d16] px-2.5 py-1 rounded border border-slate-700">
                  {getEffectiveCutoffDate()}
                </span>
              </div>

              {/* Download Action */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadArchive}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl text-xs font-mono transition-all shadow-lg shadow-cyan-950/60 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Cold Storage Archive (.JSON + .CSV)</span>
                </button>

                {/* Google Drive Direct Link */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Archive className="h-4 w-4 text-amber-400" />
                    <span>Upload downloaded file to Google Drive:</span>
                  </div>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold transition-colors border border-slate-700"
                  >
                    <span>Open Google Drive</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {hasDownloadedBackup && downloadedPackageInfo && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>
                      Archive generated: <b>{downloadedPackageInfo.filename}.json</b> ({downloadedPackageInfo.count} records). Step 2 is now unlocked!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2: Prune Supabase Database (Protected) */}
            <div className={`rounded-2xl border ${
              hasDownloadedBackup ? 'border-amber-600/70 bg-[#121524]' : 'border-slate-800 bg-[#0f172a]/50'
            } p-5 shadow-xl backdrop-blur-sm space-y-4`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    hasDownloadedBackup 
                      ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400' 
                      : 'bg-slate-800 border border-slate-700 text-slate-500'
                  } font-bold text-xs`}>
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      STEP 2: Execute Supabase Database Prune
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      Admin Electronic Signature & 21 CFR Part 11 Audit Trail
                    </span>
                  </div>
                </div>
                {hasDownloadedBackup ? (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-700 rounded font-bold animate-pulse">
                    UNLOCKED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-900 text-slate-500 border border-slate-800 rounded font-bold">
                    LOCKED
                  </span>
                )}
              </div>

              {!hasDownloadedBackup ? (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <Lock className="h-4 w-4" />
                    <span>Safety Protection Active</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Tindakan pembersihan (prune) disekat sehingga anda menyelesaikan <b>STEP 1</b> (Muat Turun Sandaran). Ini bagi menjamin tiada kehilangan data operasi yang tidak disengajakan.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs font-mono space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Pengesahan Pembersihan Data:</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed font-sans">
                    Semua rekod Sample Reports (berstatus <i>decided</i>) dan Deviations sebelum <b>{getEffectiveCutoffDate()}</b> akan dipadam daripada Supabase. Shift Sheet aktif, profil pengguna, dan spesifikasi produk KEKAL selamat.
                  </p>
                </div>
              )}

              {/* Prune Form */}
              <form onSubmit={handleExecutePrune} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
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
                      className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Confirms authorization per ISO 9001:2015 §8.5.3 (Control of Outputs).
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!hasDownloadedBackup || !isAdmin || isPruning || !prunePassword.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 hover:from-red-600 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl text-xs font-mono transition-all shadow-lg shadow-red-950/60 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {isPruning ? 'Pruning Supabase Database...' : `Permanently Prune Records Before ${getEffectiveCutoffDate()}`}
                  </span>
                </button>
              </form>

              {/* Audit & Compliance Standards Card */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
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
            className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-3 flex items-start gap-3 ${
              t.type === 'success'
                ? 'bg-[#061e16]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/60'
                : t.type === 'warning'
                ? 'bg-[#261704]/95 border-amber-500/40 text-amber-100 shadow-amber-950/60'
                : t.type === 'error'
                ? 'bg-[#27080c]/95 border-rose-500/40 text-rose-100 shadow-rose-950/60'
                : 'bg-[#081726]/95 border-cyan-500/40 text-cyan-100 shadow-cyan-950/60'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-400" />}
              {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold font-mono tracking-wide uppercase">
                  {t.title}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => {
            if (!modalIsSubmitting) {
              setConfirmModal(null);
              setModalPasswordInput('');
            }
          }}
        >
          <div 
            className="relative max-w-md w-full bg-[#0a0f1d] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient highlight strip */}
            <div 
              className={`h-1.5 w-full ${
                confirmModal.type === 'danger'
                  ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500'
                  : confirmModal.type === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500'
              }`} 
            />

            <div className="p-6 space-y-4">
              {/* Header with icon and title */}
              <div className="flex items-start gap-3.5">
                <div 
                  className={`p-3 rounded-2xl shrink-0 shadow-lg ${
                    confirmModal.type === 'danger'
                      ? 'bg-red-500/15 border border-red-500/30 text-red-400 shadow-red-950/50'
                      : confirmModal.type === 'warning'
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-amber-950/50'
                      : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-cyan-950/50'
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
                          ? 'bg-red-950/60 text-red-300 border-red-800/60'
                          : confirmModal.type === 'warning'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                      }`}
                    >
                      {confirmModal.badgeText}
                    </span>
                  )}
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {confirmModal.description}
                  </p>
                </div>
              </div>

              {/* Staff details card if available */}
              {confirmModal.details?.name && (
                <div className="bg-[#060b14] border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Maklumat Kakitangan Terlibat:
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-100">
                      {confirmModal.details.name}
                    </div>
                    {confirmModal.details.employeeNo && (
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-0.5 rounded-lg">
                        {confirmModal.details.employeeNo}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Extra note or consequences */}
              {confirmModal.details?.extraNote && (
                <div 
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    confirmModal.type === 'danger'
                      ? 'bg-red-950/30 border-red-900/50 text-red-200'
                      : confirmModal.type === 'warning'
                      ? 'bg-amber-950/30 border-amber-900/50 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
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
                  <label className="text-[11px] font-mono text-slate-400 block font-semibold">
                    Kata Laluan Pentadbir (Admin Authorization):
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={modalPasswordInput}
                      onChange={(e) => setModalPasswordInput(e.target.value)}
                      placeholder={confirmModal.passwordPlaceholder || 'Kata laluan pentadbir...'}
                      className="w-full bg-[#060b14] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={modalIsSubmitting}
                  onClick={() => {
                    setConfirmModal(null);
                    setModalPasswordInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs transition-colors cursor-pointer disabled:opacity-50"
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
                  className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    confirmModal.confirmButtonVariant === 'danger'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-950/60'
                      : confirmModal.confirmButtonVariant === 'warning'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/60'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-950/60'
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
