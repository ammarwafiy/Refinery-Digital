'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProcessLogView from '@/components/ProcessLogView';
import SupervisorBoardView from '@/components/SupervisorBoardView';
import SampleLabView from '@/components/SampleLabView';
import AnalyticsTrendsView from '@/components/AnalyticsTrendsView';
import OfficialFormsExportView from '@/components/OfficialFormsExportView';
import AdminUserManagementView from '@/components/AdminUserManagementView';
import ReportExportView from '@/components/ReportExportView';
import StarFieldBackground from '@/components/StarFieldBackground';
import { Profile } from '@/types/refinery';
import { 
  getAuthUser, 
  setAuthUser, 
  logoutUser, 
  ROLE_ALLOWED_TABS, 
  ROLE_DEFAULT_TAB 
} from '@/lib/data-service';
import { initWorkstationTracking } from '@/lib/workstation-service';

export default function RefineryDashboard() {
  const router = useRouter();
  const params = useParams();
  const routeTab = typeof params?.tab === 'string' ? params.tab : null;

  // Initialize authUser synchronously from storage to eliminate any loading flicker
  const [authUser, setAuthUserState] = useState<Profile | null>(() => {
    if (typeof window !== 'undefined') {
      return getAuthUser();
    }
    return null;
  });

  // Initialize activeTab directly from current URL path to render correct tab on frame 1
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'dashboard' && parts[1]) {
        return parts[1];
      }
    }
    if (routeTab) return routeTab;
    return 'process';
  });

  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !getAuthUser();
    }
    return true;
  });

  useEffect(() => {
    // Check if user is logged in
    const savedUser = getAuthUser();
    if (!savedUser) {
      router.replace('/login');
      return;
    }

    setAuthUserState(savedUser);
    setIsInitializing(false);

    const allowedTabs = ROLE_ALLOWED_TABS[savedUser.role] || ['process'];
    const defaultTab = ROLE_DEFAULT_TAB[savedUser.role] || allowedTabs[0] || 'process';

    let currentUrlTab = routeTab;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'dashboard' && parts[1]) {
        currentUrlTab = parts[1];
      }
    }

    if (currentUrlTab && allowedTabs.includes(currentUrlTab)) {
      setActiveTab(currentUrlTab);
      if (typeof window !== 'undefined' && window.location.pathname !== `/dashboard/${currentUrlTab}`) {
        window.history.replaceState({ tab: currentUrlTab }, '', `/dashboard/${currentUrlTab}`);
      }
    } else {
      setActiveTab(defaultTab);
      if (typeof window !== 'undefined' && window.location.pathname !== `/dashboard/${defaultTab}`) {
        window.history.replaceState({ tab: defaultTab }, '', `/dashboard/${defaultTab}`);
      }
    }

    initWorkstationTracking(savedUser);
  }, [router]);

  // Handle browser Back / Forward history navigation seamlessly without reloading
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts[0] === 'dashboard' && parts[1]) {
          const tabFromUrl = parts[1];
          const user = getAuthUser();
          const allowed = (user && ROLE_ALLOWED_TABS[user.role]) || ['process'];
          if (allowed.includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Instant glitch-free tab change: updates state and syncs browser URL bar
  const handleTabChange = (tab: string) => {
    React.startTransition(() => {
      setActiveTab(tab);
    });
    if (typeof window !== 'undefined') {
      const targetPath = `/dashboard/${tab}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  };

  const handleRoleChange = (profile: Profile) => {
    setAuthUser(profile);
    setAuthUserState(profile);
    const allowedTabs = ROLE_ALLOWED_TABS[profile.role] || ['process'];
    if (!allowedTabs.includes(activeTab)) {
      const newTab = ROLE_DEFAULT_TAB[profile.role] || allowedTabs[0] || 'process';
      handleTabChange(newTab);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setAuthUserState(null);
    router.push('/login');
  };

  const handleNavigateToCertificate = (reportId?: string) => {
    if (reportId && typeof window !== 'undefined') {
      sessionStorage.setItem('refinery_selected_export_report_id', reportId);
    }
    handleTabChange('export');
  };

  // If still checking authentication, show industrial loading indicator
  if (isInitializing || !authUser) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 font-mono text-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-[#009FE3] animate-ping" />
          <span>Verifying workstation security credentials...</span>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col overflow-x-hidden animate-dashboard-enter relative">
      {/* Background Star Particle Transition (Transition/animation/Pattern) */}
      <StarFieldBackground />

      {/* Sidebar (Desktop) + Mobile Topbar / Drawer */}
      <div className="no-print relative z-30">
        <Navbar 
          activeTab={currentTab} 
          setActiveTab={handleTabChange} 
          currentUser={authUser}
          onRoleChange={handleRoleChange}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area (Offset by sidebar width 248px on desktop and topbar height 64px) */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden lg:pl-[248px] lg:pt-16 relative z-10">
        {/* Dynamic Page Header & Breadcrumbs matching redesign */}
        <div className="px-6 lg:px-8 pt-6 pb-2 no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
            <div>
              <p className="crumb-redesign">
                <span 
                  onClick={() => handleTabChange('process')}
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
          </div>
        </div>

        {/* Main Work Area - Strictly renders only the view allowed for current role */}
        <main className="content-redesign pt-0 w-full max-w-full">
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
