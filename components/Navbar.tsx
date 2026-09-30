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
  HelpCircle
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import {
  getCurrentRole,
  getCurrentProfile,
  ROLE_ALLOWED_TABS
} from '@/lib/data-service';
import SettingsModal from '@/components/SettingsModal';
import HelpSupportModal from '@/components/HelpSupportModal';

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

  useEffect(() => {
    if (currentUser) {
      setRole(currentUser.role);
      setProfile(currentUser);
    } else {
      setRole(getCurrentRole());
      setProfile(getCurrentProfile());
    }

    const getSystemSettings = () => {
      if (typeof window === 'undefined') return { timeFormat: '24h', dateFormat: 'DD/MM/YYYY', theme: 'dark', language: 'en' };
      try {
        const stored = localStorage.getItem('refinery_system_settings');
        if (stored) return JSON.parse(stored);
      } catch {}
      return { timeFormat: '24h', dateFormat: 'DD/MM/YYYY', theme: 'dark', language: 'en' };
    };

    const applyTheme = (theme: string) => {
      if (typeof document === 'undefined') return;
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('light-theme');
        document.documentElement.classList.add('dark');
      }
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

    applyTheme(getSystemSettings().theme);
    updateClock();
    const timer = setInterval(updateClock, 1000);

    const handleSettingsUpdate = () => {
      applyTheme(getSystemSettings().theme);
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

    return () => {
      clearInterval(timer);
      window.removeEventListener('refinery_settings_updated', handleSettingsUpdate);
      window.removeEventListener('refinery_profile_updated', handleProfileUpdate as EventListener);
    };
  }, [currentUser]);

  const navItems: { id: string; label: string; shortLabel: string; icon: any; badge?: string }[] = [
    { id: 'process', label: 'Process Control Log', shortLabel: 'Process Log', icon: Layers },
    { id: 'qc', label: 'QC Management', shortLabel: 'QC Lab', icon: FlaskConical },
    { id: 'supervisor', label: 'Abnormality Log', shortLabel: 'Live Board', icon: Activity },
    { id: 'report', label: 'Reports', shortLabel: 'Report', icon: FileSpreadsheet },
    { id: 'export', label: 'Certificates', shortLabel: 'Forms & Audit', icon: FileText },
    { id: 'analytics', label: 'Master Data', shortLabel: 'Trends', icon: BarChart3 },
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
          <nav aria-label="Main" className="flex flex-col gap-[2px]">
            {visibleNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`nav-link-redesign ${isActive ? 'active' : ''}`}
                >
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* Admin Management Tab Button - Admin Only */}
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                aria-current={activeTab === 'admin' ? 'page' : undefined}
                className={`nav-link-redesign ${activeTab === 'admin' ? 'active' : ''}`}
                title="Plant Administration & User Management Panel"
              >
                <span className="truncate">User Management</span>
              </button>
            )}

            <hr className="border-0 border-t border-[var(--line)] my-3" />

            {/* Auxiliary Menu Items */}
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
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. DESKTOP TOP HEADER BAR (Spans content area, offset by sidebar width)   */}
      {/* ========================================================================= */}
      <header className="hidden lg:flex fixed top-0 right-0 left-[248px] h-16 bg-[var(--bg)] border-b border-[var(--line)] z-30 items-center justify-between px-10 gap-6">
        {/* Global Search Bar */}
        <input
          type="search"
          placeholder="Search process, batch, equipment"
          aria-label="Search"
          className="search-redesign"
          readOnly
        />

        <div className="flex-1" />

        {/* Clock, User Profile & Sign Out */}
        <div className="flex items-center gap-6">
          {/* Formatted Date & Time */}
          <span id="clock" className="font-mono text-xs text-[var(--muted)] tabular-nums">
            {formattedDateTime || '08/12/2024 14:25:00'}
          </span>

          {/* User Profile Chip */}
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
            className="user-redesign cursor-pointer select-none"
            title="Click to view & edit Profile / Settings"
          >
            <div className="av-redesign">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                userInitials
              )}
            </div>
            <div>
              <b>{profile.full_name}</b>
              <span>
                {role === 'operator' ? 'Plant Operator' : role === 'supervisor' ? 'Operations Supervisor' : role === 'qc_analyst' ? 'QC Chemist' : role === 'qc_manager' ? 'Quality Manager' : role === 'admin' ? 'System Administrator' : 'Viewer'}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="ghost out"
              type="button"
              title="Sign Out"
            >
              Sign out
            </button>
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

          {/* Admin Management Button for Mobile (Button #5) */}
          {role === 'admin' && (
            <div className="pt-2 border-t border-[#1F2E43]">
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  activeTab === 'admin'
                    ? 'bg-[#1D8CF8] text-white border-[#1D8CF8]'
                    : 'text-slate-200 bg-[#172235] border-[#1F2E43] hover:bg-[#1E2D42]'
                }`}
              >
                <Users className="h-4 w-4 text-[#009FE3]" />
                <span>Admin & Users Panel</span>
              </button>
            </div>
          )}

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

          {/* Mobile Actions: Sign Out (Button #6) */}
          {onLogout && (
            <div className="pt-2 border-t border-[#1F2E43]">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of Session</span>
              </button>
            </div>
          )}
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
    </>
  );
}
