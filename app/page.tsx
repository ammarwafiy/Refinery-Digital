'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProcessLogView from '@/components/ProcessLogView';
import SupervisorBoardView from '@/components/SupervisorBoardView';
import SampleLabView from '@/components/SampleLabView';
import AnalyticsTrendsView from '@/components/AnalyticsTrendsView';
import OfficialFormsExportView from '@/components/OfficialFormsExportView';
import AdminUserManagementView from '@/components/AdminUserManagementView';
import ReportExportView from '@/components/ReportExportView';
import LoginView from '@/components/LoginView';
import { Profile } from '@/types/refinery';
import { 
  getAuthUser, 
  setAuthUser, 
  logoutUser, 
  ROLE_ALLOWED_TABS, 
  ROLE_DEFAULT_TAB 
} from '@/lib/data-service';
import { 
  Flame 
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>('process');
  const [authUser, setAuthUserState] = useState<Profile | null>(null);

  useEffect(() => {
    // Check if user is already logged in from previous session
    const savedUser = getAuthUser();
    if (savedUser) {
      setAuthUserState(savedUser);
      const defaultTab = ROLE_DEFAULT_TAB[savedUser.role] || 'process';
      setActiveTab(defaultTab);
    }
  }, []);

  const handleLogin = (profile: Profile) => {
    setAuthUser(profile);
    setAuthUserState(profile);
    const targetTab = ROLE_DEFAULT_TAB[profile.role] || 'process';
    setActiveTab(targetTab);
  };

  const handleLogout = () => {
    logoutUser();
    setAuthUserState(null);
  };

  const handleNavigateToCertificate = (reportId?: string) => {
    if (reportId && typeof window !== 'undefined') {
      sessionStorage.setItem('refinery_selected_export_report_id', reportId);
    }
    setActiveTab('export');
  };

  // If not logged in, render the dedicated industrial Login View
  if (!authUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  // Calculate allowed tabs for logged-in role
  const allowedTabs = ROLE_ALLOWED_TABS[authUser.role] || ['process'];
  const currentTab = allowedTabs.includes(activeTab) ? activeTab : (ROLE_DEFAULT_TAB[authUser.role] || allowedTabs[0]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation & Role Switcher */}
      <Navbar 
        activeTab={currentTab} 
        setActiveTab={setActiveTab} 
        currentUser={authUser}
        onRoleChange={setAuthUserState}
        onLogout={handleLogout}
      />

      {/* Main Work Area - Strictly renders only the view allowed for current role */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-5 pb-20 lg:pb-6">
        {currentTab === 'process' && allowedTabs.includes('process') && (
          <ProcessLogView currentRole={authUser.role} currentUser={authUser} />
        )}
        {currentTab === 'supervisor' && allowedTabs.includes('supervisor') && <SupervisorBoardView />}
        {currentTab === 'report' && allowedTabs.includes('report') && <ReportExportView />}
        {currentTab === 'qc' && allowedTabs.includes('qc') && (
          <SampleLabView 
            currentRole={authUser.role} 
            currentUser={authUser} 
            onNavigateToCertificate={handleNavigateToCertificate}
          />
        )}
        {currentTab === 'analytics' && allowedTabs.includes('analytics') && <AnalyticsTrendsView />}
        {currentTab === 'export' && allowedTabs.includes('export') && <OfficialFormsExportView />}
        {currentTab === 'admin' && allowedTabs.includes('admin') && <AdminUserManagementView />}
      </main>

      {/* Industrial Plant Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 px-4 text-[11px] text-slate-500 font-sans no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 text-center">
          <Flame className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-700 font-semibold">
            Lam Soon Edible Oils Sdn. Bhd.
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Nisshin Deodorizer Plant Refinery Management System (PRD-REF-001)</span>
        </div>
      </footer>
    </div>
  );
}
