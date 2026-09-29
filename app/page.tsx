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

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    process: {
      title: 'Process Control Log',
      subtitle: 'Record and monitor hourly process parameters, observations and operational status'
    },
    qc: {
      title: 'QC Management & Laboratory',
      subtitle: 'Analytical quality testing, sampling point inspection and batch release'
    },
    supervisor: {
      title: 'Abnormality Log & Live Board',
      subtitle: 'Real-time operational deviations, root cause records and supervisor oversight'
    },
    report: {
      title: 'Production Shift Reports',
      subtitle: 'Generate daily shift handover logs, operational summaries and exportable CSV telemetry'
    },
    export: {
      title: 'Certificates & Official Audit',
      subtitle: 'Official quality certificates, ISO 22000 verification records and batch traceability'
    },
    analytics: {
      title: 'Master Data & Trends',
      subtitle: 'Statistical Process Control (SPC) run charts, Pareto defect distribution and rejection trends'
    },
    admin: {
      title: 'User Management & Permissions',
      subtitle: 'Plant operator directory, role-based access control and system audit configuration'
    }
  };

  const currentHeaderInfo = tabTitles[currentTab] || {
    title: 'Process Control Log',
    subtitle: 'Record and monitor hourly process parameters, observations and operational status'
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      {/* Sidebar (Desktop) + Mobile Topbar / Drawer */}
      <div className="no-print">
        <Navbar 
          activeTab={currentTab} 
          setActiveTab={setActiveTab} 
          currentUser={authUser}
          onRoleChange={setAuthUserState}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area (Offset by sidebar width 248px on desktop and topbar height 64px) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[248px] lg:pt-16">
        {/* Dynamic Page Header & Breadcrumbs matching redesign */}
        <div className="px-6 lg:px-10 pt-8 pb-2 no-print">
          <p className="crumb-redesign">
            <span 
              onClick={() => setActiveTab('process')}
              className="hover:underline cursor-pointer"
            >
              Home
            </span> / <b>{currentHeaderInfo.title}</b>
          </p>
          <h1 className="h1-redesign">
            {currentHeaderInfo.title}
          </h1>
          <p className="lede-redesign">
            {currentHeaderInfo.subtitle}.
          </p>
        </div>

        {/* Main Work Area - Strictly renders only the view allowed for current role */}
        <main className="content-redesign pt-0">
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
        <footer className="w-full border-t border-[var(--line)] bg-[var(--bg)] py-4 px-10 text-xs text-[var(--muted)] font-sans no-print mt-auto">
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>Lam Soon Edible Oils Sdn. Bhd. · Nisshin Deodorizer Plant Refinery Management System (PRD-REF-001)</span>
            <span>ISO 22000 &amp; HACCP Certified · 21 CFR Part 11</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
