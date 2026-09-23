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
      <header className="sticky top-0 z-50 w-full border-b border-[#1c2438] bg-[#0a0d15]/95 backdrop-blur-md shadow-lg shadow-black/40">
        {/* Top SCADA Status Strip - Desktop Only */}
        <div className="hidden lg:flex flex-wrap items-center justify-between border-b border-[#161e30] px-4 py-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 font-semibold text-slate-100 tracking-wide">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/15 border border-amber-500/40">
                <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              </span>
              <span className="tracking-wider uppercase text-[11px] font-bold">Lam Soon Edible Oils Sdn. Bhd.</span>
            </span>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-sky-400 bg-[#0d1424] px-2 py-0.5 rounded border border-[#1e2e4a]">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
              <span>NISSHIN DEODORIZER PLANT</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Doc: PRD-REF-001 (Rev. 02)
            </span>
          </div>

          {/* Clock & Telemetry Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0d1720] border border-emerald-900/40 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] font-bold tracking-wider">DCS ONLINE</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] px-2 py-0.5 rounded bg-[#0e1320] border border-[#1a2336]">
              <Wifi className="h-3 w-3 text-sky-400" />
              <span>DB Sync: Active</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300 bg-[#161208] px-2.5 py-0.5 rounded border border-amber-600/30 shadow-inner">
              <Clock className="h-3 w-3 text-amber-400" />
              <span className="font-semibold tracking-wider">{timeString || '12:00:00 MYT'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Header Bar (Screen width < 1024px) */}
        <div className="flex lg:hidden items-center justify-between px-3.5 py-2.5 border-b border-[#161e30]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500/10 border border-amber-500/30">
              <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-xs tracking-wider uppercase text-white flex items-center gap-1.5">
                <span>Lam Soon</span>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/80 px-1.5 py-0.2 rounded border border-sky-800/50">
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
              className="flex items-center justify-center h-8 w-8 rounded bg-[#121826] border border-[#222d42] text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4 text-sky-400" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation & Role Bar (lg:flex) */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-4 py-2">
          {/* Tactile Navigation Tabs - Segmented Console Strip */}
          <nav className="flex items-center gap-1 p-1 rounded-lg bg-[#0b0f1a] border border-[#182236] shadow-inner">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium font-sans transition-all whitespace-nowrap cursor-pointer ${isActive
                      ? 'bg-[#182338] text-white shadow-sm border border-[#283958]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121a2a] border border-transparent'
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="font-semibold">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${isActive ? 'bg-[#0f1d33] text-sky-300 border border-sky-600/30' : 'bg-[#111726] text-slate-500 border border-slate-800'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-sky-400 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info & Role Bar */}
          <div className="flex items-center gap-2 bg-[#0b0f1a] p-1.5 rounded-lg border border-[#182236]">
            {/* Dedicated Role Mode Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border tracking-wider ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role === 'operator' && 'OP · PROCESS LOG'}
                {role === 'supervisor' && 'SV · LIVE BOARD'}
                {(role === 'qc_analyst' || role === 'qc_manager') && 'QC · LABORATORY'}
                {role === 'admin' && 'SYS ADMIN · CONTROL'}
                {role === 'viewer' && 'AUDIT · ISO 22000'}
              </span>
            </div>

            {/* User Profile Badge */}
            <div className="border-l border-[#1f2b42] pl-2.5 pr-2 text-right">
              <div className="text-[11px] font-bold text-slate-200 leading-tight">
                {profile.full_name}
              </div>
              <div className="text-[10px] font-mono text-sky-400">
                {profile.employee_no}
              </div>
            </div>

            {/* Admin Management Button - Admin Only (Directly to the left of Sign Out) */}
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ml-1 cursor-pointer border ${activeTab === 'admin'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'text-sky-300 bg-[#0f1d33] border-[#203657] hover:bg-[#162947] hover:text-white'
                  }`}
                title="Plant Administration & User Management Panel"
              >
                <Users className="h-3 w-3 text-sky-400" />
                <span>Admin</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium text-rose-300 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/50 hover:text-white transition-all ml-1 cursor-pointer"
                title="Sign out of current session and return to login screen"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Expandable Drawer Menu (lg:hidden) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#0c101c] border-b border-[#1c263c] p-4 space-y-3 shadow-2xl animate-in slide-in-from-top-3 duration-200">
            {/* User Profile Card on Mobile */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#111726] border border-[#1d2940]">
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Signed in Operator</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{profile.full_name}</div>
                <div className="text-xs font-mono text-sky-400 font-semibold">{profile.employee_no}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border tracking-wider ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role}
              </span>
            </div>

            {/* Plant Clock & Status Bar on Mobile */}
            <div className="flex items-center justify-between p-2 rounded bg-[#0a0d16] border border-[#182236] text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-[11px]">DCS Live Feed</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <Clock className="h-3 w-3 text-amber-400" />
                <span className="text-[11px] font-medium">{timeString || '12:00:00 MYT'}</span>
              </div>
            </div>

            {/* Navigation Tabs List for Mobile */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400 px-1 font-semibold tracking-wider">
                Console Views ({visibleNavItems.length}):
              </div>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileTabSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-[#182338] text-white border-sky-500/50 shadow-sm'
                        : 'bg-[#0f1422] text-slate-300 hover:bg-[#151c2c] border-[#1a2336]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                        isActive ? 'bg-[#0f1d33] text-sky-300 border border-sky-600/30' : 'bg-[#141b2c] text-slate-500 border border-slate-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>



            {/* Admin Management Button for Mobile (Above Sign Out) */}
            {role === 'admin' && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border shadow-sm ${activeTab === 'admin'
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'text-cyan-300 bg-cyan-950/70 border-cyan-800/80 hover:bg-cyan-900/60 hover:text-white'
                    }`}
                >
                  <Users className="h-4 w-4 text-cyan-400" />
                  <span>Admin & Users Panel</span>
                </button>
              </div>
            )}

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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0d15]/95 backdrop-blur-xl border-t border-[#1a2336] px-1 py-1 flex items-center justify-around shadow-[0_-8px_20px_rgba(0,0,0,0.6)]">
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
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all cursor-pointer min-w-[54px] ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded transition-all ${isActive ? 'bg-[#142034] text-sky-300 border border-sky-600/30' : ''}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-mono tracking-tight mt-0.5 truncate max-w-[64px]">
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}

        {/* Toggle Menu Button in Bottom Dock */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all cursor-pointer min-w-[54px] ${
            isMobileMenuOpen ? 'text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded ${isMobileMenuOpen ? 'bg-[#20180a] text-amber-300 border border-amber-600/30' : ''}`}>
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </div>
          <span className="text-[9px] font-mono tracking-tight mt-0.5">
            {isMobileMenuOpen ? 'Close' : 'Menu'}
          </span>
        </button>
      </nav>
    </>
  );
}
