'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import GliderTabs from './GliderTabs';
import { ModernButton } from './ModernButton';
import { 
  ProcessSheet, 
  Deviation, 
  SampleReport, 
  UserRole 
} from '@/types/refinery';
import { 
  getActiveProcessSheet, 
  getDeviations, 
  acknowledgeDeviation, 
  getSampleReports, 
  getCurrentRole,
  syncSampleReportsFromSupabase,
  syncProcessSheetsFromSupabase
} from '@/lib/data-service';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Gauge, 
  Thermometer, 
  AlertCircle, 
  RefreshCw, 
  Box, 
  User, 
  Calendar, 
  FlaskConical, 
  FileText, 
  Check, 
  X,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function SupervisorBoardView() {
  const [sheet, setSheet] = useState<ProcessSheet>(() => getActiveProcessSheet());
  const [deviations, setDeviations] = useState<Deviation[]>(() => {
    try {
      return getDeviations();
    } catch {
      return [];
    }
  });
  const [reports, setReports] = useState<SampleReport[]>(() => {
    try {
      return getSampleReports();
    } catch {
      return [];
    }
  });
  const [role, setRole] = useState<UserRole>(() => getCurrentRole());

  // Deviation list filter: 'all' | 'open' | 'resolved'
  const [deviationFilter, setDeviationFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Manual Supabase cloud sync state & feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Acknowledge deviation modal
  const [selectedDev, setSelectedDev] = useState<Deviation | null>(null);
  const [actionNarrative, setActionNarrative] = useState('');
  const [ackError, setAckError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (selectedDev) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedDev]);

  const refreshData = () => {
    setSheet(getActiveProcessSheet());
    setDeviations(getDeviations());
    setReports(getSampleReports());
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('idle');
    try {
      await Promise.allSettled([
        syncProcessSheetsFromSupabase(),
        syncSampleReportsFromSupabase()
      ]);
      refreshData();
      const now = new Date();
      setLastSyncedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSyncFeedback('success');
      setTimeout(() => {
        setSyncFeedback('idle');
      }, 2500);
    } catch (err) {
      console.error('Manual sync failed:', err);
      setSyncFeedback('error');
      setTimeout(() => {
        setSyncFeedback('idle');
      }, 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setRole(getCurrentRole());
    refreshData();

    syncSampleReportsFromSupabase().then(() => refreshData()).catch(() => {});
    syncProcessSheetsFromSupabase().then(() => refreshData()).catch(() => {});

    window.addEventListener('refinery_reports_updated', refreshData);
    window.addEventListener('refinery_sheet_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('refinery_reports_updated', refreshData);
      window.removeEventListener('refinery_sheet_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDev) return;
    setAckError(null);
    setIsSubmitting(true);

    try {
      const res = acknowledgeDeviation(selectedDev.id, actionNarrative);
      setIsSubmitting(false);
      if (!res.success) {
        setAckError(res.error || 'Failed to acknowledge deviation.');
        return;
      }

      setSelectedDev(null);
      setActionNarrative('');
      refreshData();
    } catch (err: any) {
      setIsSubmitting(false);
      setAckError(err?.message || 'Error acknowledging deviation.');
    }
  };

  // Find latest recorded entry
  const recordedEntries = sheet.entries || [];
  const latestEntry = recordedEntries.length > 0 ? recordedEntries[recordedEntries.length - 1] : null;

  // Compute missing slots up to current hour (e.g. 0900 is index 2)
  const currentHourIdx = 3; // 1000
  const missingSlots: { index: number; label: string; overdueMin: number }[] = [];
  for (let i = 0; i <= currentHourIdx; i++) {
    const isLogged = recordedEntries.some(e => e.slot_index === i);
    if (!isLogged) {
      const label = String(((i + 7) % 24) * 100).padStart(4, '0');
      missingSlots.push({ index: i, label, overdueMin: (currentHourIdx - i) * 60 + 15 });
    }
  }

  // Open unacknowledged deviations
  const openDeviations = useMemo(() => {
    return deviations.filter(d => !d.acknowledged_at);
  }, [deviations]);

  const resolvedDeviations = useMemo(() => {
    return deviations.filter(d => Boolean(d.acknowledged_at));
  }, [deviations]);

  // Filtered deviations
  const filteredDeviations = useMemo(() => {
    if (deviationFilter === 'open') return openDeviations;
    if (deviationFilter === 'resolved') return resolvedDeviations;
    return deviations;
  }, [deviations, deviationFilter, openDeviations, resolvedDeviations]);

  // QC Queue samples awaiting results
  const pendingSamples = reports.filter(r => r.status === 'awaiting_results');

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* 1. Supervisor Dashboard Header Banner */}
      <section className="panel !mb-0 p-4 sm:p-5 bg-[var(--surface)] border border-[var(--line)] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[var(--text)] tracking-tight">
                  Abnormality Log &amp; Live Operations Board
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  SUPERVISOR OVERSIGHT
                </span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Nisshin Deodorizer Plant · Real-time operational deviations, root cause actions &amp; shift compliance
              </p>
            </div>
          </div>

          {/* Right Action & Info Strip - Clean single line toolbar */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="hidden sm:inline">Shift:</span>
                <strong className="text-[var(--text)] font-mono">{sheet.shift_date}</strong>
              </div>
              <span className="text-white/20">·</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Latest:</span>
                <strong className="text-[var(--text)] font-mono">
                  {latestEntry ? `${latestEntry.slot_label} hrs` : 'No logs yet'}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`h-8 px-3 text-xs flex items-center gap-1.5 rounded-xl border transition-all cursor-pointer ${
                syncFeedback === 'success'
                  ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                  : syncFeedback === 'error'
                  ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                  : 'text-[var(--muted)] hover:text-[var(--text)] border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.06]'
              }`}
              title={lastSyncedTime ? `Last synced at ${lastSyncedTime}` : 'Trigger manual cloud sync with Supabase'}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : syncFeedback === 'success' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>
                {isSyncing ? 'Syncing...' : syncFeedback === 'success' ? 'Synced!' : 'Sync'}
              </span>
              {lastSyncedTime && !isSyncing && syncFeedback === 'idle' && (
                <span className="text-[10px] font-mono text-[var(--muted)] pl-1 border-l border-white/10">
                  {lastSyncedTime}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Visual Section Divider 1: Live Operations Telemetry */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[var(--text)] flex items-center gap-2">
            <span>Live Operations Telemetry</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--muted)]">
              4 KEY METRICS
            </span>
          </h3>
        </div>
        <div className="hidden sm:flex items-center gap-3 flex-1 max-w-md ml-4">
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--line)] to-transparent" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400/90 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Telemetry Stream
          </span>
        </div>
      </div>

      {/* 2. Quick KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Vacuum */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between gap-3.5 transition-colors hover:border-white/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Deodorizer Vacuum
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[var(--text)]">
                {latestEntry?.vacuum_torr != null ? Number(latestEntry.vacuum_torr).toFixed(1) : '—'}
              </span>
              <span className="text-xs font-mono text-[var(--muted)]">Torr</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-[var(--muted)] font-mono">Spec: 1.0 – 4.5 Torr</span>
              {latestEntry?.vacuum_torr != null ? (
                Number(latestEntry.vacuum_torr) >= 1.0 && Number(latestEntry.vacuum_torr) <= 4.5 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    In Spec
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    Deviation
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-[var(--muted)]">
                  Awaiting Log
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Tray 4 Temp */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between gap-3.5 transition-colors hover:border-white/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Tray 4 Temperature
            </span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-[var(--text)]">
                {latestEntry?.tray_4_temp_c != null ? Number(latestEntry.tray_4_temp_c).toFixed(1) : '—'}
              </span>
              <span className="text-xs font-mono text-[var(--muted)]">°C</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-[var(--muted)] font-mono">Spec: 250 – 268 °C</span>
              {latestEntry?.tray_4_temp_c != null ? (
                Number(latestEntry.tray_4_temp_c) >= 250 && Number(latestEntry.tray_4_temp_c) <= 268 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Optimal
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    Deviation
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-[var(--muted)]">
                  Awaiting Log
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Missing Slots */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between gap-3.5 transition-colors hover:border-white/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Shift Log Rounds
            </span>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
              missingSlots.length > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${missingSlots.length > 0 ? 'text-amber-300' : 'text-[var(--text)]'}`}>
                {missingSlots.length}
              </span>
              <span className="text-xs font-mono text-[var(--muted)]">
                {missingSlots.length === 1 ? 'Slot Pending' : 'Slots Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-[var(--muted)] font-mono">Shift round timing</span>
              {missingSlots.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Action Pending
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  All Logged
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Open Deviations */}
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between gap-3.5 transition-colors hover:border-white/15">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Active Deviations
            </span>
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
              openDeviations.length > 0 ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${openDeviations.length > 0 ? 'text-rose-300' : 'text-[var(--text)]'}`}>
                {openDeviations.length}
              </span>
              <span className="text-xs font-mono text-[var(--muted)]">Active</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-white/5">
              <span className="text-[11px] text-[var(--muted)] font-mono">Root cause actions</span>
              {openDeviations.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Action Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Zero Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Section Divider 2: Plant Deviations & Shift Compliance */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-1 rounded-full bg-gradient-to-b from-sky-400 to-blue-500" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[var(--text)] flex items-center gap-2">
            <span>Deviations Register &amp; Shift Compliance</span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--muted)]">
              SUPERVISOR ACTION QUEUES
            </span>
          </h3>
        </div>
        <div className="hidden sm:flex items-center gap-3 flex-1 max-w-md ml-4">
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--line)] to-transparent" />
          <span className="text-[11px] font-mono text-[var(--muted)] shrink-0">
            GMP / 21 CFR Part 11 Audit Trail
          </span>
        </div>
      </div>

      {/* 3. Main Two-Column Layout: Deviations Register & Compliance Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column (7 cols): Plant Deviations & Corrective Action Register */}
        <section className="lg:col-span-7 panel !m-0 bg-[var(--surface)] border border-[var(--line)] shadow-sm flex flex-col">
          {/* Header with Filter GliderTabs */}
          <div className="p-4 border-b border-[var(--line)] bg-[var(--raised)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-xs text-[var(--text)] uppercase tracking-wider">
                Plant Process Deviations Register
              </span>
            </div>

            <GliderTabs
              size="sm"
              items={[
                { id: 'all', label: 'All', badge: deviations.length },
                { id: 'open', label: 'Action Needed', badge: openDeviations.length },
                { id: 'resolved', label: 'Resolved', badge: resolvedDeviations.length },
              ]}
              activeId={deviationFilter}
              onChange={(id) => setDeviationFilter(id as 'all' | 'open' | 'resolved')}
            />
          </div>

          {/* List of Deviations */}
          <div className="p-3.5 space-y-3 max-h-[720px] overflow-y-auto custom-scrollbar">
            {filteredDeviations.length === 0 ? (
              <div className="py-16 px-4 text-center text-xs text-[var(--muted)] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
                <p className="font-medium text-[var(--text)]">
                  {deviationFilter === 'open' 
                    ? 'Zero open deviations. All recorded parameters operating within normal limits.' 
                    : deviationFilter === 'resolved'
                    ? 'No acknowledged deviations recorded for this shift.'
                    : 'No process deviations logged on current shift sheet.'}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  System monitors hourly telemetry limits and alerts supervisors immediately.
                </p>
              </div>
            ) : (
              filteredDeviations.map(dev => {
                const isAck = Boolean(dev.acknowledged_at);

                return (
                  <div
                    key={dev.id}
                    className={`p-4 rounded-xl border transition-all duration-150 flex flex-col gap-3 ${
                      isAck
                        ? 'bg-white/[0.015] border-[var(--line)] opacity-85 hover:opacity-100'
                        : 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-500/50 shadow-xs'
                    }`}
                  >
                    {/* Top Row: Hour Badge, Parameter Name & Action Button */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[var(--text)]">
                          Hour {dev.slot_label}
                        </span>
                        <span className="font-semibold text-xs text-[var(--text)]">
                          {dev.field_label}
                        </span>
                        {isAck ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Check className="w-3 h-3" /> Acknowledged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Open Deviation
                          </span>
                        )}
                      </div>

                      {!isAck && (role === 'supervisor' || role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDev(dev);
                            setActionNarrative('');
                          }}
                          className="ghost h-8 text-xs px-3 text-amber-300 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-1.5 font-medium shadow-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </div>

                    {/* Middle Row: Observed Value vs Limit Band */}
                    <div className="flex items-center gap-3 text-xs bg-black/20 p-2.5 rounded-lg border border-white/5 flex-wrap">
                      <div>
                        <span className="text-[var(--muted)] mr-1.5">Observed:</span>
                        <strong className="font-mono text-amber-400 text-sm font-bold">
                          {dev.observed}
                        </strong>
                      </div>
                      <span className="text-white/20">•</span>
                      <div className="text-[var(--muted)]">
                        <span>Limit Band:</span>
                        <strong className="font-mono text-[var(--text)] ml-1">
                          {dev.soft_min ?? 0} – {dev.soft_max ?? 'N/A'}
                        </strong>
                      </div>
                    </div>

                    {/* Bottom: Action Taken Note or Pending Alert */}
                    {dev.action_taken ? (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Corrective Action by {dev.acknowledged_by_name || 'Supervisor'}
                          </span>
                          {dev.acknowledged_at && (
                            <span className="font-mono text-[10px] text-emerald-400/80">
                              {dev.acknowledged_at}
                            </span>
                          )}
                        </div>
                        <p className="text-[var(--text)] m-0 leading-relaxed font-mono text-xs">
                          {dev.action_taken}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400/90 pt-1">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Awaiting supervisor root cause investigation &amp; corrective action note...</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column (5 cols): Overdue Log Entries & QC Lab Queue */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* 1. Overdue Hourly Entries Panel */}
          <section className="panel !m-0 bg-[var(--surface)] border border-[var(--line)] shadow-sm flex flex-col">
            <div className="p-4 border-b border-[var(--line)] bg-[var(--raised)]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-semibold text-xs text-[var(--text)] uppercase tracking-wider">
                  Hourly Log Timeline Compliance
                </span>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                missingSlots.length > 0 ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {missingSlots.length > 0 ? `${missingSlots.length} Overdue` : 'Complete'}
              </span>
            </div>

            <div className="p-3.5 space-y-2.5 max-h-[320px] overflow-y-auto custom-scrollbar">
              {missingSlots.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-emerald-400 flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 opacity-80" />
                  <span className="font-medium">Operating shifts are completely up to date.</span>
                  <span className="text-[11px] text-[var(--muted)]">All hourly telemetry rounds logged.</span>
                </div>
              ) : (
                missingSlots.map(m => (
                  <div
                    key={m.index}
                    className="p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/25 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <b className="font-mono text-xs text-[var(--text)]">Hour {m.label}</b>
                      <p className="text-[11px] text-[var(--muted)] m-0">
                        Pending hourly process telemetry log
                      </p>
                    </div>
                    <span className="inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                      Overdue ~{m.overdueMin}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 2. QC Lab Sample Queue Panel */}
          <section className="panel !m-0 bg-[var(--surface)] border border-[var(--line)] shadow-sm flex flex-col">
            <div className="p-4 border-b border-[var(--line)] bg-[var(--raised)]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#009FE3] shrink-0" />
                <span className="font-semibold text-xs text-[var(--text)] uppercase tracking-wider">
                  QC Lab Sample Testing Status
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--muted)]">
                {pendingSamples.length} In Testing
              </span>
            </div>

            <div className="p-3.5 space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
              {reports.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-[var(--muted)]">
                  No QC sample reports registered today.
                </div>
              ) : (
                reports.slice(0, 6).map(rep => {
                  const isRejected = rep.decision?.decision === 'reject';
                  const isAccepted = rep.decision?.decision === 'accept';
                  const isConcession = rep.decision?.decision === 'accept_concession';

                  return (
                    <div
                      key={rep.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] hover:border-white/15 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <b className="font-mono text-xs text-[var(--text)] truncate">{rep.lot_no}</b>
                          <span className="text-[11px] text-[var(--muted)] truncate">({rep.product_name})</span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] m-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 opacity-60" />
                          <span>{rep.time_check} · {rep.sampling_point_name || 'Deodorizer Outlet'}</span>
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isRejected ? (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Rejected
                          </span>
                        ) : isAccepted ? (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Accepted
                          </span>
                        ) : isConcession ? (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Concession
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            Testing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </div>
      </div>

      {/* 4. Acknowledge Deviation Modal (Portaled for instant viewport centering) */}
      {isMounted && typeof document !== 'undefined' && selectedDev && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none bg-black/80 backdrop-blur-md animate-alert-overlay-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
          onClick={() => setSelectedDev(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="panel relative w-full max-w-lg rounded-2xl bg-[#0F1524] border border-[#1F2E43] shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-6 overflow-hidden animate-alert-content-in"
            style={{ margin: 0 }}
          >
            {/* Top Amber Accent Beam */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 opacity-90" />
            
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Acknowledge Deviation: Hour {selectedDev.slot_label}</span>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Supervisor Root Cause Investigation · 21 CFR Part 11 Audit Trail
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDev(null)}
                className="ghost h-8 w-8 p-0 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Deviation Context Box */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 mb-4 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)]">Parameter:</span>
                <strong className="text-[var(--text)]">{selectedDev.field_label}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)]">Observed Reading:</span>
                <strong className="font-mono text-amber-400 text-sm">{selectedDev.observed}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)]">Operating Spec Range:</span>
                <strong className="font-mono text-[var(--text)]">
                  {selectedDev.soft_min ?? 0} – {selectedDev.soft_max ?? 'N/A'}
                </strong>
              </div>
            </div>

            {ackError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs mb-4">
                {ackError}
              </div>
            )}

            <form onSubmit={handleAcknowledge} className="space-y-4">
              <div className="fld !m-0">
                <label htmlFor="dev-narrative" className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                  Corrective Action Note (Auditor review narrative) *
                </label>
                <textarea
                  id="dev-narrative"
                  required
                  rows={3}
                  placeholder="Describe cause and correction made (e.g. Adjusted ejector steam bypass valve to 3.2 Bar, verified vacuum recovery)..."
                  value={actionNarrative}
                  onChange={e => setActionNarrative(e.target.value)}
                  className="inp w-full p-3 text-xs leading-relaxed"
                  style={{ height: '80px' }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setSelectedDev(null)}
                  className="ghost px-4 h-9 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary h-9 px-4 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Corrective Note'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


