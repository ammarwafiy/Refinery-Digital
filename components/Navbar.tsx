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

      const datePart = now.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timePart = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
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

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [currentUser]);

  const navItems = [
    { id: 'process', label: 'Process Control Log', shortLabel: 'Process Log', icon: Layers, badge: '24-Hour' },
    { id: 'qc', label: 'QC Management', shortLabel: 'QC Lab', icon: FlaskConical, badge: 'Quality' },
    { id: 'supervisor', label: 'Abnormality Log', shortLabel: 'Live Board', icon: Activity, badge: 'Realtime' },
    { id: 'report', label: 'Reports', shortLabel: 'Report', icon: FileSpreadsheet, badge: 'CSV' },
    { id: 'export', label: 'Certificates', shortLabel: 'Forms & Audit', icon: FileText, badge: 'ISO' },
    { id: 'analytics', label: 'Master Data', shortLabel: 'Trends', icon: BarChart3, badge: 'Analytics' },
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

  const userInitials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AH';

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
            <div className="h-8 w-10 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/lam-soon-logo.png"
                alt="Lam Soon Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-100">
                Lam Soon Refinery
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                <span>{currentShiftName} · {profile.employee_no}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border font-mono ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}
            >
              {role === 'operator' ? 'OP' : role === 'supervisor' ? 'SV' : role.startsWith('qc') ? 'QC' : role.toUpperCase()}
            </span>

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
      {/* 2. DESKTOP LEFT SIDEBAR (Fixed left, width 256px / 280px)                 */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 xl:w-72 bg-[#080E18] border-r border-[#1F2E43] flex-col justify-between z-40 select-none overflow-hidden">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#1F2E43]/60 bg-[#060A10]/40 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-12 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/lam-soon-logo.png"
                alt="Lam Soon Logo"
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs xl:text-sm text-white tracking-wider truncate uppercase">
                Lam Soon Refinery
              </div>
              <div className="text-[9px] xl:text-[10px] text-slate-400 font-mono tracking-widest truncate uppercase">
                Process Management System
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto relative z-10">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-3 py-1">
            Menu Navigation
          </div>

          <nav className="space-y-1">
            {/* Desktop Navigation Tab Button (Button #1) */}
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium font-sans transition-all w-full cursor-pointer ${
                    isActive
                      ? 'bg-[#1D8CF8] text-white shadow-md shadow-blue-500/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#121D2C]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded font-medium font-mono ${
                        isActive ? 'bg-black/25 text-white' : 'bg-[#101927] text-slate-400 border border-[#1F2E43]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Admin Management Tab Button (Button #2) - Admin Only */}
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all w-full cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#1D8CF8] text-white shadow-md shadow-blue-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#121D2C]'
                }`}
                title="Plant Administration & User Management Panel"
              >
                <Users className={`h-4 w-4 shrink-0 ${activeTab === 'admin' ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate flex-1 text-left">User Management</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded font-medium font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  ADMIN
                </span>
              </button>
            )}
          </nav>

          {/* Divider */}
          <div className="pt-3 pb-2">
            <div className="h-px bg-[#1F2E43]/60 w-full" />
          </div>

          {/* Auxiliary Menu Items */}
          <div className="space-y-1">
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-[#121D2C] cursor-pointer transition-colors"
              title="System Settings"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </div>
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-[#121D2C] cursor-pointer transition-colors"
              title="Help & Support Documentation"
            >
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <span>Help & Support</span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* BOTTOM LEFT OF SIDEBAR: SEAMLESS REFINERY PLANT BLEND (NO BOX/FRAME) */}
        {/* ===================================================================== */}
        <div className="relative mt-auto pt-24 pb-4 px-3.5 overflow-hidden z-10">
          {/* Seamless Refinery Plant Background Image with Smooth Gradient Mask */}
          <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/refinery-plant.jpg"
              alt="Lam Soon Refinery Plant"
              className="w-full h-full object-cover object-bottom brightness-90 contrast-115 saturate-110"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0) 100%)',
              }}
            />
            {/* Gradient wash to seamlessly blend top and bottom into sidebar dark navy background */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080E18]/40 via-transparent to-[#080E18]" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#080E18] to-transparent" />
          </div>

          {/* Shift Badge Card (Glassmorphism Pill floating directly on top of the plant blend) */}
          <div className="relative z-10 p-2.5 rounded-xl bg-[#070F1C]/85 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
              </span>
              <div>
                <div className="text-[11px] font-bold text-white font-mono tracking-wider">
                  {currentShiftName}
                </div>
                <div className="text-[10px] text-slate-300 font-mono">
                  {currentShiftHours}
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border font-mono ${roleColors[role].bg} ${roleColors[role].text} ${roleColors[role].border}`}
            >
              {role === 'operator' ? 'OP' : role === 'supervisor' ? 'SV' : role.startsWith('qc') ? 'QC' : role.toUpperCase()}
            </span>
          </div>

          {/* Plant Footer Details (Matching screenshot layout: 2 lines company name + version) */}
          <div className="relative z-10 mt-3 px-1 text-left">
            <div className="text-[11px] font-medium text-slate-300 leading-tight">
              Lam Soon Edible Oils
            </div>
            <div className="text-[11px] font-medium text-slate-400 leading-tight">
              Sdn Bhd
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              Version 1.0.0
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. DESKTOP TOP HEADER BAR (Spans content area, offset by sidebar width)   */}
      {/* ========================================================================= */}
      <header className="hidden lg:flex fixed top-0 right-0 left-64 xl:left-72 h-14 bg-[#080E18]/95 backdrop-blur-md border-b border-[#1F2E43] z-30 items-center justify-between px-6">
        {/* Global Search Bar */}
        <div className="relative w-80 xl:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search process, batch, equipment..."
            className="w-full pl-9 pr-12 py-1.5 bg-[#0C1523] border border-[#1F2E43] rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#1D8CF8] focus:ring-1 focus:ring-[#1D8CF8] transition-all"
            readOnly
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-[#142032] border border-[#1F2E43] rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Status, Clock, User Profile & Sign Out */}
        <div className="flex items-center gap-4">
          {/* DCS Online Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-medium font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
            </span>
            <span>System Online</span>
          </div>

          <span className="text-[#1F2E43]">|</span>

          {/* Formatted Date & Time */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{formattedDateTime || '08 Dec 2024 14:25'}</span>
          </div>

          <span className="text-[#1F2E43]">|</span>

          {/* User Profile Chip */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1E2D42] to-[#121B29] border border-[#2D415E] flex items-center justify-center font-bold text-xs text-[#009FE3] shadow-sm">
              {userInitials}
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-100 leading-tight">
                {profile.full_name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono capitalize">
                {role === 'operator' ? 'Operator' : role === 'supervisor' ? 'Supervisor' : role.startsWith('qc') ? 'QC Analyst' : role}
              </div>
            </div>
          </div>

          {/* Sign Out Button (Button #3) */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 hover:text-red-300 transition-colors ml-1 cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign Out</span>
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
                isActive ? 'text-[#1D8CF8] font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-md ${
                  isActive ? 'bg-[#1D8CF8]/15 text-[#1D8CF8] border border-[#1D8CF8]/30' : ''
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
    </>
  );
}
