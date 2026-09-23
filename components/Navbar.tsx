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
    operator: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    supervisor: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    qc_analyst: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    qc_manager: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    admin: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    viewer: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  };

  const handleMobileTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-purple-100 bg-white/95 backdrop-blur-md shadow-sm shadow-purple-950/5">
        {/* Top SCADA Status Strip - Desktop Only */}
        <div className="hidden lg:flex flex-wrap items-center justify-between border-b border-purple-50 bg-[#faf9fe] px-4 py-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 font-semibold text-slate-900 tracking-wide">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-100 border border-purple-200">
                <Flame className="h-3.5 w-3.5 text-purple-600 animate-pulse" />
              </span>
              <span className="tracking-wider uppercase text-[11px] font-bold text-purple-950">Lam Soon Edible Oils Sdn. Bhd.</span>
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-600"></span>
              <span>NISSHIN DEODORIZER PLANT</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Doc: PRD-REF-001 (Rev. 02)
            </span>
          </div>

          {/* Clock & Telemetry Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px] font-bold tracking-wider">DCS ONLINE</span>
            </div>

            <div className="flex items-center gap-1.5 text-purple-700 font-mono text-[11px] px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200/80">
              <Wifi className="h-3 w-3 text-purple-500" />
              <span>DB Sync: Active</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-950 bg-purple-100/70 px-2.5 py-0.5 rounded-md border border-purple-200 shadow-sm">
              <Clock className="h-3 w-3 text-purple-600" />
              <span className="font-semibold tracking-wider">{timeString || '12:00:00 MYT'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Header Bar (Screen width < 1024px) */}
        <div className="flex lg:hidden items-center justify-between px-3.5 py-2.5 border-b border-purple-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 border border-purple-200">
              <Flame className="h-4 w-4 text-purple-600 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-xs tracking-wider uppercase text-purple-950 flex items-center gap-1.5">
                <span>Lam Soon</span>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                  NISSHIN
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
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
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-all cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4 text-purple-600" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation & Role Bar (lg:flex) */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-4 py-2 bg-white">
          {/* Tactile Navigation Tabs - Segmented Console Strip */}
          <nav className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/80 shadow-inner">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium font-sans transition-all whitespace-nowrap cursor-pointer ${isActive
                      ? 'bg-purple-600 text-white shadow-sm border border-purple-600 font-semibold'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/70 border border-transparent'
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-purple-600'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${isActive ? 'bg-purple-700/80 text-purple-100 border border-purple-400/40' : 'bg-slate-200/70 text-slate-600 border border-slate-300/50'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-purple-300 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info & Role Bar */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 shadow-sm">
            {/* Dedicated Role Mode Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border tracking-wider ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role === 'operator' && 'OP · PROCESS LOG'}
                {role === 'supervisor' && 'SV · LIVE BOARD'}
                {(role === 'qc_analyst' || role === 'qc_manager') && 'QC · LABORATORY'}
                {role === 'admin' && 'SYS ADMIN · CONTROL'}
                {role === 'viewer' && 'AUDIT · ISO 22000'}
              </span>
            </div>

            {/* User Profile Badge */}
            <div className="border-l border-slate-200 pl-2.5 pr-2 text-right">
              <div className="text-[11px] font-bold text-slate-800 leading-tight">
                {profile.full_name}
              </div>
              <div className="text-[10px] font-mono text-purple-600 font-semibold">
                {profile.employee_no}
              </div>
            </div>

            {/* Admin Management Button - Admin Only */}
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ml-1 cursor-pointer border ${activeTab === 'admin'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                    : 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:text-purple-900'
                  }`}
                title="Plant Administration & User Management Panel"
              >
                <Users className="h-3 w-3 text-purple-600" />
                <span>Admin</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-800 transition-all ml-1 cursor-pointer shadow-sm"
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
          <div className="lg:hidden bg-white border-b border-purple-200 p-4 space-y-3 shadow-xl animate-in slide-in-from-top-3 duration-200">
            {/* User Profile Card on Mobile */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100">
              <div>
                <div className="text-[10px] font-mono text-purple-700 uppercase tracking-wider font-semibold">Signed in Operator</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">{profile.full_name}</div>
                <div className="text-xs font-mono text-purple-600 font-semibold">{profile.employee_no}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border tracking-wider ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role}
              </span>
            </div>

            {/* Plant Clock & Status Bar on Mobile */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-[11px]">DCS Live Feed</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-900">
                <Clock className="h-3 w-3 text-purple-600" />
                <span className="text-[11px] font-medium">{timeString || '12:00:00 MYT'}</span>
              </div>
            </div>

            {/* Navigation Tabs List for Mobile */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-500 px-1 font-semibold tracking-wider">
                Console Views ({visibleNavItems.length}):
              </div>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMobileTabSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium font-sans transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-purple-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                        isActive ? 'bg-purple-700 text-purple-100 border border-purple-400/40' : 'bg-slate-200/80 text-slate-600 border border-slate-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Admin Management Button for Mobile */}
            {role === 'admin' && (
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border shadow-sm ${activeTab === 'admin'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:text-purple-900'
                    }`}
                >
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Admin & Users Panel</span>
                </button>
              </div>
            )}

            {/* Mobile Actions: Sign Out */}
            {onLogout && (
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer shadow-sm"
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-purple-100 px-1 py-1 flex items-center justify-around shadow-[0_-4px_16px_rgba(109,40,217,0.08)]">
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
                isActive ? 'text-purple-700 font-bold' : 'text-slate-500 hover:text-purple-600'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-purple-100 text-purple-700 border border-purple-200' : ''}`}>
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
            isMobileMenuOpen ? 'text-purple-700 font-bold' : 'text-slate-500 hover:text-purple-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${isMobileMenuOpen ? 'bg-purple-100 text-purple-700 border border-purple-200' : ''}`}>
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
