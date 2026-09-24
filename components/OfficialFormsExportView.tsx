'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  getActiveProcessSheet, 
  getSampleReports, 
  getAuditLogs,
  updateSampleResults,
  getAvailableShiftDates,
  getProcessSheetByDate,
  getRealtimeShiftDate,
  syncAuditLogsFromSupabase
} from '@/lib/data-service';
import type { SampleReport, ProcessSheet, AuditLogEntry } from '@/types/refinery';
import { 
  FileText, 
  Printer, 
  Download, 
  History, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  Table, 
  Calendar,
  Layers,
  Edit3,
  Save,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Filter,
  RotateCcw,
  Eye
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function OfficialFormsExportView() {
  const [selectedShiftDate, setSelectedShiftDate] = useState<string>(() => getRealtimeShiftDate());
  const [availableShiftDates, setAvailableShiftDates] = useState<string[]>(() => getAvailableShiftDates());
  const [sheet, setSheet] = useState<ProcessSheet>(() => getProcessSheetByDate(getRealtimeShiftDate()));
  const [reports, setReports] = useState<SampleReport[]>(() => getSampleReports());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => getAuditLogs());

  // Audit Trail filtering state
  const [auditDateFilter, setAuditDateFilter] = useState<string>('all');
  const [auditTableFilter, setAuditTableFilter] = useState<string>('all');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | number | null>(null);

  const [activeFormType, setActiveFormType] = useState<'rf_fr_004' | 'rf_fr_001' | 'audit'>('rf_fr_004');
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // Quick Edit Remarks Modal State
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [editFlushing, setEditFlushing] = useState(false);
  const [editCooling, setEditCooling] = useState(false);
  const [editPushover, setEditPushover] = useState(false);
  const [editRemarksText, setEditRemarksText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleShiftDateChange = (newDate: string) => {
    setSelectedShiftDate(newDate);
    setSheet(getProcessSheetByDate(newDate));
  };

  const handleStepDay = (deltaDays: number) => {
    try {
      const cur = new Date(selectedShiftDate + 'T12:00:00');
      cur.setDate(cur.getDate() + deltaDays);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const nextDate = `${y}-${m}-${d}`;
      handleShiftDateChange(nextDate);
    } catch {
      // ignore
    }
  };

  // Available unique dates in audit trail
  const availableAuditDates = useMemo(() => {
    const dates = new Set<string>();
    auditLogs.forEach(l => {
      if (l.occurred_at) {
        dates.add(l.occurred_at.slice(0, 10));
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [auditLogs]);

  // Available unique table names in audit trail
  const availableAuditTables = useMemo(() => {
    const tables = new Set<string>();
    auditLogs.forEach(l => {
      if (l.table_name) tables.add(l.table_name);
    });
    return Array.from(tables).sort();
  }, [auditLogs]);

  // Navigate audit trail date backward / forward by day
  const handleAuditStepDay = (deltaDays: number) => {
    try {
      const baseDate = auditDateFilter !== 'all' 
        ? auditDateFilter 
        : (availableAuditDates[0] || getRealtimeShiftDate());
      const cur = new Date(baseDate + 'T12:00:00');
      cur.setDate(cur.getDate() + deltaDays);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      setAuditDateFilter(`${y}-${m}-${d}`);
    } catch {
      // ignore
    }
  };

  // Filtered audit logs matching active controls
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const logDate = log.occurred_at ? log.occurred_at.slice(0, 10) : '';
      if (auditDateFilter !== 'all' && logDate !== auditDateFilter) return false;
      if (auditTableFilter !== 'all' && log.table_name !== auditTableFilter) return false;
      if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const matchActor = (log.actor_name || '').toLowerCase().includes(q);
        const matchTable = (log.table_name || '').toLowerCase().includes(q);
        const matchAction = (log.action || '').toLowerCase().includes(q);
        const matchDetail = JSON.stringify(log.new_row || log.old_row || {}).toLowerCase().includes(q);
        const matchId = String(log.record_id || log.id || '').toLowerCase().includes(q);
        if (!matchActor && !matchTable && !matchAction && !matchDetail && !matchId) return false;
      }
      return true;
    });
  }, [auditLogs, auditDateFilter, auditTableFilter, auditActionFilter, auditSearchQuery]);

  useEffect(() => {
    const refreshData = () => {
      const repList = getSampleReports();
      setReports(repList);
      setSheet(getProcessSheetByDate(selectedShiftDate));
      setAuditLogs(getAuditLogs());
      setAvailableShiftDates(getAvailableShiftDates());
    };

    refreshData();
    syncAuditLogsFromSupabase().catch(() => {});

    window.addEventListener('refinery_reports_updated', refreshData);
    window.addEventListener('refinery_sheet_updated', refreshData);
    window.addEventListener('refinery_audit_updated', refreshData);
    window.addEventListener('storage', refreshData);

    return () => {
      window.removeEventListener('refinery_reports_updated', refreshData);
      window.removeEventListener('refinery_sheet_updated', refreshData);
      window.removeEventListener('refinery_audit_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, [selectedShiftDate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navTarget = sessionStorage.getItem('refinery_selected_export_report_id');
      if (navTarget && reports.some(r => r.id === navTarget)) {
        setActiveFormType('rf_fr_001');
        setSelectedReportId(navTarget);
        sessionStorage.removeItem('refinery_selected_export_report_id');
        return;
      }
    }

    if (reports.length > 0) {
      if (!selectedReportId || !reports.some(r => r.id === selectedReportId)) {
        setSelectedReportId(reports[0].id);
      }
    }
  }, [reports, selectedReportId]);

  const activeReport = reports.find(r => r.id === selectedReportId) || reports[0];

  const openEditRemarks = () => {
    if (!activeReport) return;
    setEditFlushing(Boolean(activeReport.remark_flushing));
    setEditCooling(Boolean(activeReport.remark_cooling));
    setEditPushover(Boolean(activeReport.remark_pushover));
    setEditRemarksText(activeReport.remarks || '');
    setSaveSuccessMsg(null);
    setIsEditingRemarks(true);
  };

  const handleSaveCertificateRemarks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;

    const currentResults = (activeReport.results || []).map(r => ({
      resultId: r.id,
      parameter_id: r.parameter_id,
      parameter_code: r.parameter_code,
      parameter_name: r.parameter_name,
      unit: r.unit,
      series_key: r.series_key,
      value_numeric: r.value_numeric,
      value_text: r.value_text,
      requested: r.requested !== false,
    }));

    const res = updateSampleResults(activeReport.id, currentResults, {
      remark_flushing: editFlushing,
      remark_cooling: editCooling,
      remark_pushover: editPushover,
      remarks: editRemarksText.trim() ? editRemarksText : null,
    });

    if (res.success) {
      setSaveSuccessMsg('Remarks & operating conditions saved and synced with QC Lab & Supabase!');
      const repList = getSampleReports();
      setReports(repList);
      setTimeout(() => {
        setIsEditingRemarks(false);
        setSaveSuccessMsg(null);
      }, 1200);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeFormType === 'rf_fr_004') {
      const headers = [
        'Time Slot', 'Product', 'Oil Feed Rate (L)', 'Deod Time (Hr)', 'Vacuum (Torr)',
        'Tray 1 (C)', 'Tray 2 (C)', 'Tray 3 (C)', 'Tray 4 (C)', 'Tray 5 (C)', 'Tray 6 (C)', 'Tray 7 (C)',
        'BC101 In (C)', 'BC101 Out (C)', 'Chill In (C)', 'Chill Out (C)',
        'Booster (Bar)', 'Ejector (Bar)', 'Strip Steam %', 'Strip Flow (kg/h)',
        'FP101A (Bar)', 'FP101B (Bar)', 'Remarks', 'Recorded By'
      ];

      const rows = (sheet.entries || []).map(e => [
        e.slot_label,
        e.product_name || '-',
        e.oil_feed_rate_litre || '-',
        e.deod_time_set_hr || '-',
        e.vacuum_torr || '-',
        e.tray_1_temp_c || '-',
        e.tray_2_temp_c || '-',
        e.tray_3_temp_c || '-',
        e.tray_4_temp_c || '-',
        e.tray_5_temp_c || '-',
        e.tray_6_temp_c || '-',
        e.tray_7_temp_c || '-',
        e.bc101_water_in_c || '-',
        e.bc101_water_out_c || '-',
        e.chill_water_in_c || '-',
        e.chill_water_out_c || '-',
        e.booster_press_bar || '-',
        e.ejector_press_bar || '-',
        e.strip_steam_pct_of_oil || '-',
        e.strip_steam_flow_kghr || '-',
        e.fp101a_press_bar || '-',
        e.fp101b_press_bar || '-',
        `"${(e.remarks || '').replace(/"/g, '""')}"`,
        e.recorded_by_name || '-'
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `RF-FR-004_Deodorizer_Log_${sheet.shift_date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeFormType === 'rf_fr_001') {
      const headers = [
        'Report No', 'Sample Date', 'Time', 'Lot No', 'Product', 'Tank',
        'Status', 'Flushing', 'Cooling', 'Push Over', 'Remarks',
        'Decision', 'Decided By'
      ];
      const rows = reports.map(r => [
        r.report_no,
        r.sample_date,
        r.time_check,
        r.lot_no,
        `"${(r.product_name || '').replace(/"/g, '""')}"`,
        r.feed_tank_code || '-',
        r.status,
        r.remark_flushing ? 'YES' : 'NO',
        r.remark_cooling ? 'YES' : 'NO',
        r.remark_pushover ? 'YES' : 'NO',
        `"${(r.remarks || '').replace(/"/g, '""')}"`,
        r.decision?.decision || 'PENDING',
        r.decision?.decided_by_name || '-'
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `RF-FR-001_Sample_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeFormType === 'audit') {
      const headers = [
        'Timestamp (MYT)',
        'Table Name',
        'Action',
        'Authorized Actor',
        'Record ID',
        'Audit Details'
      ];
      const rows = filteredAuditLogs.map(log => [
        `"${formatDateTime(log.occurred_at)}"`,
        log.table_name,
        log.action.toUpperCase(),
        `"${(log.actor_name || 'System / DB Trigger').replace(/"/g, '""')}"`,
        `"${String(log.record_id || log.id || '-').replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.new_row || log.old_row || {}).replace(/"/g, '""')}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Immutable_Audit_Trail_${auditDateFilter === 'all' ? 'All_Dates' : auditDateFilter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top SCADA Control Masthead & Document Console */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-sm no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-sky-400 shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-sky-400 uppercase tracking-widest bg-slate-50 border border-sky-800/60 px-1.5 py-0.5 rounded font-semibold">
                  DOC-SYS-04
                </span>
                <span className="flex items-center gap-1 font-mono text-[10px] text-green-600 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  CONTROLLED REPOSITORY
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 mt-0.5">
                Official Controlled Forms & Regulatory Audit Trail
              </h1>
              <p className="text-xs text-slate-400">
                Exact physical form layout replication for customer and ISO 9001 / HACCP compliance audits.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 px-3.5 py-2 rounded-lg transition-all border border-slate-200 shadow-xs hover:border-sky-500/50 active:scale-95 cursor-pointer font-mono"
            >
              <Printer className="h-4 w-4 text-sky-400" />
              <span>Print Official PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition-all border border-emerald-500 shadow-xs active:scale-95 cursor-pointer font-mono font-semibold"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Industrial Segmented Document Switcher */}
        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-200 pt-3 text-xs font-mono flex-wrap">
          <button
            onClick={() => setActiveFormType('rf_fr_004')}
            className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-mono text-xs flex items-center gap-2 ${
              activeFormType === 'rf_fr_004'
                ? 'bg-sky-600 text-white border-sky-500 shadow-xs font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${activeFormType === 'rf_fr_004' ? 'bg-white' : 'bg-slate-500'}`}></span>
            RF-FR-004 : 24-Hour Process Sheet
          </button>

          <button
            onClick={() => setActiveFormType('rf_fr_001')}
            className={`px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-mono text-xs flex items-center gap-2 ${
              activeFormType === 'rf_fr_001'
                ? 'bg-sky-600 text-white border-sky-500 shadow-xs font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${activeFormType === 'rf_fr_001' ? 'bg-white' : 'bg-slate-500'}`}></span>
            RF-FR-001 : Sample Analysis Certificate
          </button>

          <button
            onClick={() => {
              setActiveFormType('audit');
              syncAuditLogsFromSupabase().catch(() => {});
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
              activeFormType === 'audit'
                ? 'bg-sky-600 text-white border-sky-500 shadow-xs font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>
              Immutable Audit Trail ({filteredAuditLogs.length !== auditLogs.length ? `${filteredAuditLogs.length}/${auditLogs.length}` : auditLogs.length})
            </span>
          </button>
        </div>

        {/* When activeFormType === 'rf_fr_004', show Shift Date Selector */}
        {activeFormType === 'rf_fr_004' && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-slate-400 font-semibold uppercase flex items-center gap-1.5 text-[11px] tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-sky-400" />
                Shift Date:
              </span>

              {/* Quick prev/next day buttons and dropdown */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="px-2.5 py-1 text-slate-400 hover:text-sky-400 hover:bg-slate-100 transition-colors border-r border-slate-200 cursor-pointer"
                  title="Previous Day (Hari Sebelumnya)"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <select
                  value={selectedShiftDate}
                  onChange={e => handleShiftDateChange(e.target.value)}
                  className="bg-transparent text-slate-800 px-2.5 py-1 text-xs font-mono focus:outline-none cursor-pointer"
                >
                  {availableShiftDates.map(d => (
                    <option key={d} value={d} className="bg-white text-slate-800">
                      {d} {d === getRealtimeShiftDate() ? '(Today · Live)' : '(Past Sheet)'}
                    </option>
                  ))}
                  {!availableShiftDates.includes(selectedShiftDate) && (
                    <option value={selectedShiftDate} className="bg-white text-slate-800">
                      {selectedShiftDate} (Custom Date)
                    </option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="px-2.5 py-1 text-slate-400 hover:text-sky-400 hover:bg-slate-100 transition-colors border-l border-slate-200 cursor-pointer"
                  title="Next Day (Hari Berikutnya)"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Calendar Date Picker Input */}
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-[11px]">Picker:</span>
                <input
                  type="date"
                  value={selectedShiftDate}
                  onChange={e => {
                    if (e.target.value) {
                      handleShiftDateChange(e.target.value);
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-0.5 text-xs font-mono focus:border-sky-500 focus:outline-none cursor-pointer shadow-xs"
                />
              </div>

              {selectedShiftDate !== getRealtimeShiftDate() && (
                <button
                  type="button"
                  onClick={() => handleShiftDateChange(getRealtimeShiftDate())}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-sky-400 border border-sky-800/60 text-[11px] font-mono transition-all cursor-pointer shadow-xs active:scale-95 font-semibold"
                >
                  Jump to Today (Live)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px]">STATUS:</span>
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] tracking-wider uppercase border ${
                sheet.status === 'verified' 
                  ? 'bg-emerald-950/40 text-green-600 border-emerald-800/60' 
                  : 'bg-amber-950/40 text-amber-600 border-amber-800/60'
              }`}>
                {sheet.status}
              </span>

              {sheet.shift_date === getRealtimeShiftDate() ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-800/60 text-[10px] font-mono font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                  LIVE SHIFT
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-mono">
                  ARCHIVED LOG
                </span>
              )}

              <span className="text-slate-400 text-[11px] font-mono hidden md:inline">
                ({(sheet.entries || []).length}/24 Hours Recorded)
              </span>
            </div>
          </div>
        )}

        {/* When activeFormType === 'rf_fr_001', show Lot selector and Quick Edit Remarks button */}
        {activeFormType === 'rf_fr_001' && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-slate-400 font-semibold uppercase flex items-center gap-1.5 text-[11px] tracking-wider">
                <FileText className="h-3.5 w-3.5 text-sky-400" />
                Select Sample Lot / Certificate:
              </span>
              <select
                value={selectedReportId}
                onChange={e => setSelectedReportId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 focus:border-sky-500 focus:outline-none max-w-sm md:max-w-md shadow-xs text-xs font-mono"
              >
                {reports.map(r => (
                  <option key={r.id} value={r.id} className="bg-white text-slate-800">
                    {r.lot_no} — {r.product_name} ({r.time_check} · {r.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openEditRemarks}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-sky-400 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-sky-500/50 shadow-xs transition-all active:scale-95 cursor-pointer font-mono text-xs font-medium"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Remarks & Operating Flags</span>
              </button>
            </div>
          </div>
        )}

        {/* When activeFormType === 'audit', show Audit Trail Date Selector & Filters */}
        {activeFormType === 'audit' && (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-slate-400 font-semibold uppercase flex items-center gap-1.5 text-[11px] tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-sky-400" />
                Filter Date:
              </span>

              {/* Quick prev/next day buttons and dropdown */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => handleAuditStepDay(-1)}
                  className="px-2.5 py-1 text-slate-400 hover:text-sky-400 hover:bg-slate-100 transition-colors border-r border-slate-200 cursor-pointer"
                  title="Previous Day (Hari Sebelumnya)"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <select
                  value={auditDateFilter}
                  onChange={e => setAuditDateFilter(e.target.value)}
                  className="bg-transparent text-slate-800 px-2.5 py-1 text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-white text-slate-800">
                    All Recorded Dates ({auditLogs.length} logs)
                  </option>
                  {availableAuditDates.map(d => {
                    const count = auditLogs.filter(l => l.occurred_at?.startsWith(d)).length;
                    return (
                      <option key={d} value={d} className="bg-white text-slate-800">
                        {d} {d === getRealtimeShiftDate() ? '(Today)' : ''} — ({count} logs)
                      </option>
                    );
                  })}
                  {auditDateFilter !== 'all' && !availableAuditDates.includes(auditDateFilter) && (
                    <option value={auditDateFilter} className="bg-white text-slate-800">
                      {auditDateFilter} (Custom Date)
                    </option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => handleAuditStepDay(1)}
                  className="px-2.5 py-1 text-slate-400 hover:text-sky-400 hover:bg-slate-100 transition-colors border-l border-slate-200 cursor-pointer"
                  title="Next Day (Hari Berikutnya)"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Calendar Date Picker Input */}
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-[11px]">Picker:</span>
                <input
                  type="date"
                  value={auditDateFilter === 'all' ? '' : auditDateFilter}
                  onChange={e => {
                    if (e.target.value) {
                      setAuditDateFilter(e.target.value);
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-0.5 text-xs font-mono focus:border-sky-500 focus:outline-none cursor-pointer shadow-xs"
                />
              </div>

              {auditDateFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setAuditDateFilter('all')}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-mono transition-all cursor-pointer shadow-xs"
                >
                  All Dates
                </button>
              )}

              {auditDateFilter !== getRealtimeShiftDate() && (
                <button
                  type="button"
                  onClick={() => setAuditDateFilter(getRealtimeShiftDate())}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-sky-400 border border-sky-800/60 text-[11px] font-mono transition-all cursor-pointer shadow-xs font-semibold"
                >
                  Today&apos;s Logs
                </button>
              )}
            </div>

            {/* Right side filter controls: Table, Action, and Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Table Name Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-xs">
                <Filter className="h-3 w-3 text-sky-400" />
                <select
                  value={auditTableFilter}
                  onChange={e => setAuditTableFilter(e.target.value)}
                  className="bg-transparent text-slate-800 text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-white text-slate-800">All Tables</option>
                  {availableAuditTables.map(t => (
                    <option key={t} value={t} className="bg-white text-slate-800">{t}</option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-xs">
                <select
                  value={auditActionFilter}
                  onChange={e => setAuditActionFilter(e.target.value)}
                  className="bg-transparent text-slate-800 text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-white text-slate-800">All Actions</option>
                  <option value="insert" className="bg-white text-green-600 font-semibold">INSERT</option>
                  <option value="update" className="bg-white text-amber-600 font-semibold">UPDATE</option>
                  <option value="void" className="bg-white text-red-600 font-semibold">VOID / DELETE</option>
                </select>
              </div>

              {/* Search text box */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  placeholder="Search actor, lot, id..."
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs font-mono focus:border-sky-500 focus:outline-none w-44 placeholder-slate-500 shadow-xs"
                />
              </div>

              {/* Clear filters button */}
              {(auditDateFilter !== 'all' || auditTableFilter !== 'all' || auditActionFilter !== 'all' || auditSearchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setAuditDateFilter('all');
                    setAuditTableFilter('all');
                    setAuditActionFilter('all');
                    setAuditSearchQuery('');
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-red-600 border border-rose-800/60 text-[11px] font-mono cursor-pointer transition-colors shadow-xs"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}

              {/* Records count badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-sky-400 font-mono font-bold text-[11px]">
                <span>{filteredAuditLogs.length} / {auditLogs.length} Records</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FORM 1: RF-FR-004 Layout */}
      {activeFormType === 'rf_fr_004' && (
        <div className="rounded-xl border border-[#222e44] bg-white text-slate-900 p-6 sm:p-8 shadow-2xl overflow-x-auto print:border-none print:shadow-none print:p-0">
          {/* Form Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">
                  Lam Soon Edible Oils Sdn. Bhd.
                </h2>
                <div className="text-sm font-semibold text-slate-500">
                  Refinery Section · Nisshin Deodorizer Plant
                </div>
                <div className="text-base font-bold text-slate-900 mt-1 uppercase">
                  Hourly Process Control Log Sheet
                </div>
              </div>

              <div className="text-right font-mono text-xs border border-slate-900 p-2 rounded">
                <div><strong>DOC NO:</strong> RF-FR-004</div>
                <div><strong>REVISION:</strong> 02</div>
                <div><strong>EFFECTIVE:</strong> 01/01/2026</div>
              </div>
            </div>

            {/* Sub-header Parameters */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-300 font-mono text-xs">
              <div>
                <span className="text-slate-500">SHIFT DATE:</span> <strong>{sheet.shift_date}</strong>
                {sheet.shift_date === getRealtimeShiftDate() ? (
                  <span className="ml-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1 rounded">(LIVE)</span>
                ) : (
                  <span className="ml-1.5 text-[10px] text-slate-500 font-normal bg-slate-200 px-1 rounded">(PAST LOG)</span>
                )}
              </div>
              <div>
                <span className="text-slate-500">STRIPPING STEAM:</span> <strong>{(sheet.stripping_steam_pct ?? 1.5).toFixed(2)} % of oil</strong>
              </div>
              <div>
                <span className="text-slate-500">STEAM SUPPLY:</span> <strong>{(sheet.set_steam_supply_bar ?? 3.0).toFixed(2)} Bar</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500">STATUS:</span> <strong className="uppercase">{sheet.status}</strong>
              </div>
            </div>
          </div>

          {/* 24-Row × 21-Column Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse border border-slate-900 text-[10px] font-mono">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-900 text-slate-800">
                  <th className="border border-slate-900 p-1" rowSpan={2}>Time</th>
                  <th className="border border-slate-900 p-1" rowSpan={2}>Type of Oil</th>
                  <th className="border border-slate-900 p-1" colSpan={3}>Processing</th>
                  <th className="border border-slate-900 p-1" colSpan={7}>Temperature Recorder (°C)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>BC 101 (°C)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Chilling (°C)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Steam Press (Bar)</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Stripping Steam</th>
                  <th className="border border-slate-900 p-1" colSpan={2}>Filtration (Bar)</th>
                  <th className="border border-slate-900 p-1" rowSpan={2}>Remarks</th>
                </tr>
                <tr className="bg-slate-100 text-[9px] border-b border-slate-900">
                  <th className="border border-slate-900 p-1">Feed (L)</th>
                  <th className="border border-slate-900 p-1">Time (Hr)</th>
                  <th className="border border-slate-900 p-1">Vac (Torr)</th>
                  <th className="border border-slate-900 p-1">T1</th>
                  <th className="border border-slate-900 p-1">T2</th>
                  <th className="border border-slate-900 p-1">T3</th>
                  <th className="border border-slate-900 p-1">T4</th>
                  <th className="border border-slate-900 p-1">T5</th>
                  <th className="border border-slate-900 p-1">T6</th>
                  <th className="border border-slate-900 p-1">T7</th>
                  <th className="border border-slate-900 p-1">In</th>
                  <th className="border border-slate-900 p-1">Out</th>
                  <th className="border border-slate-900 p-1">In</th>
                  <th className="border border-slate-900 p-1">Out</th>
                  <th className="border border-slate-900 p-1">Boost</th>
                  <th className="border border-slate-900 p-1">Ejec</th>
                  <th className="border border-slate-900 p-1">%</th>
                  <th className="border border-slate-900 p-1">kg/h</th>
                  <th className="border border-slate-900 p-1">FP-A</th>
                  <th className="border border-slate-900 p-1">FP-B</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 24 }).map((_, idx) => {
                  const label = String(((idx + 7) % 24) * 100).padStart(4, '0');
                  const entry = sheet.entries?.find(e => e.slot_index === idx);
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-900 p-1 font-bold">{label}</td>
                      <td className="border border-slate-900 p-1 font-sans text-left max-w-[90px] truncate">
                        {entry?.product_name || '-'}
                      </td>
                      <td className="border border-slate-900 p-1">{entry?.oil_feed_rate_litre || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.deod_time_set_hr || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.vacuum_torr || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_1_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_2_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_3_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_4_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_5_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_6_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.tray_7_temp_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.bc101_water_in_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.bc101_water_out_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.chill_water_in_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.chill_water_out_c || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.booster_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.ejector_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.strip_steam_pct_of_oil || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.strip_steam_flow_kghr || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.fp101a_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1">{entry?.fp101b_press_bar || '-'}</td>
                      <td className="border border-slate-900 p-1 font-sans text-left max-w-[120px] truncate">
                        {entry?.remarks || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Verification Sign-Off Footer */}
          <div className="grid grid-cols-2 gap-8 mt-6 pt-4 border-t-2 border-slate-900 text-xs font-mono">
            <div>
              <div className="text-slate-500 mb-1">RECORDED BY (LEAD OPERATOR):</div>
              <div className="font-bold text-slate-800 border-b border-slate-400 pb-1">
                {sheet.opened_by_name || 'Ahmad Razak (OP-1042)'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Shift Round Handover Signed</div>
            </div>

            <div>
              <div className="text-slate-500 mb-1">VERIFIED BY (SHIFT SUPERVISOR):</div>
              <div className="font-bold text-slate-800 border-b border-slate-400 pb-1">
                {sheet.verified_by_name ? `${sheet.verified_by_name} [ELECTRONIC SIGNATURE VERIFIED]` : '_____________________________ (Pending Verification)'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {sheet.verified_at ? `Verified At: ${sheet.verified_at}` : 'Awaiting shift completion'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM 2: RF-FR-001 Layout */}
      {activeFormType === 'rf_fr_001' && activeReport && (
        <div className="rounded-xl border border-[#222e44] bg-white text-slate-900 p-6 sm:p-8 shadow-2xl max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight uppercase">
                Lam Soon Edible Oils Sdn. Bhd.
              </h2>
              <div className="text-sm font-semibold text-slate-500">
                Refinery Section · Quality Assurance Department
              </div>
              <div className="text-base font-bold text-slate-900 mt-1 uppercase">
                Sample Analysis Report
              </div>
            </div>

            <div className="text-right font-mono text-xs border border-slate-900 p-2 rounded">
              <div><strong>DOC NO:</strong> RF-FR-001</div>
              <div><strong>REVISION:</strong> 02</div>
              <div><strong>REPORT NO:</strong> {activeReport.report_no}</div>
            </div>
          </div>

          {/* Sample Metadata */}
          <div className="grid grid-cols-3 gap-4 border border-slate-900 p-3 rounded font-mono text-xs mb-4">
            <div><span className="text-slate-500">SAMPLE DATE:</span> <strong>{activeReport.sample_date}</strong></div>
            <div><span className="text-slate-500">TIME CHECK:</span> <strong>{activeReport.time_check}</strong></div>
            <div><span className="text-slate-500">LOT NUMBER:</span> <strong>{activeReport.lot_no}</strong></div>
            <div><span className="text-slate-500">FEED TANK:</span> <strong>{activeReport.feed_tank_code || '-'}</strong></div>
            <div><span className="text-slate-500">DISCHARGE TANK:</span> <strong>{activeReport.discharge_tank_code || '-'}</strong></div>
            <div><span className="text-slate-500">CRYSTALLIZER/BATCH:</span> <strong>{activeReport.batch_no || '-'}</strong></div>
            <div className="col-span-2"><span className="text-slate-500">PRODUCT:</span> <strong>{activeReport.product_name}</strong></div>
            <div><span className="text-slate-500">SAMPLING POINT:</span> <strong>{activeReport.sampling_point_name || 'Outlet'}</strong></div>
          </div>

          {/* Parameters Table */}
          <table className="w-full text-left border-collapse border border-slate-900 text-xs font-mono mb-4">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900">
                <th className="border border-slate-900 p-2">Tested Parameter</th>
                <th className="border border-slate-900 p-2 w-32">Unit</th>
                <th className="border border-slate-900 p-2 w-52">Analytical Result</th>
              </tr>
            </thead>
            <tbody>
              {activeReport.results?.filter(res => res.requested !== false).map(res => (
                <tr key={res.id}>
                  <td className="border border-slate-900 p-2 font-sans">
                    {res.parameter_name.includes('°C') || !res.series_key
                      ? res.parameter_name
                      : `${res.parameter_name} (${res.series_key}°C)`}
                  </td>
                  <td className="border border-slate-900 p-2 text-slate-500">{res.unit || '-'}</td>
                  <td className="border border-slate-900 p-2 font-bold">{res.value_numeric ?? res.value_text ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Section: Operating Conditions & Remarks (RF-FR-001 Official Section) */}
          <div className="border border-slate-900 p-3.5 rounded font-mono text-xs mb-4 bg-slate-50/80">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-2.5">
              <div className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <span>OPERATING CONDITIONS & QC REMARKS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase">
                  Refinery QC Checklist
                </span>
                <button
                  type="button"
                  onClick={openEditRemarks}
                  className="no-print text-[10px] text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 font-sans cursor-pointer"
                >
                  <Edit3 className="h-2.5 w-2.5" /> Edit Remarks
                </button>
              </div>
            </div>

            {/* Operating Condition Checkboxes */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className={`flex items-center gap-2 p-2 rounded border ${
                activeReport.remark_flushing 
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold' 
                  : 'border-slate-300 bg-white text-slate-500'
              }`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center border text-[11px] leading-none ${
                  activeReport.remark_flushing 
                    ? 'border-emerald-700 bg-emerald-600 text-white font-black' 
                    : 'border-slate-400 bg-white text-transparent'
                }`}>
                  ✓
                </div>
                <div>
                  <div className="text-[11px] leading-none">FLUSHING</div>
                  <div className="text-[9px] text-slate-500 font-normal mt-0.5">Sampling line flushed</div>
                </div>
              </div>

              <div className={`flex items-center gap-2 p-2 rounded border ${
                activeReport.remark_cooling 
                  ? 'border-blue-700 bg-blue-50 text-blue-950 font-bold' 
                  : 'border-slate-300 bg-white text-slate-500'
              }`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center border text-[11px] leading-none ${
                  activeReport.remark_cooling 
                    ? 'border-blue-700 bg-blue-600 text-white font-black' 
                    : 'border-slate-400 bg-white text-transparent'
                }`}>
                  ✓
                </div>
                <div>
                  <div className="text-[11px] leading-none">COOLING</div>
                  <div className="text-[9px] text-slate-500 font-normal mt-0.5">Crystallizer active cooling</div>
                </div>
              </div>

              <div className={`flex items-center gap-2 p-2 rounded border ${
                activeReport.remark_pushover 
                  ? 'border-purple-700 bg-purple-50 text-purple-950 font-bold' 
                  : 'border-slate-300 bg-white text-slate-500'
              }`}>
                <div className={`w-4 h-4 rounded flex items-center justify-center border text-[11px] leading-none ${
                  activeReport.remark_pushover 
                    ? 'border-purple-700 bg-purple-600 text-white font-black' 
                    : 'border-slate-400 bg-white text-transparent'
                }`}>
                  ✓
                </div>
                <div>
                  <div className="text-[11px] leading-none">PUSH OVER</div>
                  <div className="text-[9px] text-slate-500 font-normal mt-0.5">Pushover transfer operation</div>
                </div>
              </div>
            </div>

            {/* QC Remarks & Analytical Observations Box */}
            <div className="border border-slate-300 rounded bg-white p-2.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                QC Remarks & Analytical Observations:
              </div>
              <div className="text-xs text-slate-800 font-mono whitespace-pre-wrap min-h-[38px]">
                {activeReport.remarks?.trim() ? (
                  activeReport.remarks
                ) : (
                  <span className="text-slate-400 italic">No special remarks or process deviations noted for this sample lot.</span>
                )}
              </div>
            </div>
          </div>

          {/* QC Formal Decision Stamp */}
          <div className="border-2 border-slate-900 p-4 rounded bg-slate-50 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-2 font-bold">
              <span>QC FORMAL DISPOSITION BLOCK</span>
              <span className="uppercase text-sm">
                STATUS: {activeReport.decision?.decision || 'AWAITING DECISION'}
              </span>
            </div>

            {activeReport.decision && (
              <div className="space-y-1">
                <div><span className="text-slate-500">REASON CODE:</span> <strong>{activeReport.decision.reason_label || 'None (Accepted)'}</strong></div>
                {activeReport.decision.disposition && (
                  <div><span className="text-slate-500">MANDATORY DISPOSITION:</span> <strong className="uppercase text-rose-700">{activeReport.decision.disposition}</strong></div>
                )}
                {activeReport.decision.reason_detail && (
                  <div><span className="text-slate-500">NARRATIVE:</span> {activeReport.decision.reason_detail}</div>
                )}
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Electronic Signature: {activeReport.decision.decided_by_name} · Timestamp: {activeReport.decision.decided_at}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORM 3: Audit Trail Viewer */}
      {activeFormType === 'audit' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-semibold">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-sky-400 shadow-xs">
                <History className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900">Immutable Regulatory Audit Trail</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 text-green-600 border border-emerald-800/60 text-[10px] font-mono font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Supabase Ledger
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono font-normal">
                  Database trigger-level tamper-proof append-only ledger for regulatory compliance
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={async () => {
                  const res = await syncAuditLogsFromSupabase();
                  if (res.success) {
                    setAuditLogs(getAuditLogs());
                  }
                }}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-sky-400 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-500/50 transition-all cursor-pointer text-xs active:scale-95 shadow-xs"
                title="Fetch latest audit logs directly from Supabase"
              >
                <RotateCcw className="h-3.5 w-3.5 text-sky-400" />
                <span>Sync Supabase</span>
              </button>

              <span className="text-xs font-mono text-sky-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-semibold">
                Showing {filteredAuditLogs.length} of {auditLogs.length} Records
              </span>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(auditDateFilter !== 'all' || auditTableFilter !== 'all' || auditActionFilter !== 'all' || auditSearchQuery.trim()) && (
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono pt-1 pb-1">
              <span className="text-slate-400 text-[11px]">ACTIVE FILTERS:</span>

              {auditDateFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-50 text-sky-400 border border-sky-800/60 text-[11px] font-medium">
                  Date: {auditDateFilter}
                  <button
                    type="button"
                    onClick={() => setAuditDateFilter('all')}
                    className="hover:text-sky-200 cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {auditTableFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-50 text-sky-400 border border-sky-800/60 text-[11px] font-medium">
                  Table: {auditTableFilter}
                  <button
                    type="button"
                    onClick={() => setAuditTableFilter('all')}
                    className="hover:text-sky-200 cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {auditActionFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-950/40 text-amber-600 border border-amber-800/60 text-[11px] font-medium">
                  Action: {auditActionFilter.toUpperCase()}
                  <button
                    type="button"
                    onClick={() => setAuditActionFilter('all')}
                    className="hover:text-amber-200 cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {auditSearchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-50 text-sky-400 border border-sky-800/60 text-[11px] font-medium">
                  Search: &ldquo;{auditSearchQuery}&rdquo;
                  <button
                    type="button"
                    onClick={() => setAuditSearchQuery('')}
                    className="hover:text-sky-200 cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setAuditDateFilter('all');
                  setAuditTableFilter('all');
                  setAuditActionFilter('all');
                  setAuditSearchQuery('');
                }}
                className="text-[11px] text-slate-400 hover:text-sky-400 underline ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Audit Logs Table or Empty State */}
          {filteredAuditLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center space-y-3 font-mono">
              <div className="h-10 w-10 mx-auto rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sky-400 shadow-xs">
                <History className="h-5 w-5" />
              </div>
              <div className="text-slate-800 font-semibold text-sm">No Audit Trail Records Found</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No database ledger events match the selected date ({auditDateFilter === 'all' ? 'All Dates' : auditDateFilter}) or active search filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuditDateFilter('all');
                  setAuditTableFilter('all');
                  setAuditActionFilter('all');
                  setAuditSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-sky-400 border border-slate-200 text-xs font-mono transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-white text-slate-400 text-[10px] tracking-wider uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp (MYT)</th>
                    <th className="py-2.5 px-3">Table Name</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Authorized Actor</th>
                    <th className="py-2.5 px-3">Record ID</th>
                    <th className="py-2.5 px-3">Audit Details &amp; Payload</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {filteredAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {formatDateTime(log.occurred_at)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-sky-400 text-[10px] tracking-wide font-mono font-medium">
                          {log.table_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                          log.action === 'insert' ? 'bg-emerald-950/40 text-green-600 border-emerald-800/60' :
                          log.action === 'update' ? 'bg-amber-950/40 text-amber-600 border-amber-800/60' : 'bg-rose-950/40 text-red-600 border-rose-800/60'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap font-medium text-[11px]">
                        {log.actor_name || 'System / DB Trigger'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[120px] truncate font-mono">
                        {String(log.record_id || log.id || '-')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-sm md:max-w-md truncate font-mono text-[11px]">
                        {JSON.stringify(log.new_row || log.old_row || {})}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(log.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-sky-400 border border-slate-200 text-[10px] transition-colors cursor-pointer active:scale-95 font-mono shadow-xs"
                        >
                          <Eye className="h-3 w-3 text-sky-400" />
                          <span>View JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expanded Audit Log JSON Modal */}
          {expandedLogId != null && (() => {
            const expLog = auditLogs.find(l => l.id === expandedLogId);
            if (!expLog) return null;
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 no-print">
                <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                      <History className="h-4 w-4 text-sky-400" />
                      <span>Audit Record Details — ID: {String(expLog.id)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(null)}
                      className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <div className="text-slate-400 uppercase text-[9px] tracking-wider">Timestamp:</div>
                      <div className="text-slate-800 font-medium">{formatDateTime(expLog.occurred_at)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase text-[9px] tracking-wider">Table:</div>
                      <div className="text-sky-400 font-semibold">{expLog.table_name}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase text-[9px] tracking-wider">Action:</div>
                      <div className="uppercase font-bold text-green-600">{expLog.action}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 uppercase text-[9px] tracking-wider">Actor:</div>
                      <div className="text-slate-800">{expLog.actor_name || 'System / DB Trigger'}</div>
                    </div>
                  </div>

                  <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                    {expLog.new_row && (
                      <div>
                        <div className="text-green-600 font-bold mb-1 text-[11px] flex items-center gap-1.5 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          NEW ROW DATA (State after operation):
                        </div>
                        <pre className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(expLog.new_row, null, 2)}
                        </pre>
                      </div>
                    )}

                    {expLog.old_row && (
                      <div>
                        <div className="text-red-600 font-bold mb-1 text-[11px] flex items-center gap-1.5 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          OLD ROW DATA (State before operation):
                        </div>
                        <pre className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(expLog.old_row, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(null)}
                      className="px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs transition-colors cursor-pointer border border-slate-200 font-mono"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Quick Edit Remarks Modal (RF-FR-001) */}
      {isEditingRemarks && activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 no-print">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Edit3 className="h-4 w-4 text-sky-400" />
                <span>Edit Remarks & Operating Flags — Lot {activeReport.lot_no}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingRemarks(false)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-green-600 text-xs font-mono">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCertificateRemarks} className="space-y-4">
              {/* Checkboxes */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 font-semibold uppercase tracking-wider text-[10px]">
                  Operating Condition Checklist:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                    editFlushing 
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editFlushing}
                      onChange={e => setEditFlushing(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-200 bg-slate-50 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="font-mono text-xs">
                      <div className="font-semibold text-slate-800">Flushing</div>
                      <div className="text-[10px] text-slate-400">Line flushed</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                    editCooling 
                      ? 'bg-sky-950/40 border-sky-800/60 text-sky-300 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editCooling}
                      onChange={e => setEditCooling(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-200 bg-slate-50 text-sky-500 focus:ring-sky-500 cursor-pointer"
                    />
                    <div className="font-mono text-xs">
                      <div className="font-semibold text-slate-800">Cooling</div>
                      <div className="text-[10px] text-slate-400">Active cooling</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                    editPushover 
                      ? 'bg-sky-950/40 border-sky-800/60 text-sky-300 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editPushover}
                      onChange={e => setEditPushover(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-200 bg-slate-50 text-sky-500 focus:ring-sky-500 cursor-pointer"
                    />
                    <div className="font-mono text-xs">
                      <div className="font-semibold text-slate-800">Push over</div>
                      <div className="text-[10px] text-slate-400">Pushover transfer</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Free Text Blank Area for QC Remarks */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 font-semibold uppercase tracking-wider text-[10px]">
                  QC Remarks & Observations:
                </label>
                <textarea
                  rows={3}
                  value={editRemarksText}
                  onChange={e => setEditRemarksText(e.target.value)}
                  placeholder="Type remarks here (e.g. sample appearance, clarity, moisture haze, process deviations, or batch notes)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-y shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 font-mono">
                <button
                  type="button"
                  onClick={() => setIsEditingRemarks(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-sm font-mono cursor-pointer active:scale-95"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save & Sync Remarks</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
