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
    operator: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    supervisor: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    qc_analyst: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    qc_manager: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    admin: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    viewer: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  };

  const handleMobileTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        {/* Top Status Strip - Desktop Only */}
        <div className="hidden lg:flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3.5 py-1 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-2 font-semibold text-slate-800">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 border border-blue-200 shrink-0">
                <Flame className="h-3.5 w-3.5 text-blue-600" />
              </span>
              <span className="text-[11px] font-semibold text-slate-700">
                <span className="hidden xl:inline">Lam Soon Edible Oils Sdn. Bhd.</span>
                <span className="xl:hidden">Lam Soon</span>
              </span>
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              <span className="hidden xl:inline">NISSHIN DEODORIZER PLANT</span>
              <span className="xl:hidden">NISSHIN PLANT</span>
            </div>
            <span className="hidden 2xl:inline text-[11px] text-slate-400">
              Doc: PRD-REF-001 (Rev. 02)
            </span>
          </div>

          {/* Clock & Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[11px] font-medium">DCS ONLINE</span>
            </div>

            <div className="hidden xl:flex items-center gap-1.5 text-slate-600 text-[11px] px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200">
              <Wifi className="h-3 w-3 text-blue-500" />
              <span>DB Sync: Active</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="font-medium font-mono">{timeString || '12:00:00 MYT'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Header Bar (Screen width < 1024px) */}
        <div className="flex lg:hidden items-center justify-between px-3.5 py-2 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-200">
              <Flame className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                <span>Lam Soon</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  NISSHIN
                </span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>DCS ONLINE · {profile.employee_no}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
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
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4 text-blue-600" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation & Role Bar (lg:flex) */}
        <div className="hidden lg:flex items-center justify-between gap-2 px-3 py-1.5 bg-white">
          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200 overflow-x-auto min-w-0">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium font-sans transition-all whitespace-nowrap cursor-pointer ${isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent'
                    }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[8px] px-1 py-0.5 rounded font-medium ${isActive ? 'bg-blue-500/30 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Info & Role Bar - Always visible, zero overflow */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0 ml-auto">
            {/* Dedicated Role Mode Badge */}
            <div className="flex items-center gap-1 px-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
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
            <div className="border-l border-slate-200 pl-2 pr-1.5 text-right">
              <div 
                className="text-[11px] font-medium text-slate-700 leading-tight" 
                title={profile.full_name}
              >
                {profile.full_name}
              </div>
              <div className="text-[10px] font-mono text-blue-600 font-medium">
                {profile.employee_no}
              </div>
            </div>

            {/* Admin Management Button - Admin Only */}
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ml-1 cursor-pointer border shrink-0 ${activeTab === 'admin'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                title="Plant Administration & User Management Panel"
              >
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <span>Admin & Users</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:text-red-700 transition-colors ml-1 cursor-pointer shrink-0"
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
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-3">
            {/* User Profile Card on Mobile */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Signed in Operator</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">{profile.full_name}</div>
                <div className="text-xs text-blue-600 font-medium">{profile.employee_no}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role}
              </span>
            </div>

            {/* Plant Clock & Status Bar on Mobile */}
            <div className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="font-medium text-[11px]">DCS Live Feed</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-[11px] font-medium font-mono">{timeString || '12:00:00 MYT'}</span>
              </div>
            </div>

            {/* Navigation Tabs List for Mobile */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-slate-400 px-1 font-medium tracking-wider">
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
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        isActive ? 'bg-blue-500/30 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
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
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${activeTab === 'admin'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <Users className="h-4 w-4 text-blue-500" />
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-1 py-1 flex items-center justify-around">
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
                isActive ? 'text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-md ${isActive ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''}`}>
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
            isMobileMenuOpen ? 'text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-md ${isMobileMenuOpen ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''}`}>
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
