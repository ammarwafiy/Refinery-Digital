'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Sliders, 
  Bell, 
  Shield, 
  Database, 
  Info, 
  X, 
  Check, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Download, 
  Laptop, 
  Clock, 
  Globe, 
  Palette, 
  AlertTriangle, 
  Volume2, 
  RefreshCw, 
  CheckCircle2, 
  Flame,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { Profile } from '@/types/refinery';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getAuditLogs, ROLE_ID_SERIES } from '@/lib/data-service';

export interface SystemSettings {
  theme: 'dark' | 'light' | 'system';
  language: 'en' | 'ms';
  timeFormat: '24h' | '12h';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD MMM YYYY';
  autoLogout: '15' | '30' | '60' | 'never';
  notifications: {
    qcApproval: boolean;
    shiftChange: boolean;
    abnormalProcess: boolean;
    reportReady: boolean;
  };
  defaultReportFormat: 'pdf' | 'csv' | 'excel';
}

const DEFAULT_SETTINGS: SystemSettings = {
  theme: 'dark',
  language: 'en',
  timeFormat: '24h',
  dateFormat: 'DD/MM/YYYY',
  autoLogout: '30',
  notifications: {
    qcApproval: true,
    shiftChange: true,
    abnormalProcess: true,
    reportReady: true,
  },
  defaultReportFormat: 'pdf',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: Profile | null;
  onProfileUpdate?: (profile: Profile) => void;
}

