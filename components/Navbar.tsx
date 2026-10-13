'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Activity,
  Clock,
  FlaskConical,
  BarChart3,
  FileText,
  Wifi,
  Layers,
  LogOut,
  Users,
  FileSpreadsheet,
  Menu,
  X,
  Search,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Bell,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import {
  getCurrentRole,
  getCurrentProfile,
  ROLE_ALLOWED_TABS
} from '@/lib/data-service';
import { getUnreadBroadcastCount } from '@/lib/broadcast-service';
import SettingsModal from '@/components/SettingsModal';
import HelpSupportModal from '@/components/HelpSupportModal';
import QCNotificationDropdown from '@/components/QCNotificationDropdown';
import ToastContainer from '@/components/ToastContainer';
import ThemeSwitch from '@/components/ThemeSwitch';
import RadioDashboardNav from '@/components/RadioDashboardNav';
import InteractiveTutorialModal from '@/components/InteractiveTutorialModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: Profile | null;
  onRoleChange?: (profile: Profile) => void;
  onLogout?: () => void;
}

export default function Navbar({ activeTab, setActiveTab, currentUser, onRoleChange, onLogout }: NavbarProps) {
  const [role, setRole] = useState<UserRole>(currentUser?.role || 'operator');
  const [profile, setProfile] = useState<Profile>(currentUser || getCurrentProfile());
  const [timeString, setTimeString] = useState<string>('');
  const [formattedDateTime, setFormattedDateTime] = useState<string>('');
  const [currentShiftName, setCurrentShiftName] = useState<string>('SHIFT B');
  const [currentShiftHours, setCurrentShiftHours] = useState<string>('14:00 – 22:00');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [notificationAnchor, setNotificationAnchor] = useState<'desktop' | 'mobile' | null>(null);
  const [unreadBroadcastCount, setUnreadBroadcastCount] = useState<number>(0);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'system'>('dark');

  const applyTheme = (theme: string) => {
    if (typeof document === 'undefined') return;
    let resolved: 'dark' | 'light' = 'dark';
    if (theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        resolved = 'light';
      } else {
        resolved = 'dark';
      }
    } else if (theme === 'light') {
      resolved = 'light';
    } else {
      resolved = 'dark';
    }

    if (resolved === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('refinery_theme', resolved);
      } catch {}
    }
    return resolved;
  };

  const toggleTheme = () => {
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(nextTheme);
    applyTheme(nextTheme);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('refinery_system_settings');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.theme = nextTheme;
        localStorage.setItem('refinery_system_settings', JSON.stringify(parsed));
        localStorage.setItem('refinery_theme', nextTheme);
        window.dispatchEvent(new CustomEvent('refinery_settings_updated', { detail: parsed }));
      } catch {}
    }
  };

  useEffect(() => {
    if (currentUser) {
      setRole(currentUser.role);
      setProfile(currentUser);
    } else {
      setRole(getCurrentRole());
      setProfile(getCurrentProfile());
    }

    const updateUnread = () => {
      setUnreadBroadcastCount(getUnreadBroadcastCount());
    };
    updateUnread();
    window.addEventListener('refinery_broadcast_updated', updateUnread);

    const handleOpenTutorial = () => setIsTutorialOpen(true);
    window.addEventListener('refinery_open_tutorial', handleOpenTutorial);

    const getSystemSettings = () => {
      if (typeof window === 'undefined') return { timeFormat: '24h', dateFormat: 'DD/MM/YYYY', theme: 'dark', language: 'en' };
      try {
        const stored = localStorage.getItem('refinery_system_settings');
        if (stored) return JSON.parse(stored);
      } catch {}
      return { timeFormat: '24h', dateFormat: 'DD/MM/YYYY', theme: 'dark', language: 'en' };
    };

    const updateClock = () => {
      const now = new Date();
      const settings = getSystemSettings();
      const is12h = settings.timeFormat === '12h';

      // 1. Time display
      const timePart = now.toLocaleTimeString(settings.language === 'ms' ? 'ms-MY' : 'en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour12: is12h,
        hour: '2-digit',
        minute: '2-digit',
        second: is12h ? undefined : '2-digit',
      });
      setTimeString(`${timePart} MYT`);

      // 2. Date display according to chosen format
      let datePart = '';
      if (settings.dateFormat === 'YYYY-MM-DD') {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        datePart = `${y}-${m}-${d}`;
      } else if (settings.dateFormat === 'DD MMM YYYY') {
        datePart = now.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kuala_Lumpur',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } else {
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        datePart = `${d}/${m}/${y}`;
      }
      setFormattedDateTime(`${datePart} ${timePart}`);

      // Shift Calculation based on Malaysia local hour
      const klHour = parseInt(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour12: false,
          hour: '2-digit',
        }),
        10
      );

      if (klHour >= 6 && klHour < 14) {
        setCurrentShiftName('SHIFT A');
        setCurrentShiftHours('06:00 – 14:00');
      } else if (klHour >= 14 && klHour < 22) {
        setCurrentShiftName('SHIFT B');
        setCurrentShiftHours('14:00 – 22:00');
      } else {
        setCurrentShiftName('SHIFT C');
        setCurrentShiftHours('22:00 – 06:00');
      }
    };

    const initialSettings = getSystemSettings();
    const initialTheme = initialSettings.theme || 'dark';
    setCurrentTheme(initialTheme);
    applyTheme(initialTheme);
    updateClock();
    const timer = setInterval(updateClock, 1000);

    const handleSettingsUpdate = (e?: any) => {
      const settings = e?.detail || getSystemSettings();
      if (settings?.theme) {
        setCurrentTheme(settings.theme);
        applyTheme(settings.theme);
      }
      updateClock();
    };
    window.addEventListener('refinery_settings_updated', handleSettingsUpdate);

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
        if (onRoleChange) onRoleChange(e.detail);
      }
    };
    window.addEventListener('refinery_profile_updated', handleProfileUpdate as EventListener);

    const handleAuthChanged = (e: any) => {
      if (e?.detail) {
        setProfile(e.detail);
        setRole(e.detail.role);
        if (onRoleChange) onRoleChange(e.detail);
      }
    };
    const handleProfilesSynced = () => {
      const latestProfile = getCurrentProfile();
      if (latestProfile) {
        setProfile(latestProfile);
        setRole(latestProfile.role);
      }
    };
    window.addEventListener('refinery_auth_changed', handleAuthChanged as EventListener);
    window.addEventListener('refinery_profiles_synced', handleProfilesSynced as EventListener);

    return () => {
      clearInterval(timer);
      window.removeEventListener('refinery_broadcast_updated', updateUnread);
      window.removeEventListener('refinery_open_tutorial', handleOpenTutorial);
      window.removeEventListener('refinery_settings_updated', handleSettingsUpdate);
      window.removeEventListener('refinery_profile_updated', handleProfileUpdate as EventListener);
      window.removeEventListener('refinery_auth_changed', handleAuthChanged as EventListener);
      window.removeEventListener('refinery_profiles_synced', handleProfilesSynced as EventListener);
    };
  }, [currentUser]);

  const navItems: { id: string; label: string; shortLabel: string; icon: any; badge?: string }[] = [
    { id: 'process', label: 'Process Control Log', shortLabel: 'Process Log', icon: Layers },
    { id: 'qc', label: 'QC Management', shortLabel: 'QC Lab', icon: FlaskConical },
    { id: 'analytics', label: 'Master Data', shortLabel: 'Trends', icon: BarChart3 },
    { id: 'supervisor', label: 'Abnormality Log', shortLabel: 'Live Board', icon: Activity },
    { id: 'export', label: 'Certificates', shortLabel: 'Forms & Audit', icon: FileText },
    { id: 'report', label: 'Reports', shortLabel: 'Report', icon: FileSpreadsheet },
    { id: 'admin', label: 'User Management', shortLabel: 'Users', icon: Users },
  ];

  // RBAC Filter: Only show allowed navigation tabs for current role
  const allowedTabs = ROLE_ALLOWED_TABS[role] || ['process'];
  const visibleNavItems = navItems
    .filter((item) => allowedTabs.includes(item.id))
    .sort((a, b) => allowedTabs.indexOf(a.id) - allowedTabs.indexOf(b.id));

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    operator: { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]', border: 'border-[#10B981]/40' },
    supervisor: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/40' },
    qc_analyst: { bg: 'bg-[#009FE3]/15', text: 'text-[#009FE3]', border: 'border-[#009FE3]/40' },
    qc_manager: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/40' },
    admin: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40' },
    viewer: { bg: 'bg-slate-700/30', text: 'text-slate-300', border: 'border-slate-600' },
  };

  const safeRole: UserRole = role || 'operator';
  const safeRoleColor = roleColors[safeRole] || roleColors.operator;
  const safeFullName = profile?.full_name || '';
  const userInitials = safeFullName
    ? safeFullName
        .split(' ')
        .map((n) => (n ? n[0] : ''))
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'OP'
    : 'OP';

  const roleBadgeLabel = safeRole === 'operator'
    ? 'OPR'
    : safeRole === 'supervisor'
    ? 'SUP'
    : safeRole === 'qc_analyst'
    ? 'QCS'
    : safeRole === 'qc_manager'
    ? 'MGR'
    : safeRole === 'admin'
    ? 'ADM'
    : 'USR';

  const handleMobileTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE TOP HEADER (lg:hidden) - Contains Button #0                     */}
      {/* ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-[#1F2E43] bg-[#0A1018] shadow-md">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/lam-soon-badge.png"
                alt="Lam Soon Brand Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div>
              <div className="font-bold text-xs text-white uppercase tracking-wider font-sans">
                Lam Soon Refinery
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span>{currentShiftName} · {profile?.employee_no || 'OP-1042'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border font-mono ${safeRoleColor.bg} ${safeRoleColor.text} ${safeRoleColor.border}`}
            >
              {roleBadgeLabel}
            </span>

            {/* Quick QC Notification Bell in Mobile Topbar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationAnchor(prev => prev === 'mobile' ? null : 'mobile')}
                className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-[#101927] border border-[#1F2E43] text-slate-300 hover:text-white hover:border-[#009FE3]/50 transition-colors cursor-pointer select-none"
                title="QC Sample Status (Accepted / Rejected)"
              >
                <Bell className={`h-4 w-4 ${unreadBroadcastCount > 0 ? 'text-[#009FE3]' : 'text-slate-400'}`} />
                {unreadBroadcastCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-md font-mono">
                    {unreadBroadcastCount}
                  </span>
                )}
              </button>

              {notificationAnchor === 'mobile' && (
                <QCNotificationDropdown
                  isOpen={true}
                  onClose={() => {
                    setNotificationAnchor(null);
                    setUnreadBroadcastCount(getUnreadBroadcastCount());
                  }}
                  currentRole={role}
                  onViewQC={() => {
                    setNotificationAnchor(null);
                    setActiveTab('qc');
                  }}
                />
              )}
            </div>

            {/* Quick Tutorial Icon in Mobile Topbar */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsTutorialOpen(true)}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#101927] border border-[#1F2E43] text-[#009FE3] hover:text-white hover:border-[#009FE3]/50 transition-colors cursor-pointer select-none"
              title="Interactive System Tutorial"
            >
              <Sparkles className="h-4 w-4" />
            </div>

            {/* Quick Settings Icon in Mobile Topbar */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#101927] border border-[#1F2E43] text-slate-300 hover:text-white hover:border-[#009FE3]/50 transition-colors cursor-pointer select-none"
              title="System Settings"
            >
              <Settings className="h-4 w-4 text-[#009FE3]" />
            </div>

            {/* Mobile Hamburger Menu Toggle Button (Button #0) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#101927] border border-[#1F2E43] text-slate-300 hover:text-white hover:bg-[#172235] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4 text-[#009FE3]" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DESKTOP LEFT SIDEBAR (Fixed left, width 248px)                         */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] bg-[var(--bg)] border-r border-[var(--line)] flex-col justify-between z-40 select-none p-6 pt-6">
        {/* Brand Header */}
        <div className="brand-redesign px-2 pb-7">
          <div className="mark-redesign">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/lamsoon-logo.png" 
              alt="Lam Soon Badge" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <b>Lam Soon Edible Oils</b>
            <span>Refinery Management System</span>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto">
          <nav aria-label="Main" className="w-full">
            <RadioDashboardNav
              items={visibleNavItems}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />



            <hr className="border-0 border-t border-[var(--line)] my-3" />

            {/* Auxiliary Menu Items */}
            <button
              type="button"
              onClick={() => setIsTutorialOpen(true)}
              className="nav-link-redesign text-[#009FE3] flex items-center gap-2"
              title="Interactive Tutorial & Guide"
            >
              <Sparkles className="h-4 w-4 text-[#009FE3]" />
              <span>Tutorial Guide</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="nav-link-redesign"
              title="Refinery System Settings & Preferences"
            >
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="nav-link-redesign"
              title="Help & Support Documentation & Plant SOP"
            >
              <span>Help & Support</span>
            </button>
          </nav>
        </div>

        {/* Bottom Shift Card & Plant Version Details */}
        <div className="mt-auto pt-4">
          <div className="shift-card-redesign">
            <div>
              <span>{currentShiftName}</span>
              <span className="tag-redesign">{roleBadgeLabel}</span>
            </div>
            <p>{currentShiftHours}</p>
          </div>
          <p className="ver-redesign">
            Lam Soon Edible Oils Sdn Bhd, version 1.0.0
          </p>
          <div className="px-2 pt-1.5 text-[11px] text-[var(--muted)] font-mono flex flex-col gap-0.5">
            <span className="text-[var(--text)] font-medium">Developed by Ahmad Ammar Wafiy</span>
            <span className="text-[10px] opacity-80">© 2026</span>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. DESKTOP TOP HEADER BAR (Spans content area, offset by sidebar width)   */}
      {/* ========================================================================= */}
      <header className="hidden lg:flex fixed top-0 right-0 left-[248px] h-16 bg-[var(--bg)] border-b border-[var(--line)] z-30 items-center justify-between px-8 gap-4 select-none">
        {/* Left Side: Plant Status Telemetry Chip (Replaces search bar) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>PLANT ONLINE</span>
          </div>
          <span className="text-xs text-[var(--muted)] font-mono hidden xl:inline">
            Nisshin Deodorizer · Unit #4
          </span>
        </div>

        {/* Right Side: Telemetry Clock, Quick Actions, User Profile & Sign Out */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Formatted Date & Time (Clean single-line pill) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap shadow-xs">
            <Clock className="h-3.5 w-3.5 text-[#009FE3] shrink-0" />
            <span>{formattedDateTime || '08/12/2024 14:25:00'}</span>
          </div>

          {/* Interactive Tutorial Button */}
          <button
            type="button"
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#009FE3]/10 hover:bg-[#009FE3]/20 border border-[#009FE3]/30 text-[#009FE3] hover:text-[#00B4FF] text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs active:scale-95"
            title="Buka Tutorial Interaktif Cara Penggunaan Loji"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#009FE3] shrink-0" />
            <span>Tutorial</span>
          </button>

          {/* Quick Theme Toggle Button (Dark / Light Day-Night Switch) */}
          <ThemeSwitch currentTheme={currentTheme} onToggle={toggleTheme} />

          {/* Subtle Vertical Divider */}
          <div className="h-6 w-px bg-[var(--line)] mx-0.5" />

          {/* User Profile Chip (Tidy single-line layout with truncate) */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setIsSettingsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSettingsOpen(true);
              }
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[var(--surface)] border border-transparent hover:border-[var(--line)] transition-all cursor-pointer select-none group"
            title="Click to view & edit Profile / Settings"
          >
            <div className="h-8 w-8 rounded-full bg-[var(--raised)] border border-[var(--line)] flex items-center justify-center text-xs font-bold text-[var(--text)] overflow-hidden shrink-0 shadow-xs group-hover:border-[#009FE3]/50 transition-colors">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitials
              )}
            </div>
            <div className="flex flex-col text-left leading-tight min-w-0">
              <span className="font-semibold text-xs text-[var(--text)] whitespace-nowrap truncate max-w-[150px]">
                {profile.full_name}
              </span>
              <span className="text-[11px] text-[var(--muted)] font-mono whitespace-nowrap truncate max-w-[150px]">
                {role === 'operator' ? 'Plant Operator' : role === 'supervisor' ? 'Operations Supervisor' : role === 'qc_analyst' ? 'QC Chemist' : role === 'qc_manager' ? 'Quality Manager' : role === 'admin' ? 'System Administrator' : 'Viewer'}
              </span>
            </div>
          </div>

          {/* QC Sample Status Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationAnchor(prev => prev === 'desktop' ? null : 'desktop')}
              className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--surface)] hover:bg-[var(--raised)] border border-[var(--line)] text-slate-300 hover:text-white transition-all duration-150 active:scale-[0.96] cursor-pointer shadow-xs"
              title="QC Sample Status (Accepted / Rejected)"
            >
              <Bell className={`h-4 w-4 ${unreadBroadcastCount > 0 ? 'text-[#009FE3] animate-pulse' : 'text-slate-400'}`} />
              {unreadBroadcastCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md font-mono animate-bounce">
                  {unreadBroadcastCount}
                </span>
              )}
            </button>

            {notificationAnchor === 'desktop' && (
              <QCNotificationDropdown
                isOpen={true}
                onClose={() => {
                  setNotificationAnchor(null);
                  setUnreadBroadcastCount(getUnreadBroadcastCount());
                }}
                currentRole={role}
                onViewQC={() => {
                  setNotificationAnchor(null);
                  setActiveTab('qc');
                }}
              />
            )}
          </div>

          {/* Sign Out Button */}
          {onLogout && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 text-xs font-medium transition-all duration-150 active:scale-[0.97] cursor-pointer whitespace-nowrap shadow-xs"
                  type="button"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <LogOut className="h-5 w-5 text-red-500" />
                    Sign Out of Plant Session?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to terminate your plant session now? Any unsaved changes or draft entries will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onConfirm={onLogout}>
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 4. MOBILE EXPANDABLE DRAWER MENU (lg:hidden)                              */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-14 z-50 bg-[#101927] border-b border-[#1F2E43] p-4 space-y-3 max-h-[80vh] overflow-y-auto shadow-2xl">
          {/* User Profile Card on Mobile */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1E2D42] to-[#121B29] border border-[#2D415E] flex items-center justify-center font-bold text-xs text-[#009FE3] shadow-sm overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium font-mono">
                  Signed in Personnel
                </div>
                <div className="text-sm font-semibold text-slate-100 mt-0.5">
                  {profile.full_name}
                </div>
                <div className="text-xs text-[#009FE3] font-medium font-mono">
                  {profile.employee_no}
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border font-mono ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}
            >
              {role}
            </span>
          </div>

          {/* Plant Clock & Status Bar on Mobile */}
          <div className="flex items-center justify-between p-2 rounded-md bg-[#0A1018] border border-[#1F2E43] text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-[#10B981]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="font-medium text-[11px] font-mono">System Online</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-200">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-[11px] font-medium font-mono">{formattedDateTime}</span>
            </div>
          </div>

          {/* Quick Theme Toggle Button on Mobile */}
          <div className="flex items-center justify-between p-2 rounded-md bg-[#0A1018] border border-[#1F2E43]">
            <span className="text-xs text-slate-300 font-mono flex items-center gap-1.5">
              <span>Mode Tema</span>
            </span>
            <ThemeSwitch currentTheme={currentTheme} onToggle={toggleTheme} />
          </div>

          {/* Mobile Navigation Tabs List (Button #4) */}
          <div className="space-y-1">
            <div className="text-[10px] uppercase text-slate-400 px-1 font-medium tracking-wider font-mono">
              Views ({visibleNavItems.length}):
            </div>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMobileTabSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-colors border cursor-pointer ${
                    isActive
                      ? 'bg-[#1D8CF8] text-white border-[#1D8CF8] shadow-sm'
                      : 'bg-[#172235] text-slate-200 hover:bg-[#1E2D42] border-[#1F2E43]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium font-mono ${
                        isActive ? 'bg-black/25 text-white' : 'bg-[#101927] text-slate-400 border border-[#1F2E43]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>



          {/* System Settings for Mobile */}
          <div className="pt-2 border-t border-[#1F2E43]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSettingsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  setIsSettingsOpen(true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium text-slate-200 bg-[#172235] border border-[#1F2E43] hover:bg-[#1E2D42] transition-colors cursor-pointer select-none"
            >
              <Settings className="h-4 w-4 text-[#009FE3]" />
              <span>System Settings</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsHelpOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  setIsHelpOpen(true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg text-xs font-medium text-slate-300 bg-[#121D2C] border border-[#1F2E43] hover:bg-[#172437] transition-colors cursor-pointer select-none"
            >
              <HelpCircle className="h-4 w-4 text-[#009FE3]" />
              <span>Help & Support Center</span>
            </div>
          </div>

          {/* Mobile Refinery Image Seamless Blend */}
          <div className="relative rounded-lg overflow-hidden h-24 mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/refinery-plant.jpg"
              alt="Refinery Plant"
              className="w-full h-full object-cover object-bottom"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div className="absolute bottom-1 left-2 text-[9px] font-mono text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
              {currentShiftName} · 14:00 - 22:00
            </div>
          </div>

          {/* Mobile Actions: Sign Out with Animated Alert Dialog */}
          {onLogout && (
            <div className="pt-2 border-t border-[#1F2E43]">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 transition-all duration-150 active:scale-[0.97] cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out of Session</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <LogOut className="h-5 w-5 text-red-500" />
                      Sign Out of Session?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Terminate this workstation session and return to the refinery sign-in screen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onConfirm={() => {
                        setIsMobileMenuOpen(false);
                        onLogout();
                      }}
                    >
                      Sign Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Mobile Drawer Developer Attribution */}
          <div className="pt-2 text-center text-[10px] text-slate-400 font-mono">
            Developed by Ahmad Ammar Wafiy · © 2026
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MOBILE BOTTOM QUICK NAVIGATION DOCK (lg:hidden)                        */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A1018]/95 backdrop-blur-sm border-t border-[#1F2E43] px-1 py-1 flex items-center justify-around">
        {/* Mobile bottom dock tab items (Button #7) */}
        {visibleNavItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-md transition-colors cursor-pointer min-w-[54px] ${
                isActive ? 'text-[#C52227] font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-md ${
                  isActive ? 'bg-[#C52227]/15 text-[#C52227] border border-[#C52227]/30' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[9px] tracking-tight mt-0.5 truncate max-w-[64px]">
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}

        {/* Toggle Menu Button in Bottom Dock (Button #8) */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-md transition-colors cursor-pointer min-w-[54px] ${
            isMobileMenuOpen ? 'text-[#1D8CF8] font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1 rounded-md ${
              isMobileMenuOpen ? 'bg-[#1D8CF8]/15 text-[#1D8CF8] border border-[#1D8CF8]/30' : ''
            }`}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </div>
          <span className="text-[9px] tracking-tight mt-0.5">
            {isMobileMenuOpen ? 'Close' : 'Menu'}
          </span>
        </button>
      </nav>

      {/* Industrial System Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={profile}
          onProfileUpdate={(updated) => {
            setProfile(updated);
            if (onRoleChange) {
              onRoleChange(updated);
            }
          }}
        />
      )}

      {/* Refinery Plant Help & Support Center Modal */}
      {isHelpOpen && (
        <HelpSupportModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentUser={profile}
        />
      )}

      {/* Global Toast Notification Container */}
      <ToastContainer
        onOpenDrawer={() => setNotificationAnchor('desktop')}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Interactive Onboarding Tutorial Modal for Operators & New Users */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        currentRole={role}
      />
    </>
  );
}
