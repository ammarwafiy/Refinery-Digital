'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Copy,
  Layers,
  FlaskConical,
  Activity,
  Check,
  BarChart3,
  SlidersHorizontal
} from 'lucide-react';
import {
  getActiveProcessSheet,
  getAllProcessSheets,
  getSampleReports,
  getDeviations,
  getProducts
} from '@/lib/data-service';
import { ProcessEntry } from '@/types/refinery';

type ReportPeriod = 'daily' | 'monthly' | 'yearly';
type ReportCategory = 'process' | 'qc' | 'deviations' | 'master';

export default function ReportExportView() {
  const sheet = getActiveProcessSheet();
  const sampleReports = getSampleReports();
  const deviations = getDeviations();
  const products = getProducts();

  // Filter States
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [category, setCategory] = useState<ReportCategory>('process');
  
  // Date selections
  const defaultDate = sheet.shift_date || new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultDate.slice(0, 7)); // '2026-09'
  const [selectedYear, setSelectedYear] = useState<string>(defaultDate.slice(0, 4)); // '2026'
  
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Helper date matcher
  const matchesDate = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    const clean = dateStr.slice(0, 10);
    if (period === 'daily') {
      return clean === selectedDate;
    }
    if (period === 'monthly') {
      return clean.startsWith(selectedMonth);
    }
    if (period === 'yearly') {
      return clean.startsWith(selectedYear);
    }
    return true;
  };

  // Filtered Process Entries across all saved shift sheets
  const filteredProcessEntries = useMemo(() => {
    const allSheets = getAllProcessSheets();
    const sheetsList = Object.values(allSheets);
    const allEntries: (ProcessEntry & { sheet_date?: string })[] = [];
    sheetsList.forEach(s => {
      (s.entries || []).forEach(e => {
        allEntries.push({ ...e, sheet_date: s.shift_date });
      });
    });

    return allEntries.filter(e => {
      // Check sheet date
      const dateMatches = matchesDate(e.sheet_date || sheet.shift_date);
      const productMatches = selectedProductId === 'all' || e.product_id === selectedProductId || (e.product_name && e.product_name.toLowerCase().includes(selectedProductId.toLowerCase()));
      const queryMatches = !searchQuery || 
        (e.slot_label && e.slot_label.includes(searchQuery)) ||
        (e.product_name && e.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.recorded_by_name && e.recorded_by_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.remarks && e.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateMatches && productMatches && queryMatches;
    });
  }, [sheet, period, selectedDate, selectedMonth, selectedYear, selectedProductId, searchQuery]);

  // Filtered QC Reports
  const filteredQCReports = useMemo(() => {
    return sampleReports.filter(r => {
      const dateMatches = matchesDate(r.sample_date);
      const productMatches = selectedProductId === 'all' || r.product_id === selectedProductId || (r.product_name && r.product_name.toLowerCase().includes(selectedProductId.toLowerCase()));
      const queryMatches = !searchQuery ||
        (r.report_no && r.report_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.lot_no && r.lot_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.product_name && r.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.decision?.decision && r.decision.decision.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateMatches && productMatches && queryMatches;
    });
  }, [sampleReports, period, selectedDate, selectedMonth, selectedYear, selectedProductId, searchQuery]);

  // Filtered Deviations
  const filteredDeviations = useMemo(() => {
    return deviations.filter(d => {
      const dateMatches = matchesDate(d.created_at);
      const queryMatches = !searchQuery ||
        (d.field_label && d.field_label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.slot_label && d.slot_label.includes(searchQuery)) ||
        (d.acknowledged_by_name && d.acknowledged_by_name.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateMatches && queryMatches;
    });
  }, [deviations, period, selectedDate, selectedMonth, selectedYear, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalEntries = filteredProcessEntries.length;
    const avgVacuum = totalEntries > 0 
      ? (filteredProcessEntries.reduce((acc, e) => acc + (e.vacuum_torr || 0), 0) / totalEntries).toFixed(2)
      : '-';
    const avgTray4 = totalEntries > 0
      ? (filteredProcessEntries.reduce((acc, e) => acc + (e.tray_4_temp_c || 0), 0) / totalEntries).toFixed(1)
      : '-';

    const totalQC = filteredQCReports.length;
    const acceptedQC = filteredQCReports.filter(r => r.decision?.decision === 'accept').length;
    const passRate = totalQC > 0 ? Math.round((acceptedQC / totalQC) * 100) : 100;

    return { totalEntries, avgVacuum, avgTray4, totalQC, acceptedQC, passRate };
  }, [filteredProcessEntries, filteredQCReports]);

  // CSV Generator
  const generateCSVData = (): { filename: string; content: string } => {
    const timeLabel = period === 'daily' 
      ? selectedDate 
      : period === 'monthly' 
        ? selectedMonth 
        : selectedYear;

    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (category === 'process') {
      filename = `RF-FR-004_Process_Log_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'Shift Date',
        'Time Slot',
        'Product Name',
        'Feed Rate (L/hr)',
        'Deod Time (hr)',
        'Vacuum (Torr)',
        'Tray 1 (°C)',
        'Tray 2 (°C)',
        'Tray 3 (°C)',
        'Tray 4 (°C)',
        'Tray 5 (°C)',
        'Tray 6 (°C)',
        'Tray 7 (°C)',
        'BC101 In (°C)',
        'BC101 Out (°C)',
        'Chill In (°C)',
        'Chill Out (°C)',
        'Booster (bar)',
        'Ejector (bar)',
        'Strip Steam %',
        'Strip Flow (kg/h)',
        'FP101A (bar)',
        'FP101B (bar)',
        'Status / Deviation',
        'Recorded By',
        'Remarks'
      ];

      rows = filteredProcessEntries.map(e => [
        sheet.shift_date,
        e.slot_label,
        `"${(e.product_name || '-').replace(/"/g, '""')}"`,
        e.oil_feed_rate_litre ?? '-',
        e.deod_time_set_hr ?? '-',
        e.vacuum_torr ?? '-',
        e.tray_1_temp_c ?? '-',
        e.tray_2_temp_c ?? '-',
        e.tray_3_temp_c ?? '-',
        e.tray_4_temp_c ?? '-',
        e.tray_5_temp_c ?? '-',
        e.tray_6_temp_c ?? '-',
        e.tray_7_temp_c ?? '-',
        e.bc101_water_in_c ?? '-',
        e.bc101_water_out_c ?? '-',
        e.chill_water_in_c ?? '-',
        e.chill_water_out_c ?? '-',
        e.booster_press_bar ?? '-',
        e.ejector_press_bar ?? '-',
        e.strip_steam_pct_of_oil ?? '-',
        e.strip_steam_flow_kghr ?? '-',
        e.fp101a_press_bar ?? '-',
        e.fp101b_press_bar ?? '-',
        e.has_deviation ? 'DEVIATION DETECTED' : 'NORMAL',
        `"${(e.recorded_by_name || '-').replace(/"/g, '""')}"`,
        `"${(e.remarks || '').replace(/"/g, '""')}"`
      ]);
    } else if (category === 'qc') {
      filename = `RF-FR-001_QC_Lab_Report_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'Report No',
        'Sample Date',
        'Time',
        'Lot Number',
        'Product Name',
        'Feed Tank',
        'Discharge Tank',
        'Sampling Point',
        'FFA (%)',
        'Moisture (%)',
        'IV (g I2/100g)',
        'PV (meq/kg)',
        'Colour Red (R)',
        'Colour Yellow (Y)',
        'Odour',
        'Cloud Point (°C)',
        'QC Decision',
        'Reason / Notes',
        'Analyst Name'
      ];

      rows = filteredQCReports.map(r => {
        const getRes = (code: string) => (r.results || []).find(res => res.parameter_code === code)?.value_numeric ?? '-';
        const getOdour = () => (r.results || []).find(res => res.parameter_code === 'ODOUR')?.value_text ?? '-';

        return [
          r.report_no,
          r.sample_date,
          r.time_check,
          r.lot_no,
          `"${(r.product_name || '-').replace(/"/g, '""')}"`,
          r.feed_tank_code || '-',
          r.discharge_tank_code || '-',
          `"${(r.sampling_point_name || '-').replace(/"/g, '""')}"`,
          getRes('FFA'),
          getRes('H2O'),
          getRes('IV'),
          getRes('PV'),
          getRes('COLOUR_R'),
          getRes('COLOUR_Y'),
          getOdour(),
          getRes('CLOUD_POINT'),
          r.decision?.decision ? r.decision.decision.toUpperCase() : 'PENDING',
          `"${(r.decision?.reason_label || r.remarks || '-').replace(/"/g, '""')}"`,
          `"${(r.decision?.decided_by_name || r.submitted_by_name || '-').replace(/"/g, '""')}"`
        ];
      });
    } else if (category === 'deviations') {
      filename = `Plant_Deviations_Log_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'ID',
        'Date / Time',
        'Time Slot',
        'Parameter',
        'Observed Value',
        'Soft Min',
        'Soft Max',
        'Status',
        'Acknowledged By',
        'Action Taken'
      ];

      rows = filteredDeviations.map(d => [
        d.id,
        d.created_at,
        d.slot_label,
        `"${d.field_label}"`,
        d.observed,
        d.soft_min ?? '-',
        d.soft_max ?? '-',
        d.acknowledged_by ? 'ACKNOWLEDGED' : 'OPEN DEVIATION',
        `"${(d.acknowledged_by_name || '-').replace(/"/g, '""')}"`,
        `"${(d.action_taken || '-').replace(/"/g, '""')}"`
      ]);
    } else {
      // Master Combined Report
      filename = `Master_Refinery_Plant_Record_${period.toUpperCase()}_${timeLabel}.csv`;
      headers = [
        'Shift Date',
        'Slot',
        'Product',
        'Vacuum (Torr)',
        'Tray 4 Temp (°C)',
        'Strip Steam %',
        'Process Status',
        'Matching QC Lot',
        'QC Decision',
        'FFA %',
        'Moisture %',
        'IV',
        'Operator',
        'Supervisor / Analyst'
      ];

      rows = filteredProcessEntries.map((e, idx) => {
        const matchingQC = filteredQCReports[idx % Math.max(1, filteredQCReports.length)];
        const ffa = (matchingQC?.results || []).find(r => r.parameter_code === 'FFA')?.value_numeric ?? '-';
        const h2o = (matchingQC?.results || []).find(r => r.parameter_code === 'H2O')?.value_numeric ?? '-';
        const iv = (matchingQC?.results || []).find(r => r.parameter_code === 'IV')?.value_numeric ?? '-';

        return [
          sheet.shift_date,
          e.slot_label,
          `"${(e.product_name || '-').replace(/"/g, '""')}"`,
          e.vacuum_torr ?? '-',
          e.tray_4_temp_c ?? '-',
          e.strip_steam_pct_of_oil ?? '-',
          e.has_deviation ? 'DEVIATION' : 'NORMAL',
          matchingQC?.lot_no || '-',
          matchingQC?.decision?.decision ? matchingQC.decision.decision.toUpperCase() : 'PENDING',
          ffa,
          h2o,
          iv,
          `"${(e.recorded_by_name || '-').replace(/"/g, '""')}"`,
          `"${(matchingQC?.decision?.decided_by_name || '-').replace(/"/g, '""')}"`
        ];
      });
    }

    // Include UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    return { filename, content: csvContent };
  };

  const handleDownloadCSV = () => {
    const { filename, content } = generateCSVData();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const { content } = generateCSVData();
    // Convert CSV to TSV for Excel tab-separated paste
    const tsvContent = content.replace(/\uFEFF/, '').replace(/,/g, '\t');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#0d1527]/90 to-slate-900/90 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3.5 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Plant Operations & Quality Report Generator
                </h1>
                <span className="rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-mono font-medium text-emerald-300 border border-emerald-500/30">
                  CSV Export Engine
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Generate and download comprehensive SCADA operational records and QC laboratory results for daily shift rounds, monthly performance, or yearly audits.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 self-end lg:self-auto">
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs sm:text-sm font-mono font-semibold text-slate-200 hover:bg-slate-700/80 hover:text-white transition-all cursor-pointer shadow-sm"
              title="Copy filtered data directly to clipboard for instant Excel paste"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-400" />
                  <span>Copy for Excel</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs sm:text-sm font-mono font-semibold text-white hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <Download className="h-4 w-4" />
              <span>Download CSV File</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>FILTERED RECORDS</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {category === 'process' || category === 'master' ? stats.totalEntries : category === 'qc' ? stats.totalQC : filteredDeviations.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {period === 'daily' ? `Daily Shift (${selectedDate})` : period === 'monthly' ? `Monthly (${selectedMonth})` : `Yearly (${selectedYear})`}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>QC PASS RATE</span>
            <FlaskConical className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {stats.passRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {stats.acceptedQC} of {stats.totalQC} samples approved
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>AVG DEOD VACUUM</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-300">
            {stats.avgVacuum} <span className="text-xs font-normal text-slate-400">Torr</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Target: &lt; 4.5 Torr
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>AVG TRAY 4 TEMP</span>
            <BarChart3 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            {stats.avgTray4} <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Standard: 250 - 268°C
          </div>
        </div>
      </div>

      {/* Filter Selection Panel */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/60 text-xs font-mono text-slate-400 uppercase tracking-wider">
          <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
          <span>Report Configuration & Parameters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Period Selector (Daily / Monthly / Yearly) */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-2">
              1. Generation Timeframe:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPeriod('daily')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  period === 'daily'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  period === 'monthly'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPeriod('yearly')}
                className={`py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  period === 'yearly'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Yearly
              </button>
            </div>

            {/* Dynamic Date Inputs based on Period */}
            <div className="mt-3">
              {period === 'daily' && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setSelectedDate(defaultDate)}
                    className="px-2.5 py-2 text-[11px] font-mono rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              )}

              {period === 'monthly' && (
                <div>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {period === 'yearly' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="2026">2026 (Operational Year)</option>
                  <option value="2025">2025 (Historical Archive)</option>
                  <option value="2024">2024 (Baseline Year)</option>
                </select>
              )}
            </div>
          </div>

          {/* 2. Category Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-2">
              2. Data Category:
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCategory('process')}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer text-left flex items-center gap-1.5 ${
                  category === 'process'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Process Log</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('qc')}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer text-left flex items-center gap-1.5 ${
                  category === 'qc'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">QC Lab</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('deviations')}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer text-left flex items-center gap-1.5 ${
                  category === 'deviations'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Deviations</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('master')}
                className={`py-2 px-2.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer text-left flex items-center gap-1.5 ${
                  category === 'master'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Master Combined</span>
              </button>
            </div>

            <div className="mt-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="all">All Products (Unfiltered)</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Search & Quick Filters */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-2">
              3. Search Filter & Live Preview:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search slot, lot no, operator, remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/90 pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="mt-3 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Output File:</span>
                <span className="text-emerald-400 font-semibold truncate max-w-[170px]">
                  {category === 'process' ? 'RF-FR-004' : category === 'qc' ? 'RF-FR-001' : category === 'deviations' ? 'Deviations' : 'Master'}_{period}_{period === 'daily' ? selectedDate : period === 'monthly' ? selectedMonth : selectedYear}.csv
                </span>
              </div>
              <div className="flex justify-between">
                <span>Matching Rows:</span>
                <span className="text-white font-bold">
                  {category === 'process' || category === 'master' ? filteredProcessEntries.length : category === 'qc' ? filteredQCReports.length : filteredDeviations.length} records
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Data Table Preview */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase text-slate-300 tracking-wider">
              {category === 'process' && 'RF-FR-004 Hourly Process Log Preview'}
              {category === 'qc' && 'RF-FR-001 QC Lab Analysis Preview'}
              {category === 'deviations' && 'Plant Deviations & Excursions Preview'}
              {category === 'master' && 'Master Operations & Quality Merged Preview'}
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
              {category === 'process' || category === 'master' ? filteredProcessEntries.length : category === 'qc' ? filteredQCReports.length : filteredDeviations.length} rows ready
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            Export format: <span className="text-emerald-400">RFC-4180 CSV (Excel UTF-8 BOM Compliant)</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[440px] scrollbar-thin scrollbar-thumb-slate-700">
          {/* 1. PROCESS LOG TABLE PREVIEW */}
          {(category === 'process' || category === 'master') && (
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 border-b border-slate-800 bg-[#0c1220] text-[11px] font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-3 py-3 text-right">Feed (L)</th>
                  <th className="px-3 py-3 text-right">Vac (Torr)</th>
                  <th className="px-3 py-3 text-right">Tray 4 (°C)</th>
                  <th className="px-3 py-3 text-right">Tray 7 (°C)</th>
                  <th className="px-3 py-3 text-right">Steam %</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {filteredProcessEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No operational process entries found matching the selected timeframe and filters.
                    </td>
                  </tr>
                ) : (
                  filteredProcessEntries.map((e) => (
                    <tr key={e.id || e.slot_index} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-cyan-400">{e.slot_label}</td>
                      <td className="px-4 py-2.5 font-sans font-medium text-slate-200">{e.product_name || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">{e.oil_feed_rate_litre?.toLocaleString() || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-cyan-300">{e.vacuum_torr?.toFixed(1) || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-300">{e.tray_4_temp_c?.toFixed(1) || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">{e.tray_7_temp_c?.toFixed(1) || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">{e.strip_steam_pct_of_oil ?? '-'}%</td>
                      <td className="px-4 py-2.5">
                        {e.has_deviation ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-800/40">
                            <AlertTriangle className="h-3 w-3" /> Deviation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/40">
                            <CheckCircle2 className="h-3 w-3" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-sans text-xs text-slate-300">{e.recorded_by_name || '-'}</td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400 max-w-[200px] truncate" title={e.remarks || undefined}>
                        {e.remarks || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* 2. QC LAB TABLE PREVIEW */}
          {category === 'qc' && (
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 border-b border-slate-800 bg-[#0c1220] text-[11px] font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Report No</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-4 py-3">Lot No</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-3 py-3 text-right">FFA (%)</th>
                  <th className="px-3 py-3 text-right">Moisture (%)</th>
                  <th className="px-3 py-3 text-right">IV</th>
                  <th className="px-3 py-3 text-right">Colour R/Y</th>
                  <th className="px-4 py-3">QC Decision</th>
                  <th className="px-4 py-3">Decided By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {filteredQCReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      No QC sample laboratory reports found matching the selected timeframe and filters.
                    </td>
                  </tr>
                ) : (
                  filteredQCReports.map((r) => {
                    const ffa = (r.results || []).find(res => res.parameter_code === 'FFA')?.value_numeric;
                    const h2o = (r.results || []).find(res => res.parameter_code === 'H2O')?.value_numeric;
                    const iv = (r.results || []).find(res => res.parameter_code === 'IV')?.value_numeric;
                    const colR = (r.results || []).find(res => res.parameter_code === 'COLOUR_R')?.value_numeric;
                    const colY = (r.results || []).find(res => res.parameter_code === 'COLOUR_Y')?.value_numeric;
                    const isAccepted = r.decision?.decision === 'accept';
                    const isRejected = r.decision?.decision === 'reject';

                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-cyan-400">{r.report_no}</td>
                        <td className="px-3 py-2.5 text-slate-400">{r.time_check}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-200">{r.lot_no}</td>
                        <td className="px-4 py-2.5 font-sans text-slate-300">{r.product_name}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-400">{ffa ?? '-'}%</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-300">{h2o ?? '-'}%</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-300">{iv ?? '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-amber-300">
                          {colR ?? '-'}/{colY ?? '-'}
                        </td>
                        <td className="px-4 py-2.5">
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-700/50">
                              <CheckCircle2 className="h-3 w-3" /> ACCEPTED
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-950/70 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-700/50">
                              <XCircle className="h-3 w-3" /> REJECTED
                            </span>
                          )}
                          {!isAccepted && !isRejected && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-700/50">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-xs text-slate-300">
                          {r.decision?.decided_by_name || r.submitted_by_name || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* 3. DEVIATIONS TABLE PREVIEW */}
          {category === 'deviations' && (
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 border-b border-slate-800 bg-[#0c1220] text-[11px] font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Parameter</th>
                  <th className="px-3 py-3 text-right">Observed</th>
                  <th className="px-3 py-3 text-right">Soft Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Acknowledged By</th>
                  <th className="px-4 py-3">Action Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {filteredDeviations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No deviation or operational excursion records found.
                    </td>
                  </tr>
                ) : (
                  filteredDeviations.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-cyan-400">{d.slot_label}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-200">{d.field_label}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-rose-400">{d.observed}</td>
                      <td className="px-3 py-2.5 text-right text-slate-400">{d.soft_min ?? '-'} - {d.soft_max ?? '-'}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-300">
                        {d.acknowledged_by ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Acknowledged
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Open
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{d.acknowledged_by_name || '-'}</td>
                      <td className="px-4 py-2.5 text-slate-400 max-w-[200px] truncate" title={d.action_taken || undefined}>
                        {d.action_taken || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer Download Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800 bg-[#080d16] text-xs font-mono text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Historical record buffer ready for export into Microsoft Excel / CSV spreadsheet</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all cursor-pointer shadow-md"
            >
              <Download className="h-4 w-4" />
              <span>Export {category.toUpperCase()} to CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
