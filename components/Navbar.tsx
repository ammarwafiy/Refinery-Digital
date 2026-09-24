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
  X
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import {
  getCurrentRole,
  getCurrentProfile,
  ROLE_ALLOWED_TABS
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
    operator: { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]', border: 'border-[#10B981]/40' },
    supervisor: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/40' },
    qc_analyst: { bg: 'bg-[#009FE3]/15', text: 'text-[#009FE3]', border: 'border-[#009FE3]/40' },
    qc_manager: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/40' },
    admin: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40' },
    viewer: { bg: 'bg-slate-700/30', text: 'text-slate-300', border: 'border-slate-600' },
  };

  const handleMobileTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#1F2E43] bg-[#0A1018] shadow-md">
        {/* Top Status Strip - Desktop Only */}
        <div className="hidden lg:flex items-center justify-between border-b border-[#1F2E43] bg-[#070B12] px-3.5 py-1 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-2 font-semibold text-slate-100">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#101927] border border-[#1F2E43] shrink-0">
                <Flame className="h-3.5 w-3.5 text-[#009FE3]" />
              </span>
              <span className="text-[11px] font-semibold text-slate-200">
                <span className="hidden xl:inline">Lam Soon Edible Oils Sdn. Bhd.</span>
                <span className="xl:hidden">Lam Soon</span>
              </span>
            </span>
            <span className="text-[#1F2E43]">|</span>
            <div className="flex items-center gap-1.5 text-[11px] text-[#009FE3] bg-[#009FE3]/10 px-2 py-0.5 rounded-md border border-[#009FE3]/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#009FE3]"></span>
              <span className="hidden xl:inline font-mono">NISSHIN DEODORIZER PLANT</span>
              <span className="xl:hidden font-mono">NISSHIN PLANT</span>
            </div>
            <span className="hidden 2xl:inline text-[11px] text-slate-500 font-mono">
              Doc: PRD-REF-001 (Rev. 02)
            </span>
          </div>

          {/* Clock & Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              <span className="text-[11px] font-medium font-mono">DCS ONLINE</span>
            </div>

            <div className="hidden xl:flex items-center gap-1.5 text-slate-300 text-[11px] px-2 py-0.5 rounded-md bg-[#101927] border border-[#1F2E43]">
              <Wifi className="h-3 w-3 text-[#009FE3]" />
              <span className="font-mono">DB Sync: Active</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-200 bg-[#101927] px-2.5 py-0.5 rounded-md border border-[#1F2E43]">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="font-medium font-mono">{timeString || '12:00:00 MYT'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Header Bar (Screen width < 1024px) */}
        <div className="flex lg:hidden items-center justify-between px-3.5 py-2 border-b border-[#1F2E43] bg-[#0A1018]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#101927] border border-[#1F2E43]">
              <Flame className="h-4 w-4 text-[#009FE3]" />
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                <span>Lam Soon</span>
                <span className="text-[10px] text-[#009FE3] bg-[#009FE3]/10 px-1.5 py-0.5 rounded border border-[#009FE3]/30 font-mono">
                  NISSHIN
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span>DCS ONLINE · {profile.employee_no}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border font-mono ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
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
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#101927] border border-[#1F2E43] text-slate-300 hover:text-white hover:bg-[#172235] transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4 text-[#009FE3]" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation & Role Bar (lg:flex) */}
        <div className="hidden lg:flex items-center justify-between gap-2 px-3 py-1.5 bg-[#101927]">
          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 rounded-lg bg-[#0A1018] border border-[#1F2E43] overflow-x-auto min-w-0">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium font-sans transition-all whitespace-nowrap cursor-pointer ${isActive
                      ? 'bg-[#009FE3] text-white shadow-sm border border-[#009FE3]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#172235] border border-transparent'
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[8px] px-1 py-0.5 rounded font-medium font-mono ${isActive ? 'bg-black/25 text-white' : 'bg-[#101927] text-slate-400 border border-[#1F2E43]'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info & Role Bar - Always visible, zero overflow */}
          <div className="flex items-center gap-1.5 bg-[#0A1018] p-1.5 rounded-lg border border-[#1F2E43] shrink-0 ml-auto">
            {/* Dedicated Role Mode Badge */}
            <div className="flex items-center gap-1 px-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0"></span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border font-mono ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                <span className="hidden xl:inline">
                  {role === 'operator' && 'OP · PROCESS LOG'}
                  {role === 'supervisor' && 'SV · LIVE BOARD'}
                  {(role === 'qc_analyst' || role === 'qc_manager') && 'QC · LABORATORY'}
                  {role === 'admin' && 'SYS ADMIN · CONTROL'}
                  {role === 'viewer' && 'AUDIT · ISO 22000'}
                </span>
                <span className="xl:hidden">
                  {role === 'operator' && 'OP'}
                  {role === 'supervisor' && 'SV'}
                  {(role === 'qc_analyst' || role === 'qc_manager') && 'QC'}
                  {role === 'admin' && 'ADMIN'}
                  {role === 'viewer' && 'AUDIT'}
                </span>
              </span>
            </div>

            {/* User Profile Badge */}
            <div className="border-l border-[#1F2E43] pl-2 pr-1.5 text-right">
              <div 
                className="text-[11px] font-medium text-slate-200 leading-tight" 
                title={profile.full_name}
              >
                {profile.full_name}
              </div>
              <div className="text-[10px] font-mono text-[#009FE3] font-medium">
                {profile.employee_no}
              </div>
            </div>

            {/* Admin Management Button - Admin Only */}
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ml-1 cursor-pointer border shrink-0 ${activeTab === 'admin'
                    ? 'bg-[#009FE3] text-white border-[#009FE3] shadow-sm'
                    : 'text-slate-300 bg-[#172235] border-[#1F2E43] hover:bg-[#1E2D42] hover:text-white'
                  }`}
                title="Plant Administration & User Management Panel"
              >
                <Users className="h-3.5 w-3.5 text-[#009FE3]" />
                <span>Admin & Users</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 hover:text-red-300 transition-colors ml-1 cursor-pointer shrink-0"
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
          <div className="lg:hidden bg-[#101927] border-b border-[#1F2E43] p-4 space-y-3">
            {/* User Profile Card on Mobile */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A1018] border border-[#1F2E43]">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium font-mono">Signed in Operator</div>
                <div className="text-sm font-semibold text-slate-100 mt-0.5">{profile.full_name}</div>
                <div className="text-xs text-[#009FE3] font-medium font-mono">{profile.employee_no}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border font-mono ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role}
              </span>
            </div>

            {/* Plant Clock & Status Bar on Mobile */}
            <div className="flex items-center justify-between p-2 rounded-md bg-[#0A1018] border border-[#1F2E43] text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-[#10B981]">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
                <span className="font-medium text-[11px] font-mono">DCS Live Feed</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-200">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-[11px] font-medium font-mono">{timeString || '12:00:00 MYT'}</span>
              </div>
            </div>

            {/* Navigation Tabs List for Mobile */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-500 px-1 font-medium tracking-wider font-mono">
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
                        ? 'bg-[#009FE3] text-white border-[#009FE3] shadow-sm'
                        : 'bg-[#172235] text-slate-200 hover:bg-[#1E2D42] border-[#1F2E43]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium font-mono ${
                        isActive ? 'bg-black/25 text-white' : 'bg-[#101927] text-slate-400 border border-[#1F2E43]'
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
              <div className="pt-2 border-t border-[#1F2E43]">
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${activeTab === 'admin'
                      ? 'bg-[#009FE3] text-white border-[#009FE3]'
                      : 'text-slate-200 bg-[#172235] border-[#1F2E43] hover:bg-[#1E2D42]'
                    }`}
                >
                  <Users className="h-4 w-4 text-[#009FE3]" />
                  <span>Admin & Users Panel</span>
                </button>
              </div>
            )}

            {/* Mobile Actions: Sign Out */}
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
      </header>

      {/* Mobile Bottom Quick-Navigation Dock (Fixed for phone thumbs) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A1018]/95 backdrop-blur-sm border-t border-[#1F2E43] px-1 py-1 flex items-center justify-around">
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
                isActive ? 'text-[#009FE3] font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-md ${isActive ? 'bg-[#009FE3]/15 text-[#009FE3] border border-[#009FE3]/30' : ''}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[9px] tracking-tight mt-0.5 truncate max-w-[64px]">
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}

        {/* Toggle Menu Button in Bottom Dock */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-md transition-colors cursor-pointer min-w-[54px] ${
            isMobileMenuOpen ? 'text-[#009FE3] font-medium' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-md ${isMobileMenuOpen ? 'bg-[#009FE3]/15 text-[#009FE3] border border-[#009FE3]/30' : ''}`}>
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </div>
          <span className="text-[9px] tracking-tight mt-0.5">
            {isMobileMenuOpen ? 'Close' : 'Menu'}
          </span>
        </button>
      </nav>
    </>
  );
}
