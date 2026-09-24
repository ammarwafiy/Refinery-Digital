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
      subtitle: 'RF-FR-001 analytical quality testing, sampling point inspection and batch release'
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
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex flex-col">
      {/* Sidebar (Desktop) + Mobile Topbar / Drawer */}
      <Navbar 
        activeTab={currentTab} 
        setActiveTab={setActiveTab} 
        currentUser={authUser}
        onRoleChange={setAuthUserState}
        onLogout={handleLogout}
      />

      {/* Main Content Area (Offset by sidebar width on desktop and topbar height) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72 lg:pt-14">
        {/* Dynamic Page Header & Breadcrumbs matching user mockup */}
        <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3 border-b border-[#1F2E43]/40 bg-[#070B12]/80 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-medium">
            <span 
              onClick={() => setActiveTab('process')}
              className="hover:text-slate-200 cursor-pointer transition-colors"
            >
              Home
            </span>
            <span className="text-slate-500">&gt;</span>
            <span className="text-[#1D8CF8] font-medium">
              {currentHeaderInfo.title}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {currentHeaderInfo.title}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentHeaderInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Main Work Area - Strictly renders only the view allowed for current role */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-4 lg:p-6 pb-20 lg:pb-8">
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
        <footer className="w-full border-t border-[#1F2E43] bg-[#0A1018] py-3 px-4 text-[11px] text-slate-400 font-sans no-print">
          <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-center gap-2 text-center">
            <Flame className="h-3.5 w-3.5 text-[#009FE3] shrink-0" />
            <span className="text-slate-200 font-semibold">
              Lam Soon Edible Oils Sdn. Bhd.
            </span>
            <span className="text-[#1F2E43]">·</span>
            <span className="text-slate-400">Nisshin Deodorizer Plant Refinery Management System (PRD-REF-001) · ISO 22000 & HACCP Certified</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