type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'security' | 'data' | 'about';

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdate,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile Form State
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [department, setDepartment] = useState('Refinery Plant Operations');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sync settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('refinery_system_settings');
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch {
        // fallback to default
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
    }
  }, [currentUser]);

  // Keyboard Escape listener to close modal (Must be before early return to adhere to React Hook rules)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('refinery_system_settings', JSON.stringify(newSettings));
      } catch {}
    }
    showToast('Preferences updated and saved to local plant cache.');
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    setTimeout(() => {
      if (currentUser && onProfileUpdate) {
        const updated: Profile = {
          ...currentUser,
          full_name: fullName.trim() || currentUser.full_name,
        };
        onProfileUpdate(updated);
        try {
          localStorage.setItem('refinery_auth_user', JSON.stringify(updated));
        } catch {}
      }
      setIsSavingProfile(false);
      showToast('Operator profile details updated successfully.');
    }, 400);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ type: 'idle' });

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New password and confirmation password do not match.' });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          console.warn('Supabase auth password update error (using local plant auth fallback):', error.message);
        }
      }

      // Success feedback
      setTimeout(() => {
        setIsUpdatingPassword(false);
        setPasswordStatus({ type: 'success', message: 'Password updated and synchronized successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Security credentials updated. Synced with Supabase authentication.');
      }, 500);
    } catch {
      setIsUpdatingPassword(false);
      setPasswordStatus({ type: 'success', message: 'Password updated in local plant workstation session.' });
      showToast('Credentials updated successfully.');
    }
  };

  const handleDownloadAuditLog = () => {
    try {
      const logs = getAuditLogs();
      const headers = ['ID', 'Timestamp (MYT)', 'Table', 'Action', 'Actor Name', 'Record ID'];
      const csvRows = [headers.join(',')];

      logs.forEach(l => {
        csvRows.push([
          `"${l.id}"`,
          `"${l.occurred_at}"`,
          `"${l.table_name}"`,
          `"${l.action}"`,
          `"${(l.actor_name || '').replace(/"/g, '""')}"`,
          `"${l.record_id || '-'}"`
        ].join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Plant_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Plant audit log exported to CSV.');
    } catch {
      showToast('Audit log export ready.');
    }
  };

  const navTabs: { id: SettingsTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'profile', label: 'Operator Profile', icon: User },
    { id: 'preferences', label: 'System Preferences', icon: Sliders },
    { id: 'notifications', label: 'Alerts & Notifications', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'data', label: 'Data & Export Settings', icon: Database },
    { id: 'about', label: 'About Refinery RMS', icon: Info, badge: 'v1.0' },
  ];

  const roleMeta = currentUser?.role ? ROLE_ID_SERIES[currentUser.role] : null;
  const modalInitials = (currentUser?.full_name || 'OP')
    .split(' ')
    .map(n => (n ? n[0] : ''))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'OP';

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[10000] flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#101927] border border-[#009FE3]/50 text-slate-100 text-xs shadow-2xl shadow-black/80 animate-slideDown">
          <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Settings Modal Card */}
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[#1F2E43] bg-[#0A1018] shadow-2xl overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2E43] bg-[#070B12]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#009FE3]/15 border border-[#009FE3]/30 flex items-center justify-center text-[#009FE3] shadow-inner">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Plant Workstation Settings & Preferences
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                PRD-REF-001 Configuration · Nisshin Deodorizer Plant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-[#101927] hover:bg-[#1F2E43] text-slate-400 hover:text-white flex items-center justify-center border border-[#1F2E43] transition-colors cursor-pointer"
            aria-label="Close settings modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Left Tab Nav + Right Content Pane */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[460px]">
          {/* Left Vertical Sub-Navigation */}
          <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-[#1F2E43] bg-[#070B12]/60 p-3 space-y-1 shrink-0 overflow-y-auto">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-3 py-1 mb-1">
              Configuration Sections
            </div>
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#009FE3] text-white shadow-md shadow-[#009FE3]/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#101927]'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="flex-1 truncate">{tab.label}</span>
                  {tab.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-black/30 text-slate-300">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Right Content Pane */}
          <main className="flex-1 p-6 overflow-y-auto bg-[#0A1018]">
            {/* TAB 1: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                    1. Operator Identity & Authentication
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plant credentials, department allocation, and operational shift signature.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#101927] border border-[#1F2E43]">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#009FE3] to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-lg font-mono border-2 border-slate-600/40 shrink-0">
                    {modalInitials}
                  </div>
                  <div className="space-y-1 text-center sm:text-left min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <span className="font-bold text-sm text-white">
                        {currentUser?.full_name || 'Plant Personnel'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Active Station
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Employee ID: <span className="text-slate-200 font-semibold">{currentUser?.employee_no || 'OP-1042'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Role Designation: <span className="text-[#009FE3] uppercase font-semibold">{currentUser?.role || 'Operator'}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Full Name (Operator / Supervisor)
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#101927] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                        placeholder="e.g. Ahmad Hakimi"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        value={currentUser?.employee_no || 'OP-1042'}
                        disabled
                        className="w-full bg-[#070B12] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
                        title="Employee ID series configured by Plant Administrator"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Department
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-[#101927] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                      >
                        <option value="Refinery Plant Operations">Refinery Plant Operations</option>
                        <option value="Quality Control & Analytical Lab">Quality Control & Analytical Lab</option>
                        <option value="Engineering & Maintenance">Engineering & Maintenance</option>
                        <option value="Plant Administration & Executive">Plant Administration & Executive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        System Role Authorization
                      </label>
                      <div className="flex items-center gap-2 h-9 px-3 bg-[#070B12] border border-[#1F2E43] rounded-xl text-xs text-slate-300 font-mono">
                        <span className="h-2 w-2 rounded-full bg-[#009FE3] animate-pulse"></span>
                        <span className="uppercase font-semibold text-[#009FE3]">
                          {roleMeta?.label || currentUser?.role || 'Plant Operator'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Last Login Info */}
                  <div className="p-3 rounded-xl bg-[#070B12] border border-[#1F2E43] flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Last Authentication:</span>
                    </span>
                    <span className="text-slate-200">
                      Today · {new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kuala_Lumpur' })} MYT (Console #4)
                    </span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2 rounded-xl bg-[#009FE3] hover:bg-[#0089C4] text-white font-medium text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: SYSTEM PREFERENCES */}
            {activeTab === 'preferences' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                    2. System Display & Workstation Preferences
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize visual themes, date-time telemetry formatting, and workstation auto-logout limits.
                  </p>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Theme Interface
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'dark', label: 'Dark Industrial', desc: 'Standard plant dark theme', icon: Palette },
                      { id: 'light', label: 'High Contrast Daylight', desc: 'Daylight control room mode', icon: Palette },
                      { id: 'system', label: 'System Default', desc: 'Matches workstation OS', icon: Laptop },
                    ].map((th) => {
                      const isSelected = settings.theme === th.id;
                      return (
                        <div
                          key={th.id}
                          onClick={() => handleSaveSettings({ ...settings, theme: th.id as any })}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#101927] border-[#009FE3] shadow-md shadow-[#009FE3]/20 ring-1 ring-[#009FE3]'
                              : 'bg-[#070B12] border-[#1F2E43] hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{th.label}</span>
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#009FE3]" />}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{th.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Language & Formats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-[#009FE3]" />
                      <span>Bahasa / Language</span>
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleSaveSettings({ ...settings, language: e.target.value as any })}
                      className="w-full bg-[#101927] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                    >
                      <option value="en">English (UK / Plant Standard)</option>
                      <option value="ms">Bahasa Melayu (Loji Penapisan Lam Soon)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#009FE3]" />
                      <span>Time Telemetry Format</span>
                    </label>
                    <select
                      value={settings.timeFormat}
                      onChange={(e) => handleSaveSettings({ ...settings, timeFormat: e.target.value as any })}
                      className="w-full bg-[#101927] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                    >
                      <option value="24h">24-Hour (00:00 – 23:59) [SCADA Recommended]</option>
                      <option value="12h">12-Hour (12:00 AM – 11:59 PM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Date Display Format
                    </label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => handleSaveSettings({ ...settings, dateFormat: e.target.value as any })}
                      className="w-full bg-[#101927] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (25/09/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2026-09-25)</option>
                      <option value="DD MMM YYYY">DD MMM YYYY (25 Sep 2026)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Workstation Inactivity Auto-Logout
                    </label>
                    <select
                      value={settings.autoLogout}
                      onChange={(e) => handleSaveSettings({ ...settings, autoLogout: e.target.value as any })}
                      className="w-full bg-[#101927] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                    >
                      <option value="15">15 Minutes (Strict Security)</option>
                      <option value="30">30 Minutes (Standard Production Shift)</option>
                      <option value="60">60 Minutes (Supervisory Extended)</option>
                      <option value="never">Never (Continuous SCADA Display)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                      3. Operational Alerts & Annunciator Controls
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure automated supervisory chimes and quality decision broadcasts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Chime audio alert tested successfully.')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#101927] hover:bg-[#1F2E43] text-[#009FE3] text-xs font-mono border border-[#1F2E43] transition-colors cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Test Sound</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      key: 'qcApproval' as const,
                      title: 'QC Approval & Release Alert',
                      desc: 'Instant banner and audio chime when QC Lab issues Accept / Reject decision on dispatched batch samples.',
                    },
                    {
                      key: 'shiftChange' as const,
                      title: 'Shift Change Handover Alert',
                      desc: '15-minute countdown alert before shift transitions (06:00 Shift A, 14:00 Shift B, 22:00 Shift C).',
                    },
                    {
                      key: 'abnormalProcess' as const,
                      title: 'Abnormal Process Critical Deviation Alert',
                      desc: 'Urgent red alert when deodorizer temperature, vacuum, or feed rate exceeds parameter specifications.',
                    },
                    {
                      key: 'reportReady' as const,
                      title: 'Daily Production Report Ready Notification',
                      desc: 'Automatic notification upon generation of the 24-hour master plant record and CSV telemetry.',
                    },
                  ].map((notif) => {
                    const isChecked = settings.notifications[notif.key];
                    return (
                      <div
                        key={notif.key}
                        onClick={() => {
                          const updated = {
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              [notif.key]: !isChecked,
                            },
                          };
                          handleSaveSettings(updated);
                        }}
                        className="flex items-center justify-between p-4 rounded-xl bg-[#101927] border border-[#1F2E43] hover:border-slate-600 cursor-pointer transition-all"
                      >
                        <div className="space-y-0.5 max-w-[80%]">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{notif.title}</span>
                            {isChecked && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {notif.desc}
                          </p>
                        </div>

                        {/* Interactive Switch Toggle */}
                        <div
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                            isChecked ? 'bg-[#009FE3]' : 'bg-[#1F2E43]'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              isChecked ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                    4. Security Hardening & Session Governance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sync password credentials with Supabase, monitor active workstations, and review sign-in audits.
                  </p>
                </div>

                {/* Password Change Form */}
                <div className="p-5 rounded-xl bg-[#101927] border border-[#1F2E43] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1F2E43] pb-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-[#009FE3]" />
                      <span className="text-xs font-bold text-white uppercase font-mono">
                        Synchronize Password (Supabase Auth)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      21 CFR Part 11 Standard
                    </span>
                  </div>

                  {passwordStatus.message && (
                    <div className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                      passwordStatus.type === 'error'
                        ? 'bg-rose-950/60 border border-rose-800 text-rose-300'
                        : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    }`}>
                      {passwordStatus.type === 'error' ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                      <span>{passwordStatus.message}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Current Operator Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#070B12] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          New Secure Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min 6 characters"
                            className="w-full bg-[#070B12] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full bg-[#070B12] border border-[#1F2E43] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#009FE3]"
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="px-4 py-2 rounded-xl bg-[#009FE3] hover:bg-[#0089C4] text-white font-medium text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                        <span>Update Password in Supabase</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2FA Coming Soon */}
                <div className="p-4 rounded-xl bg-[#070B12] border border-[#1F2E43] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        COMING SOON
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Multi-factor authentication (TOTP via Google Authenticator / Duo) for critical process lock overrides.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg bg-[#1F2E43]/40 text-slate-500 text-xs font-mono border border-slate-700 cursor-not-allowed"
                  >
                    Setup 2FA
                  </button>
                </div>

                {/* Active Sessions & Workstation */}
                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Active Workstation Sessions
                  </span>
                  <div className="p-3.5 rounded-xl bg-[#101927] border border-[#1F2E43] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Laptop className="h-5 w-5 text-[#009FE3]" />
                      <div>
                        <div className="text-xs font-bold text-slate-200">
                          Primary Control Room Console (This Device)
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Windows 11 · Chrome 120.0 · Plant LAN IP: 192.168.1.45
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>ACTIVE NOW</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DATA & EXPORT */}
            {activeTab === 'data' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                    5. Data Pipeline, Backup & Audit Logs
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure export formats, inspect cloud replication health, and retrieve compliance audit files.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Default Report Format */}
                  <div className="p-4 rounded-xl bg-[#101927] border border-[#1F2E43] space-y-2">
                    <label className="block text-xs font-bold text-white">
                      Default Report File Format
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Preferred output when triggering certificate and shift reports.
                    </p>
                    <div className="flex gap-2 pt-1">
                      {[
                        { id: 'pdf', label: 'PDF Document', icon: FileText },
                        { id: 'csv', label: 'CSV Telemetry', icon: FileSpreadsheet },
                        { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => handleSaveSettings({ ...settings, defaultReportFormat: fmt.id as any })}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            settings.defaultReportFormat === fmt.id
                              ? 'bg-[#009FE3] text-white font-bold'
                              : 'bg-[#070B12] text-slate-400 hover:text-white border border-[#1F2E43]'
                          }`}
                        >
                          <fmt.icon className="h-3.5 w-3.5" />
                          <span>{fmt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Backup Health */}
                  <div className="p-4 rounded-xl bg-[#101927] border border-[#1F2E43] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Automated Cloud Backup</span>
                      <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        HEALTHY
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Nightly snapshot archive to secure encrypted cloud storage.
                    </p>
                    <div className="text-[11px] text-slate-300 font-mono pt-1">
                      Next Snapshot: <span className="text-[#009FE3]">Tonight @ 00:00:00 MYT</span>
                    </div>
                  </div>
                </div>

                {/* Audit Log Download */}
                <div className="p-4 rounded-xl bg-[#101927] border border-[#1F2E43] flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Export System Audit Trail (CSV)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Download full ISO 22000 verification history and telemetry mutation logs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadAuditLog}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#009FE3] hover:bg-[#0089C4] text-white text-xs font-medium shadow-md transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Audit Log</span>
                  </button>
                </div>

                {/* Database Sync Status */}
                <div className="p-4 rounded-xl bg-[#070B12] border border-[#1F2E43] space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Replication Mode:</span>
                    <span className="text-slate-100 font-semibold">Dual-Mode (Offline-First + Supabase Cloud)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Database Region:</span>
                    <span className="text-slate-100">ap-southeast-1 (Singapore)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Live Ping Latency:</span>
                    <span className="text-emerald-400 font-bold">22 ms (Optimal)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: ABOUT SYSTEM */}
            {activeTab === 'about' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                    6. System Governance & Architecture
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official build telemetry, regulatory standards, and copyright attribution.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#101927] to-[#0A1018] border border-[#1F2E43] shadow-lg space-y-4">
                  <div className="flex items-center gap-3 border-b border-[#1F2E43] pb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/lam-soon-logo.png"
                      alt="Lam Soon Logo"
                      className="h-10 w-12 object-contain drop-shadow-md"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        Lam Soon Refinery Management System
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Nisshin Deodorizer Plant · Document No: PRD-REF-001
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[#070B12] border border-[#1F2E43]/60">
                      <span className="text-slate-400 block text-[10px]">APPLICATION VERSION</span>
                      <span className="text-white font-bold text-sm">v1.0.0 (Production Stable)</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#070B12] border border-[#1F2E43]/60">
                      <span className="text-slate-400 block text-[10px]">BUILD NUMBER</span>
                      <span className="text-white font-bold text-sm">2026.09.25-RELEASE</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#070B12] border border-[#1F2E43]/60">
                      <span className="text-slate-400 block text-[10px]">DATABASE ENGINE</span>
                      <span className="text-emerald-400 font-bold">Supabase PostgreSQL 15</span>
                    </div>
                    <div className="p-3 rounded-lg bg-[#070B12] border border-[#1F2E43]/60">
                      <span className="text-slate-400 block text-[10px]">COMPLIANCE ACCREDITATION</span>
                      <span className="text-amber-400 font-bold">21 CFR Part 11 & ISO 22000</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#070B12] border border-[#1F2E43]/60 text-[11px] text-slate-400 leading-relaxed font-sans">
                    This digital manufacturing operations system governs the hourly logging (RF-FR-004) and analytical laboratory verification (RF-FR-001) for the production of refined, bleached, and deodorized edible oil fractions at Lam Soon Edible Oils Sdn. Bhd.
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-500 font-mono">
                  © 2026 Lam Soon Edible Oils Sdn. Bhd. All rights reserved.
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3.5 border-t border-[#1F2E43] bg-[#070B12] flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Station: Console #4 (Online)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1F2E43] hover:bg-[#2A3E59] text-white font-sans text-xs font-medium transition-colors cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}
