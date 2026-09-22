'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Activity,
  Clock,
  ShieldCheck,
  FlaskConical,
  BarChart3,
  FileText,
  Wifi,
  Layers,
  LogOut,
  Users,
  FileSpreadsheet,
  Menu,
  X
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import {
  getCurrentRole,
  getCurrentProfile,
  ROLE_ALLOWED_TABS,
  ROLE_DEFAULT_TAB
} from '@/lib/data-service';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      setRole(currentUser.role);
      setProfile(currentUser);
    } else {
      setRole(getCurrentRole());
      setProfile(getCurrentProfile());
    }

    const updateClock = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' MYT'
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [currentUser]);

  const navItems = [
    { id: 'process', label: 'RF-FR-004 Process Log', shortLabel: 'Process Log', icon: Layers, badge: '24-Hour' },
    { id: 'supervisor', label: 'Supervisor Live Board', shortLabel: 'Live Board', icon: Activity, badge: 'Realtime' },
    { id: 'report', label: 'Report', shortLabel: 'Report', icon: FileSpreadsheet, badge: 'CSV' },
    { id: 'qc', label: 'RF-FR-001 QC Lab', shortLabel: 'QC Lab', icon: FlaskConical, badge: 'Quality' },
    { id: 'analytics', label: 'Process Trends & Pareto', shortLabel: 'Trends', icon: BarChart3, badge: 'Analytics' },
    { id: 'export', label: 'Official Forms & Audit', shortLabel: 'Forms & Audit', icon: FileText, badge: 'ISO' },
    { id: 'admin', label: 'Admin & Users', shortLabel: 'Admin', icon: Users, badge: 'Admin' },
  ];

  // RBAC Filter: Only show allowed navigation tabs for current role
  const allowedTabs = ROLE_ALLOWED_TABS[role] || ['process'];
  const visibleNavItems = navItems
    .filter((item) => allowedTabs.includes(item.id))
    .sort((a, b) => allowedTabs.indexOf(a.id) - allowedTabs.indexOf(b.id));

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    operator: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-600/40' },
    supervisor: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-600/40' },
    qc_analyst: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-600/40' },
    qc_manager: { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-600/40' },
    admin: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-600/40' },
    viewer: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' },
  };

  const handleMobileTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md">
        {/* Top SCADA Status Strip - Desktop Only */}
        <div className="hidden lg:flex flex-wrap items-center justify-between border-b border-slate-800/50 px-4 py-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
              <span className="tracking-wider uppercase">Lam Soon Edible Oils Sdn. Bhd.</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="rounded bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] text-cyan-400 border border-cyan-500/20">
              NISSHIN DEODORIZER PLANT
            </span>
            <span className="text-slate-500">
              Doc: PRD-REF-001 (Rev. 00)
            </span>
          </div>

          {/* Clock & Telemetry Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] font-medium tracking-wide">DCS ONLINE</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Wifi className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-mono">Sync: 0 pending</span>
            </div>

            <div className="flex items-center gap-1 font-mono text-[11px] text-amber-400 bg-slate-900/80 px-2.5 py-0.5 rounded border border-amber-500/20">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeString || '12:00:00 MYT'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Header Bar (Screen width < 1024px) */}
        <div className="flex lg:hidden items-center justify-between px-3.5 py-2.5 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-xs tracking-wider uppercase text-white flex items-center gap-1.5">
                <span>Lam Soon</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/50">
                  NISSHIN
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>DCS ONLINE · {profile.employee_no}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
              {role === 'operator' && 'OP'}
              {role === 'supervisor' && 'SV'}
              {role === 'qc_analyst' && 'QC'}
              {role === 'qc_manager' && 'QM'}
              {role === 'admin' && 'ADMIN'}
              {role === 'viewer' && 'AUDIT'}
            </span>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 text-cyan-400" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation & Role Bar (lg:flex) */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-4 py-2.5">
          {/* Navigation Tabs - Filtered by current role */}
          <nav className="flex items-center gap-1.5 overflow-x-auto w-auto scrollbar-none">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap border cursor-pointer ${isActive
                      ? 'bg-slate-800/90 text-white border-cyan-500/50 shadow-lg shadow-cyan-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-500'
                      }`}>
                    {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info & Role Bar */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shadow-md">
            {/* Dedicated Role Mode Badge */}
            <div className="flex items-center gap-2 px-2 py-0.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase border ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role === 'operator' && 'OPERATOR MODE · PROCESS LOG'}
                {role === 'supervisor' && 'SUPERVISOR MODE · LIVE BOARD'}
                {(role === 'qc_analyst' || role === 'qc_manager') && 'QUALITY MODE · QC LAB'}
                {role === 'admin' && 'ADMINISTRATOR MODE · PLANT CONTROL'}
                {role === 'viewer' && 'AUDITOR MODE · ISO RECORDS'}
              </span>
            </div>

            {/* User Profile Badge */}
            <div className="border-l border-slate-800 pl-2.5 pr-2 text-right">
              <div className="text-[11px] font-semibold text-slate-200 leading-tight">
                {profile.full_name}
              </div>
              <div className="text-[10px] font-mono text-cyan-400">
                {profile.employee_no}
              </div>
            </div>

            {/* Admin Management Button - Admin Only */}
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ml-1 cursor-pointer border ${activeTab === 'admin'
                    ? 'bg-blue-900/70 text-blue-200 border-blue-500/60 shadow-sm'
                    : 'text-cyan-300 bg-cyan-950/50 border border-cyan-800/60 hover:bg-cyan-900/60 hover:text-cyan-100'
                  }`}
                title="Plant Administration & User Management Panel"
              >
                <Users className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden md:inline">Admin & Users</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-rose-400 bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/60 hover:text-rose-200 transition-all ml-1 cursor-pointer"
                title="Sign out of current session and return to login screen"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Expandable Drawer Menu (lg:hidden) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0a0f1d] border-b border-slate-800 p-4 space-y-4 shadow-2xl animate-in slide-in-from-top-3 duration-200">
            {/* User Profile Card on Mobile */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <div className="text-xs font-mono text-slate-400">Signed in as:</div>
                <div className="text-sm font-bold text-white mt-0.5">{profile.full_name}</div>
                <div className="text-xs font-mono text-cyan-400 font-semibold">{profile.employee_no}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role}
              </span>
            </div>

            {/* Plant Clock & Status Bar on Mobile */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>DCS Online</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{timeString || '12:00:00 MYT'}</span>
              </div>
            </div>

            {/* Navigation Tabs List for Mobile */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase text-slate-400 px-1 font-semibold">
                Available Views ({visibleNavItems.length}):
              </div>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileTabSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium font-mono transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-900/80 to-cyan-900/80 text-white border-cyan-500/60 shadow-lg'
                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>



            {/* Mobile Actions: Sign Out */}
            {onLogout && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 transition-all cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of Session</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Quick-Navigation Dock (Fixed for phone thumbs) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-xl border-t border-slate-800/90 px-1 py-1.5 flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.6)]">
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
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-cyan-950/90 text-cyan-300 shadow-sm shadow-cyan-900/50' : ''}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-mono tracking-tighter mt-0.5 truncate max-w-[64px]">
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}

        {/* Toggle Menu Button in Bottom Dock */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer min-w-[56px] ${
            isMobileMenuOpen ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${isMobileMenuOpen ? 'bg-amber-950/80 text-amber-300 shadow-sm' : ''}`}>
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </div>
          <span className="text-[9px] font-mono tracking-tighter mt-0.5">
            {isMobileMenuOpen ? 'Close' : 'Menu'}
          </span>
        </button>
      </nav>
    </>
  );
}
