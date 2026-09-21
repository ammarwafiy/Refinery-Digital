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
  UserCheck,
  Wifi,
  Layers,
  LogOut,
  Users
} from 'lucide-react';
import { UserRole, Profile } from '@/types/refinery';
import {
  getCurrentRole,
  setCurrentRole,
  getCurrentProfile,
  getProfiles,
  setAuthUser,
  ROLE_ALLOWED_TABS,
  ROLE_DEFAULT_TAB
} from '@/lib/data-service';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: Profile | null;
  onLogout?: () => void;
}

export default function Navbar({ activeTab, setActiveTab, currentUser, onLogout }: NavbarProps) {
  const [role, setRole] = useState<UserRole>(currentUser?.role || 'operator');
  const [profile, setProfile] = useState<Profile>(currentUser || getCurrentProfile());
  const [timeString, setTimeString] = useState<string>('');

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

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    setRole(newRole);
    const profiles = getProfiles();
    const matched = profiles.find(p => p.role === newRole);
    if (matched) {
      setAuthUser(matched);
      setProfile(matched);
    } else {
      setProfile(getCurrentProfile());
    }
    setActiveTab(ROLE_DEFAULT_TAB[newRole] || 'process');
  };

  const navItems = [
    { id: 'process', label: 'RF-FR-004 Process Log', icon: Layers, badge: '24-Hour' },
    { id: 'supervisor', label: 'Supervisor Live Board', icon: Activity, badge: 'Realtime' },
    { id: 'qc', label: 'RF-FR-001 QC Lab', icon: FlaskConical, badge: 'Quality' },
    { id: 'analytics', label: 'Process Trends & Pareto', icon: BarChart3, badge: 'Analytics' },
    { id: 'export', label: 'Official Forms & Audit', icon: FileText, badge: 'ISO' },
    { id: 'admin', label: 'Admin & Users', icon: Users, badge: 'Pentadbiran' },
  ];

  // RBAC Filter: Only show allowed navigation tabs for current role
  const allowedTabs = ROLE_ALLOWED_TABS[role] || ['process'];
  const visibleNavItems = navItems.filter((item) => allowedTabs.includes(item.id));

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    operator: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-600/40' },
    supervisor: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-600/40' },
    qc_analyst: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-600/40' },
    qc_manager: { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-600/40' },
    admin: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-600/40' },
    viewer: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' },
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md">
      {/* Top SCADA Status Strip */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/50 px-4 py-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
            <span className="tracking-wider uppercase">Lam Soon Edible Oils Sdn. Bhd.</span>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="rounded bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] text-cyan-400 border border-cyan-500/20">
            NISSHIN DEODORIZER PLANT
          </span>
          <span className="hidden md:inline text-slate-500">
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

      {/* Main Navigation & Role Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 px-4 py-2.5">
        {/* Navigation Tabs - Filtered by current role */}
        <nav className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
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
        <div className="flex items-center gap-2 self-end lg:self-auto bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 shadow-md">
          {role === 'admin' ? (
            /* Role Switcher for Admin Only */
            <>
              <div className="flex items-center gap-1.5 pl-2 pr-1 text-slate-400 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden xl:inline text-[11px] font-mono uppercase text-slate-400">Admin Switcher:</span>
              </div>

              <div className="flex items-center gap-1">
                {(['operator', 'supervisor', 'qc_analyst', 'qc_manager', 'admin'] as UserRole[]).map((r) => {
                  const isSelected = role === r;
                  const formatLabel: Record<UserRole, string> = {
                    operator: 'Operator',
                    supervisor: 'Supervisor',
                    qc_analyst: 'QC Analyst',
                    qc_manager: 'QC Manager',
                    admin: 'Admin',
                    viewer: 'Viewer',
                  };

                  return (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-all border cursor-pointer ${isSelected
                          ? `${roleColors[r].bg} ${roleColors[r].text} ${roleColors[r].border} shadow-sm font-semibold`
                          : 'text-slate-500 hover:text-slate-300 border-transparent hover:bg-slate-800/60'
                        }`}
                      title={`Simulasi Peranan ${formatLabel[r]}`}
                    >
                      {formatLabel[r]}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Dedicated Role Mode Badge for Non-Admin */
            <div className="flex items-center gap-2 px-2 py-0.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase border ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}>
                {role === 'operator' && 'MOD OPERATOR · LOG PROSES'}
                {role === 'supervisor' && 'MOD PENYELIA · PAPAN LIVE'}
                {(role === 'qc_analyst' || role === 'qc_manager') && 'MOD KUALITI · MAKMAL QC'}
                {role === 'viewer' && 'MOD JURUAUDIT · REKOD ISO'}
              </span>
            </div>
          )}

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
              title="Panel Pentadbiran & Pengurusan Pengguna Loji"
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
              title="Log Keluar dari sesi & kembali ke skrin log masuk"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Log Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
