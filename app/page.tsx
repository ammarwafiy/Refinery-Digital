'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProcessLogView from '@/components/ProcessLogView';
import SupervisorBoardView from '@/components/SupervisorBoardView';
import SampleLabView from '@/components/SampleLabView';
import AnalyticsTrendsView from '@/components/AnalyticsTrendsView';
import OfficialFormsExportView from '@/components/OfficialFormsExportView';
import AdminUserManagementView from '@/components/AdminUserManagementView';
import LoginView from '@/components/LoginView';
import { Profile } from '@/types/refinery';
import { getAuthUser, setAuthUser, logoutUser } from '@/lib/data-service';
import { 
  Flame, 
  Cpu, 
  ShieldCheck, 
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('process');
  const [authUser, setAuthUserState] = useState<Profile | null>(null);

  useEffect(() => {
    // Check if user is already logged in from previous session
    const savedUser = getAuthUser();
    if (savedUser) {
      setAuthUserState(savedUser);
      if (savedUser.role === 'supervisor') setActiveTab('supervisor');
      else if (savedUser.role === 'qc_analyst' || savedUser.role === 'qc_manager') setActiveTab('qc');
      else if (savedUser.role === 'viewer') setActiveTab('export');
      else if (savedUser.role === 'admin') setActiveTab('admin');
    }
  }, []);

  const handleLogin = (profile: Profile) => {
    setAuthUser(profile);
    setAuthUserState(profile);
    // Direct user to most relevant tab for their role
    if (profile.role === 'operator') setActiveTab('process');
    else if (profile.role === 'supervisor') setActiveTab('supervisor');
    else if (profile.role === 'qc_analyst' || profile.role === 'qc_manager') setActiveTab('qc');
    else if (profile.role === 'viewer') setActiveTab('export');
    else if (profile.role === 'admin') setActiveTab('admin');
    else setActiveTab('process');
  };

  const handleLogout = () => {
    logoutUser();
    setAuthUserState(null);
  };

  // If not logged in, render the dedicated industrial Login View
  if (!authUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top SCADA Navigation & Role Switcher */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={authUser}
        onLogout={handleLogout}
      />

      {/* Main Work Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'process' && <ProcessLogView />}
        {activeTab === 'supervisor' && <SupervisorBoardView />}
        {activeTab === 'qc' && <SampleLabView />}
        {activeTab === 'analytics' && <AnalyticsTrendsView />}
        {activeTab === 'export' && <OfficialFormsExportView />}
        {activeTab === 'admin' && <AdminUserManagementView />}
      </main>

      {/* Industrial Plant Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#070a10] py-6 px-4 text-xs text-slate-500 font-mono no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            <span className="text-slate-300 font-semibold">
              Lam Soon Edible Oils Sdn. Bhd.
            </span>
            <span className="text-slate-600">·</span>
            <span>Nisshin Deodorizer Plant Refinery Management System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Cpu className="h-3.5 w-3.5" /> Next.js 15 App Router · TypeScript Strict
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Supabase RLS & Audit Triggers
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">
              PRD-REF-001 Rev. 00
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
