'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area,
  ReferenceLine
} from 'recharts';
import { 
  getActiveProcessSheet, 
  getSampleReports, 
  getRejectionReasons,
  getProducts,
  syncSampleReportsFromSupabase
} from '@/lib/data-service';
import { SampleReport, ProcessSheet } from '@/types/refinery';
import GliderTabs from './GliderTabs';
import SearchableSelect from './SearchableSelect';
import { 
  BarChart3, 
  TrendingUp, 
  AlertOctagon, 
  Layers,
  Search,
  Filter,
  UserCheck,
  Calendar,
  Clock,
  Eye,
  X,
  FileText,
  AlertTriangle,
  Tag,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/utils';

// Normalization helpers for Pareto Reason Codes and Products
function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'all') return 'All Shifts (All-Time)';
  const [yearStr, monthStr] = monthKey.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  if (isNaN(y) || isNaN(m)) return monthKey;
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getReasonCategory(label?: string | null, reasonId?: string | null): string {
  if (!label && !reasonId) return 'Other Defect';
  const allReasons = getRejectionReasons();
  const matched = allReasons.find(r => r.id === reasonId || r.code === reasonId || r.label === label);
  if (matched) {
    switch (matched.code) {
      case 'FFA_HIGH': return 'FFA above spec';
      case 'H2O_HIGH': return 'Moisture above limit';
      case 'PV_HIGH': return 'PV above spec';
      case 'COLOUR_OUT': return 'Colour out of spec';
      case 'OFF_ODOUR': return 'Off odour';
      case 'SMP_OUT': return 'SMP out of range';
      case 'CLOUD_OUT': return 'Cloud point out of range';
      case 'SFC_OUT': return 'SFC profile out of range';
      case 'SOAP_HIGH': return 'Soap content high';
      case 'IV_OUT': return 'IV out of range';
      case 'CONTAMINATION': return 'Cross-contamination';
      case 'WRONG_TANK': return 'Wrong product in tank';
      case 'SAMPLING_ERR': return 'Sampling error';
      default: return matched.label;
    }
  }

  const l = (label || '').toLowerCase();
  if (l.includes('colour') || l.includes('color')) return 'Colour out of spec';
  if (l.includes('ffa') || l.includes('fatty acid')) return 'FFA above spec';
  if (l.includes('odour') || l.includes('odor')) return 'Off odour';
  if (l.includes('smp') || l.includes('slip melting') || l.includes('melting point')) return 'SMP out of range';
  if (l.includes('moisture') || l.includes('h2o') || l.includes('water')) return 'Moisture above limit';
  if (l.includes('soap')) return 'Soap content high';
  if (l.includes('peroxide') || l.includes('pv')) return 'PV above spec';
  if (l.includes('cloud')) return 'Cloud point out of range';
  if (l.includes('sfc')) return 'SFC profile out of range';
  if (l.includes('iodine') || l.includes('iv')) return 'IV out of range';
  if (l.includes('contamination')) return 'Cross-contamination';
  if (l.includes('wrong') || l.includes('tank')) return 'Wrong product in tank';
  if (l.includes('sampling')) return 'Sampling error';
  return label || 'Other Defect';
}

function getProductCategory(name?: string | null): string {
  if (!name) return 'Other Product';
  const trimmed = name.trim();
  const l = trimmed.toLowerCase();
  if (l.includes('pl 65') || l.includes('pl65') || l.includes('matsuyama')) return 'PL 65 Matsuyama';
  if (l.includes('chocohi') || l.includes('357')) return 'Chocohi 357A';
  if (l.includes('naturel') || l.includes('wos')) return 'Naturel WOS';
  if (l.includes('daisy') || l.includes('pm18')) return 'Daisy Soft PM18';
  if (l.includes('rpmo')) return 'RPMO';
  if (l.includes('rpko')) return 'RPKO';
  if (l.includes('rpkl')) return 'RPKL';
  if (l.includes('pfad')) return 'PFAD';
  if (l.includes('rbdpo') || l.includes('palm oil')) return 'RBD Palm Oil';
  if (l.includes('rbdpol') || l.includes('palm olein')) return 'RBD Palm Olein';
  if (l.includes('rbdps') || l.includes('palm stearin')) return 'RBD Palm Stearin';
  return trimmed;
}

export default function AnalyticsTrendsView() {
  const [sheet, setSheet] = useState<ProcessSheet>(() => getActiveProcessSheet());
  const [reports, setReports] = useState<SampleReport[]>(() => getSampleReports());

  // Filter controls: Month selection & Disposition scope
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [dispositionScope, setDispositionScope] = useState<'rejects_only' | 'all_non_conformances'>('rejects_only');

  // Filter for specific Pareto reason selection (interactive drilldown from chart)
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string | null>(null);

  // Search query for rejected lots traceability registry
  const [lotSearchQuery, setLotSearchQuery] = useState<string>('');

  // Selected report for analytical laboratory inspection modal
  const [inspectReport, setInspectReport] = useState<SampleReport | null>(null);

  // Auto-clear reason filter whenever month or scope changes so no stale/mismatched filter occurs
  useEffect(() => {
    setSelectedReasonFilter(null);
  }, [selectedMonth, dispositionScope]);

  // Listen for live QC lab updates (RF-FR-001) and sync with Supabase cloud DB
  useEffect(() => {
    // Initial fetch from Supabase to sync live cloud reports
    syncSampleReportsFromSupabase().then(() => {
      setReports(getSampleReports());
    });

    const handleUpdate = (e?: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setReports(e.detail);
      } else {
        setReports(getSampleReports());
      }
      setSheet(getActiveProcessSheet());
    };

    window.addEventListener('refinery_reports_updated', handleUpdate);
    window.addEventListener('refinery_sheet_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('refinery_reports_updated', handleUpdate);
      window.removeEventListener('refinery_sheet_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Selected parameter view
  const [activeMetric, setActiveMetric] = useState<'trays' | 'bc101' | 'chilling' | 'steam' | 'vacuum'>('trays');

  // Discover available shift months from live reports
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    reports.forEach(r => {
      if (r.sample_date && /^\d{4}-\d{2}/.test(r.sample_date)) {
        monthsSet.add(r.sample_date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  // Scoped reports based on selected month filter
  const scopedReports = useMemo(() => {
    if (selectedMonth === 'all') return reports;
    return reports.filter(r => r.sample_date && r.sample_date.startsWith(selectedMonth));
  }, [reports, selectedMonth]);

  // Counts strictly synchronized with QC Management
  const totalLotsCount = scopedReports.length;
  const totalRejectsCount = useMemo(() => {
    return scopedReports.filter(r => r.decision?.decision === 'reject').length;
  }, [scopedReports]);
  const totalConcessionsCount = useMemo(() => {
    return scopedReports.filter(r => r.decision?.decision === 'accept_concession').length;
  }, [scopedReports]);

  // Build time series data from 24-hour entries
  const timeSeriesData = (sheet.entries || []).map(entry => ({
    time: entry.slot_label,
    vacuum: entry.vacuum_torr,
    tray1: entry.tray_1_temp_c,
    tray2: entry.tray_2_temp_c,
    tray3: entry.tray_3_temp_c,
    tray4: entry.tray_4_temp_c,
    tray5: entry.tray_5_temp_c,
    tray6: entry.tray_6_temp_c,
    tray7: entry.tray_7_temp_c,
    bc101In: entry.bc101_water_in_c,
    bc101Out: entry.bc101_water_out_c,
    chillIn: entry.chill_water_in_c,
    chillOut: entry.chill_water_out_c,
    traySteam: entry.tray_steam_supply_bar,
    boosterPress: entry.booster_press_bar,
    ejectorPress: entry.ejector_press_bar,
    feedRate: entry.oil_feed_rate_litre,
  }));

  // Filter reports that qualify for Pareto defect analysis based on disposition scope
  const paretoReports = useMemo(() => {
    return scopedReports.filter(r => {
      const dec = r.decision?.decision;
      if (dispositionScope === 'rejects_only') {
        return dec === 'reject';
      }
      return dec === 'reject' || dec === 'accept_concession';
    });
  }, [scopedReports, dispositionScope]);

  // Sorted list of non-conforming reports (most recent first)
  const sortedParetoReports = useMemo(() => {
    return [...paretoReports].sort((a, b) => {
      const dateA = a.decision?.decided_at || a.created_at || a.sample_date || '';
      const dateB = b.decision?.decided_at || b.created_at || b.sample_date || '';
      return dateB.localeCompare(dateA);
    });
  }, [paretoReports]);

  // Filtered reports for traceability registry table
  const filteredParetoReports = useMemo(() => {
    return sortedParetoReports.filter(report => {
      // 1. Pareto reason code filter
      if (selectedReasonFilter) {
        const category = getReasonCategory(report.decision?.reason_label, report.decision?.reason_id);
        if (category !== selectedReasonFilter) return false;
      }

      // 2. Search query across lot_no, report_no, product_name, decided_by_name, reason, etc.
      if (lotSearchQuery.trim()) {
        const q = lotSearchQuery.toLowerCase().trim();
        const lot = (report.lot_no || '').toLowerCase();
        const rep = (report.report_no || '').toLowerCase();
        const prod = (report.product_name || '').toLowerCase();
        const decBy = (report.decision?.decided_by_name || '').toLowerCase();
        const reason = (report.decision?.reason_label || '').toLowerCase();
        const detail = (report.decision?.reason_detail || '').toLowerCase();
        const disposition = (report.decision?.disposition || '').toLowerCase();
        const feedTank = (report.feed_tank_code || '').toLowerCase();
        const disTank = (report.discharge_tank_code || '').toLowerCase();
        const failedParams = (report.decision?.failed_parameters || []).join(' ').toLowerCase();

        if (
          !lot.includes(q) &&
          !rep.includes(q) &&
          !prod.includes(q) &&
          !decBy.includes(q) &&
          !reason.includes(q) &&
          !detail.includes(q) &&
          !disposition.includes(q) &&
          !feedTank.includes(q) &&
          !disTank.includes(q) &&
          !failedParams.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sortedParetoReports, selectedReasonFilter, lotSearchQuery]);

  // Build Pareto defect reasons data dynamically synced with RF-FR-001 QC Lab reports
  const paretoData = useMemo(() => {
    const reasonsMap: Record<string, number> = {};

    paretoReports.forEach(report => {
      const category = getReasonCategory(report.decision?.reason_label, report.decision?.reason_id);
      reasonsMap[category] = (reasonsMap[category] || 0) + 1;
    });

    // Convert to sorted array
    const sorted = Object.entries(reasonsMap)
      .filter(([_, count]) => count > 0)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const total = sorted.reduce((sum, item) => sum + item.count, 0);
    let running = 0;

    return sorted.map(item => {
      running += item.count;
      return {
        reason: item.reason,
        count: item.count,
        cumulative: total > 0 ? Math.round((running / total) * 100) : 0,
      };
    });
  }, [paretoReports]);

  // Build Lot Rejection Frequency by Product dynamically synced with RF-FR-001 QC Lab reports
  const productRejections = useMemo(() => {
    const prodMap: Record<string, { lots: number; rejects: number; concessions: number }> = {};

    scopedReports.forEach(report => {
      let rawName = report.product_name;
      if (!rawName && report.product_id) {
        const found = getProducts().find(p => p.id === report.product_id);
        if (found) rawName = found.name;
      }
      const prod = getProductCategory(rawName);
      if (!prodMap[prod]) {
        prodMap[prod] = { lots: 0, rejects: 0, concessions: 0 };
      }
      prodMap[prod].lots += 1;
      if (report.decision?.decision === 'reject') {
        prodMap[prod].rejects += 1;
      } else if (report.decision?.decision === 'accept_concession') {
        prodMap[prod].concessions += 1;
      }
    });

    return Object.entries(prodMap)
      .map(([product, data]) => ({
        product,
        lots: data.lots,
        rejects: data.rejects,
        concessions: data.concessions,
        effectiveRejects: dispositionScope === 'rejects_only' ? data.rejects : (data.rejects + data.concessions),
      }))
      .sort((a, b) => b.effectiveRejects - a.effectiveRejects || b.lots - a.lots);
  }, [scopedReports, dispositionScope]);

  // Statistical summaries for key insight callouts
  const totalParetoRejections = useMemo(
    () => paretoData.reduce((sum, p) => sum + p.count, 0),
    [paretoData]
  );
  const topReasons = useMemo(() => paretoData.slice(0, 2), [paretoData]);
  const highestRejectProduct = useMemo(
    () => (productRejections.length > 0 ? productRejections[0] : null),
    [productRejections]
  );

  return (
    <div className="space-y-4">
      {/* 1. Header with Metric Segments */}
      <section className="panel head">
        <div>
          <h2>Process trends and quality Pareto analytics</h2>
          <p className="meta">
            Banded tolerance shading, multi-tray temperature overlays, statistical rejection Pareto
          </p>
        </div>
        <GliderTabs
          items={[
            { id: 'trays', label: 'Tray temps (1-7)' },
            { id: 'bc101', label: 'BC 101 (°C)' },
            { id: 'chilling', label: 'Chilling (°C)' },
            { id: 'steam', label: 'Steam Press (Bar)' },
            { id: 'vacuum', label: 'Deodorizer vacuum' },
          ]}
          activeId={activeMetric}
          onChange={(id) => setActiveMetric(id as any)}
        />
      </section>

      {/* 2. Banded Time-Series Chart */}
      <section className="panel">
        <div className="ph">
          <span>
            {activeMetric === 'trays' && 'Deodorizer tray temperatures (°C) for Trays 1 to 7 with configured operating bands'}
            {activeMetric === 'bc101' && 'BC 101 Condenser Water Temperatures (°C) - Water In vs Water Out'}
            {activeMetric === 'chilling' && 'Chilling Water Temperatures (°C) - Water In vs Water Out'}
            {activeMetric === 'steam' && 'Steam Supply Pressures (Bar) - Tray Steam, Booster & Ejector'}
            {activeMetric === 'vacuum' && 'Deodorizer vacuum (Torr) with operating band'}
          </span>
          <span className="hint" style={{ fontWeight: 400 }}>
            Shift <span style={{ color: 'var(--text)' }}>{sheet.shift_date}</span>, live process data
          </span>
        </div>

        <div style={{ padding: '16px 20px', height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {activeMetric === 'trays' ? (
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <YAxis domain={[180, 280]} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <ReferenceLine y={250} stroke="var(--green)" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Band Min 250°C', fill: 'var(--green)', fontSize: 10 }} />
                <ReferenceLine y={268} stroke="var(--green)" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Band Max 268°C', fill: 'var(--green)', fontSize: 10 }} />
                <Line type="monotone" dataKey="tray1" name="Tray 1 (°C)" stroke="#38bdf8" strokeWidth={1.8} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray2" name="Tray 2 (°C)" stroke="#0284c7" strokeWidth={1.8} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray3" name="Tray 3 (°C)" stroke="#818cf8" strokeWidth={1.8} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray4" name="Tray 4 Peak (°C)" stroke="#d81f2c" strokeWidth={2.8} dot={{ r: 4.5 }} />
                <Line type="monotone" dataKey="tray5" name="Tray 5 (°C)" stroke="#f59e0b" strokeWidth={1.8} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray6" name="Tray 6 (°C)" stroke="#10b981" strokeWidth={1.8} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray7" name="Tray 7 Final (°C)" stroke="#f8fafc" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : activeMetric === 'bc101' ? (
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <YAxis domain={['auto', 'auto']} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <ReferenceLine y={45} stroke="var(--amber)" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Warn Max 45°C', fill: 'var(--amber)', fontSize: 10 }} />
                <Line type="monotone" dataKey="bc101In" name="BC 101 Water In (°C)" stroke="#00d2ff" strokeWidth={2.2} dot={{ r: 3.5 }} />
                <Line type="monotone" dataKey="bc101Out" name="BC 101 Water Out (°C)" stroke="#f43f5e" strokeWidth={2.2} dot={{ r: 3.5 }} />
              </LineChart>
            ) : activeMetric === 'chilling' ? (
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <YAxis domain={['auto', 'auto']} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <ReferenceLine y={16} stroke="var(--green)" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Target Max 16°C', fill: 'var(--green)', fontSize: 10 }} />
                <Line type="monotone" dataKey="chillIn" name="Chilling Water In (°C)" stroke="#38bdf8" strokeWidth={2.2} dot={{ r: 3.5 }} />
                <Line type="monotone" dataKey="chillOut" name="Chilling Water Out (°C)" stroke="#009fe3" strokeWidth={2.2} dot={{ r: 3.5 }} />
              </LineChart>
            ) : activeMetric === 'steam' ? (
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <YAxis domain={['auto', 'auto']} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} unit=" bar" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <ReferenceLine y={3.0} stroke="var(--green)" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Tray Set 3.00 Bar', fill: 'var(--green)', fontSize: 10 }} />
                <Line type="monotone" dataKey="traySteam" name="Tray Steam Supply (Bar)" stroke="#eab308" strokeWidth={2.2} dot={{ r: 3.5 }} />
                <Line type="monotone" dataKey="boosterPress" name="Booster Pressure (Bar)" stroke="#d81f2c" strokeWidth={2.2} dot={{ r: 3.5 }} />
                <Line type="monotone" dataKey="ejectorPress" name="Ejector Pressure (Bar)" stroke="#94a3b8" strokeWidth={1.8} dot={{ r: 3.5 }} />
              </LineChart>
            ) : (
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <YAxis domain={[0, 8]} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} unit=" Torr" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <ReferenceLine y={4.5} label={{ value: 'Soft Max: 4.5 Torr', fill: 'var(--amber)', fontSize: 10 }} stroke="var(--amber)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="vacuum" name="Vacuum (Torr)" stroke="#d81f2c" fill="#d81f2c" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. QC Pareto Analysis Grid */}
      <div className="two" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Pareto Defect Reasons */}
        <section className="panel">
          <div className="ph" style={{ flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600 }}>
                {selectedMonth === 'all'
                  ? 'QC Rejection Pareto by Reason Code'
                  : `Monthly QC Rejection Pareto (${formatMonthLabel(selectedMonth)})`}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                Live QC Lab Synced: {totalRejectsCount} {totalRejectsCount === 1 ? 'rejection' : 'rejections'}
                {totalConcessionsCount > 0 ? ` (${totalConcessionsCount} concessions)` : ''} across {totalLotsCount} lots
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              {/* Month Selector */}
              <div style={{ minWidth: '190px' }}>
                <SearchableSelect
                  value={selectedMonth}
                  onChange={(val) => {
                    setSelectedMonth(val);
                    setSelectedReasonFilter(null);
                  }}
                  placeholder="Filter by shift month"
                  searchPlaceholder="Search month..."
                  options={[
                    { value: 'all', label: 'All Shifts (All-Time MTD)' },
                    ...availableMonths.map((m) => ({
                      value: m,
                      label: formatMonthLabel(m)
                    }))
                  ]}
                />
              </div>

              {/* Disposition Scope Toggle */}
              <div className="segs" style={{ '--c': 2, margin: 0, height: '28px' } as React.CSSProperties}>
                <button
                  type="button"
                  className="seg"
                  aria-pressed={dispositionScope === 'rejects_only'}
                  onClick={() => setDispositionScope('rejects_only')}
                  style={{ padding: '0 8px', fontSize: '11px', height: '28px', lineHeight: '26px' }}
                  title="Show only lot rejections"
                >
                  Rejects ({totalRejectsCount})
                </button>
                <button
                  type="button"
                  className="seg"
                  aria-pressed={dispositionScope === 'all_non_conformances'}
                  onClick={() => setDispositionScope('all_non_conformances')}
                  style={{ padding: '0 8px', fontSize: '11px', height: '28px', lineHeight: '26px' }}
                  title="Show rejections and concessions"
                >
                  + Concessions ({totalRejectsCount + totalConcessionsCount})
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: '8px 20px 16px' }}>
            {paretoData.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--text)' }}>
                  No QC {dispositionScope === 'rejects_only' ? 'rejections' : 'non-conformances'} logged
                  {selectedMonth !== 'all' ? ` for ${formatMonthLabel(selectedMonth)}` : ''}.
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                  100% of tested lots meet analytical quality specifications.
                </p>
              </div>
            ) : (
              paretoData.map((p) => {
                const maxCount = Math.max(1, ...paretoData.map((d) => d.count));
                const pct = Math.round((p.count / maxCount) * 100);
                const isSelected = selectedReasonFilter === p.reason;
                return (
                  <div 
                    key={p.reason} 
                    className="pr" 
                    onClick={() => {
                      setSelectedReasonFilter(prev => prev === p.reason ? null : p.reason);
                      const el = document.getElementById('rejected-lots-registry');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    style={{ 
                      gridTemplateColumns: '150px 1fr 70px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      margin: '2px -8px',
                      transition: 'all 0.15s ease',
                      background: isSelected ? 'rgba(216, 31, 44, 0.14)' : undefined,
                      border: isSelected ? '1px solid rgba(216, 31, 44, 0.45)' : '1px solid transparent'
                    }}
                    title={`Click to filter rejected lots by: ${p.reason}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span 
                        title={p.reason} 
                        style={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'var(--redt)' : 'inherit'
                        }}
                      >
                        {p.reason}
                      </span>
                      {isSelected && (
                        <span style={{ fontSize: '9px', background: 'var(--red)', color: '#fff', padding: '0 4px', borderRadius: '3px', fontWeight: 600 }}>
                          FILTERED
                        </span>
                      )}
                    </div>
                    <div className="bar">
                      <i style={{ width: `${pct}%`, background: 'var(--red)' }} />
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <b style={{ fontVariantNumeric: 'tabular-nums', color: isSelected ? 'var(--redt)' : 'inherit' }}>{p.count}</b>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', width: '34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {p.cumulative}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className="foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <span>
              {totalParetoRejections === 0 ? (
                '0 rejections tracked. All inspected lots passed quality release specifications.'
              ) : totalParetoRejections === 1 ? (
                <span>
                  <b>{topReasons[0]?.reason}</b> accounts for 100% of the 1 tracked rejection in this period.
                </span>
              ) : (
                <span>
                  <b>{topReasons[0]?.reason}</b> and <b>{topReasons[1]?.reason}</b> account for{' '}
                  {Math.round((((topReasons[0]?.count || 0) + (topReasons[1]?.count || 0)) / totalParetoRejections) * 100)}% of the {totalParetoRejections} rejections tracked.
                </span>
              )}
            </span>
            {selectedReasonFilter && (
              <button
                type="button"
                onClick={() => setSelectedReasonFilter(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--redt)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                Clear reason filter ✕
              </button>
            )}
          </p>
        </section>

        {/* Lot Rejection Frequency by Product */}
        <section className="panel">
          <div className="ph" style={{ flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: 600 }}>Lot rejection frequency by product</span>
              <span style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                Synchronized with QC Management (RF-FR-001) · {scopedReports.length} Lots ({totalRejectsCount} {totalRejectsCount === 1 ? 'Rejection' : 'Rejections'}{totalConcessionsCount > 0 ? `, ${totalConcessionsCount} Concessions` : ''})
              </span>
            </div>
            <span className="hint" style={{ fontWeight: 400, marginLeft: 'auto' }}>
              {productRejections.length} {productRejections.length === 1 ? 'Product Grade' : 'Product Grades'}
            </span>
          </div>

          <div style={{ padding: '8px 20px 16px' }}>
            {productRejections.length === 0 ? (
              <p className="empty">No product lots recorded in QC Management.</p>
            ) : (
              productRejections.map((prod) => {
                const maxLots = Math.max(1, ...productRejections.map((p) => p.lots));
                const pct = Math.round((prod.lots / maxLots) * 100);
                const rejPct = prod.lots > 0 ? Math.round((prod.effectiveRejects / prod.lots) * 100) : 0;
                return (
                  <div key={prod.product} className="pr" style={{ gridTemplateColumns: '130px 1fr 130px' }}>
                    <span title={prod.product} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.product}
                    </span>
                    <div className="bar" style={{ position: 'relative', overflow: 'hidden' }}>
                      <i style={{ width: `${pct}%`, background: prod.effectiveRejects > 0 ? 'rgba(239, 68, 68, 0.35)' : 'var(--muted)' }} />
                      {prod.effectiveRejects > 0 && (
                        <i 
                          style={{ 
                            position: 'absolute', 
                            left: 0, 
                            top: 0, 
                            bottom: 0, 
                            width: `${(pct * prod.effectiveRejects) / prod.lots}%`, 
                            background: 'var(--red)',
                            borderRadius: 'inherit'
                          }} 
                        />
                      )}
                    </div>
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>
                      {prod.lots} lots, <b style={{ color: prod.effectiveRejects > 0 ? 'var(--redt)' : 'inherit' }}>{prod.effectiveRejects}</b> rej
                      {prod.concessions > 0 && dispositionScope === 'all_non_conformances' && (
                        <span style={{ fontSize: '10px', marginLeft: '3px', color: 'var(--amber)' }}>({prod.concessions}c)</span>
                      )}
                      {prod.effectiveRejects > 0 && <span style={{ fontSize: '10px', marginLeft: '4px', color: 'var(--redt)' }}>({rejPct}%)</span>}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <p className="foot">
            {highestRejectProduct && highestRejectProduct.effectiveRejects > 0 ? (
              <span>
                Highest non-conformance: <b>{highestRejectProduct.product}</b> with {highestRejectProduct.effectiveRejects} of {highestRejectProduct.lots} lots (
                {((highestRejectProduct.effectiveRejects / highestRejectProduct.lots) * 100).toFixed(1)}% fail rate). Synchronized live with RF-FR-001 QC Lab decisions.
              </span>
            ) : (
              <span>All {scopedReports.length} tested lots passed with 0 rejections across all product grades.</span>
            )}
          </p>
        </section>
      </div>

      {/* 4. Rejected Lots & Non-Conformance Traceability Log */}
      <section className="panel" id="rejected-lots-registry">
        <div className="ph" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} style={{ color: 'var(--redt)' }} />
                Rejected Lots &amp; Non-Conformance Traceability Log
              </span>
              <span className="bd" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text)' }}>
                {formatMonthLabel(selectedMonth)}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
              Full trace of rejected product lots, QA decision authorities, timestamps, failed analytical parameters, and dispositions.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Synchronized Month Selector directly in table header */}
            <div style={{ minWidth: '190px' }}>
              <SearchableSelect
                value={selectedMonth}
                onChange={(val) => {
                  setSelectedMonth(val);
                  setSelectedReasonFilter(null);
                }}
                placeholder="Filter by shift month"
                searchPlaceholder="Search month..."
                options={[
                  { value: 'all', label: 'All Shifts (All-Time)' },
                  ...availableMonths.map((m) => ({
                    value: m,
                    label: formatMonthLabel(m)
                  }))
                ]}
              />
            </div>

            {/* Synchronized Scope Toggle */}
            <div className="segs" style={{ '--c': 2, margin: 0, height: '28px' } as React.CSSProperties}>
              <button
                type="button"
                className="seg"
                aria-pressed={dispositionScope === 'rejects_only'}
                onClick={() => setDispositionScope('rejects_only')}
                style={{ padding: '0 8px', fontSize: '11px', height: '28px', lineHeight: '26px' }}
                title="Show only lot rejections"
              >
                Rejects ({totalRejectsCount})
              </button>
              <button
                type="button"
                className="seg"
                aria-pressed={dispositionScope === 'all_non_conformances'}
                onClick={() => setDispositionScope('all_non_conformances')}
                style={{ padding: '0 8px', fontSize: '11px', height: '28px', lineHeight: '26px' }}
                title="Show rejections and concessions"
              >
                + Concessions ({totalRejectsCount + totalConcessionsCount})
              </button>
            </div>

            {/* Active reason filter indicator */}
            {selectedReasonFilter && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(216, 31, 44, 0.12)', 
                  border: '1px solid rgba(216, 31, 44, 0.3)', 
                  padding: '3px 8px', 
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: 'var(--redt)'
                }}
              >
                <Filter size={11} />
                <span>Reason: <b>{selectedReasonFilter}</b></span>
                <button
                  type="button"
                  onClick={() => setSelectedReasonFilter(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
                  title="Clear filter"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Quick Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={lotSearchQuery}
                onChange={(e) => setLotSearchQuery(e.target.value)}
                placeholder="Search Lot / Product / Officer..."
                className="inp"
                style={{ height: '28px', paddingLeft: '26px', paddingRight: lotSearchQuery ? '24px' : '8px', fontSize: '12px', width: '200px' }}
              />
              {lotSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLotSearchQuery('')}
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Total Badge */}
            <span className="bd r">
              {filteredParetoReports.length} {filteredParetoReports.length === 1 ? 'Lot' : 'Lots'}
            </span>
          </div>
        </div>

        {/* Traceability Table */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '920px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', color: 'var(--muted)', fontSize: '11px' }}>
                <th style={{ padding: '10px 14px' }}>Lot &amp; Report No</th>
                <th style={{ padding: '10px 12px' }}>Product &amp; Sampling Point</th>
                <th style={{ padding: '10px 12px' }}>Sample Check Time</th>
                <th style={{ padding: '10px 12px' }}>Status &amp; Disposition</th>
                <th style={{ padding: '10px 12px' }}>Defect Reason &amp; Failed Parameters</th>
                <th style={{ padding: '10px 12px' }}>QA Decision Authority</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Analysis</th>
              </tr>
            </thead>
            <tbody>
              {filteredParetoReports.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertOctagon size={28} style={{ opacity: 0.5, color: 'var(--amber)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>
                        {selectedReasonFilter 
                          ? `No lots found for reason "${selectedReasonFilter}" in ${formatMonthLabel(selectedMonth)}.`
                          : lotSearchQuery 
                            ? `No lots match query "${lotSearchQuery}".`
                            : `No QC ${dispositionScope === 'rejects_only' ? 'rejections' : 'non-conformances'} recorded for ${formatMonthLabel(selectedMonth)}.`}
                      </span>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                        {selectedReasonFilter
                          ? 'Try clearing the Pareto reason filter to view all lots in this month.'
                          : totalConcessionsCount > 0 && dispositionScope === 'rejects_only'
                            ? `There are ${totalConcessionsCount} concession lots in this month. Switch to "+ Concessions" to view them.`
                            : 'All inspected lots passed quality specification without any rejection logged.'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {selectedReasonFilter && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setSelectedReasonFilter(null)}
                            style={{ fontSize: '11px', height: '28px', padding: '0 10px' }}
                          >
                            Clear Reason Filter
                          </button>
                        )}
                        {lotSearchQuery && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setLotSearchQuery('')}
                            style={{ fontSize: '11px', height: '28px', padding: '0 10px' }}
                          >
                            Clear Search
                          </button>
                        )}
                        {dispositionScope === 'rejects_only' && totalConcessionsCount > 0 && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setDispositionScope('all_non_conformances')}
                            style={{ fontSize: '11px', height: '28px', padding: '0 10px', color: 'var(--amber)', borderColor: 'rgba(224, 160, 48, 0.4)' }}
                          >
                            Show Concessions ({totalConcessionsCount})
                          </button>
                        )}
                        {selectedMonth !== 'all' && (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => { setSelectedMonth('all'); setSelectedReasonFilter(null); }}
                            style={{ fontSize: '11px', height: '28px', padding: '0 10px' }}
                          >
                            View All Months
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParetoReports.map((r) => {
                  const isReject = r.decision?.decision === 'reject';
                  const failedParams = r.decision?.failed_parameters || [];
                  const reasonCategory = getReasonCategory(r.decision?.reason_label, r.decision?.reason_id);

                  return (
                    <tr 
                      key={r.id} 
                      style={{ 
                        borderBottom: '1px solid var(--line)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* 1. Lot & Report No */}
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)', fontSize: '13px' }}>
                          {r.lot_no}
                        </div>
                        <div style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: '11px', marginTop: '1px' }}>
                          {r.report_no}
                        </div>
                        {(r.feed_tank_code || r.discharge_tank_code) && (
                          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Tag size={9} />
                            <span>Tank: {r.feed_tank_code || '–'} → {r.discharge_tank_code || '–'}</span>
                          </div>
                        )}
                        {r.crystallizer_no && (
                          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                            Cry: {r.crystallizer_no} {r.batch_no ? `(${r.batch_no})` : ''}
                          </div>
                        )}
                      </td>

                      {/* 2. Product & Sampling Point */}
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {r.product_name || 'Standard Product'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          {r.sampling_point_name || 'Deodorizer Discharge'}
                        </div>
                      </td>

                      {/* 3. Sample Check Time */}
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {formatDate(r.sample_date)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <Clock size={10} />
                          <span>Check: {r.time_check || '–'}</span>
                        </div>
                        {r.submitted_by_name && (
                          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>
                            Sampler: {r.submitted_by_name}
                          </div>
                        )}
                      </td>

                      {/* 4. Status & Disposition */}
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div>
                          {isReject ? (
                            <span className="bd r">REJECTED</span>
                          ) : (
                            <span className="bd a">CONCESSION</span>
                          )}
                        </div>
                        {r.decision?.disposition && (
                          <div style={{ marginTop: '4px' }}>
                            <span 
                              style={{ 
                                fontSize: '10px', 
                                padding: '1px 6px', 
                                borderRadius: '4px', 
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--line)',
                                color: 'var(--text)',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                letterSpacing: '0.04em'
                              }}
                            >
                              Action: {r.decision.disposition}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 5. Defect Reason & Failed Parameters */}
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: '340px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--redt)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} />
                          <span>{reasonCategory}</span>
                        </div>

                        {r.decision?.reason_detail && (
                          <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '3px', lineHeight: '1.35' }}>
                            {r.decision.reason_detail}
                          </div>
                        )}

                        {failedParams.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                            {failedParams.map((param, idx) => (
                              <span 
                                key={idx}
                                style={{ 
                                  fontSize: '10px', 
                                  fontFamily: 'monospace',
                                  background: 'rgba(216, 31, 44, 0.12)', 
                                  border: '1px solid rgba(216, 31, 44, 0.28)', 
                                  color: 'var(--redt)', 
                                  padding: '1px 5px', 
                                  borderRadius: '3px',
                                  fontWeight: 500
                                }}
                              >
                                {param}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 6. QA Decision Authority & Timestamp */}
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--text)' }}>
                          <UserCheck size={13} style={{ color: 'var(--green)' }} />
                          <span>{r.decision?.decided_by_name || 'QA Authority'}</span>
                        </div>
                        {r.decision?.decided_by && r.decision.decided_by !== r.decision.decided_by_name && (
                          <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                            ID: {r.decision.decided_by}
                          </div>
                        )}
                        <div style={{ fontSize: '10px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>
                          <Clock size={10} />
                          <span>{r.decision?.decided_at ? formatDateTime(r.decision.decided_at) : 'Timestamp logged'}</span>
                        </div>
                        {r.decision?.overturn_reason && (
                          <div style={{ fontSize: '10px', color: 'var(--amber)', marginTop: '2px' }}>
                            Overturned: {r.decision.overturn_reason}
                          </div>
                        )}
                      </td>

                      {/* 7. Action: Inspect Lab Results */}
                      <td style={{ padding: '10px 14px', verticalAlign: 'top', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setInspectReport(r)}
                          style={{
                            height: '28px',
                            padding: '0 10px',
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            borderRadius: '6px',
                            fontWeight: 500
                          }}
                          title={`Inspect full laboratory certificate for ${r.lot_no}`}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <span>
            Displaying <b>{filteredParetoReports.length}</b> of <b>{paretoReports.length}</b> non-conforming lot records for {selectedMonth === 'all' ? 'All Shifts' : formatMonthLabel(selectedMonth)}.
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Traceability locked to ISO 9001 / HACCP standard analytical records.
          </span>
        </p>
      </section>

      {/* 5. Analytical Laboratory Inspection Modal */}
      {inspectReport && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-alert-overlay-in"
          onClick={() => setInspectReport(null)}
        >
          <div 
            className="bg-[#101927] border border-[#1F2E43] rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-alert-content-in text-slate-100"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(216, 31, 44, 0.15)', border: '1px solid rgba(216, 31, 44, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={18} style={{ color: 'var(--redt)' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                      Lot Non-Conformance Certificate · {inspectReport.lot_no}
                    </h3>
                    {inspectReport.decision?.decision === 'reject' ? (
                      <span className="bd r">REJECTED</span>
                    ) : (
                      <span className="bd a">CONCESSION</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                    Report No: {inspectReport.report_no} · Created: {formatDateTime(inspectReport.created_at)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectReport(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Product & Sampling Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 14px' }}>
                <div>
                  <small style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Name</small>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginTop: '2px' }}>{inspectReport.product_name || 'Standard Oil'}</div>
                </div>
                <div>
                  <small style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sample Date &amp; Check</small>
                  <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDate(inspectReport.sample_date)} ({inspectReport.time_check || '–'})
                  </div>
                </div>
                <div>
                  <small style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sampling Point</small>
                  <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px' }}>{inspectReport.sampling_point_name || 'Discharge Manifold'}</div>
                </div>
                <div>
                  <small style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tanks (Feed → Discharge)</small>
                  <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px', fontFamily: 'monospace' }}>
                    {inspectReport.feed_tank_code || '–'} → {inspectReport.discharge_tank_code || '–'}
                  </div>
                </div>
                {inspectReport.crystallizer_no && (
                  <div>
                    <small style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Crystallizer / Batch</small>
                    <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px' }}>
                      {inspectReport.crystallizer_no} {inspectReport.batch_no ? `· Batch ${inspectReport.batch_no}` : ''}
                    </div>
                  </div>
                )}
                <div>
                  <small style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sample Submitted By</small>
                  <div style={{ fontWeight: 500, fontSize: '13px', marginTop: '2px' }}>{inspectReport.submitted_by_name || 'Plant Operator'}</div>
                </div>
              </div>

              {/* QC Decision Statement */}
              <div style={{ background: 'rgba(216, 31, 44, 0.07)', border: '1px solid rgba(216, 31, 44, 0.25)', borderRadius: '8px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} style={{ color: 'var(--redt)' }} />
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--redt)' }}>
                      Rejection Reason: {getReasonCategory(inspectReport.decision?.reason_label, inspectReport.decision?.reason_id)}
                    </span>
                  </div>
                  {inspectReport.decision?.disposition && (
                    <span className="bd" style={{ background: 'rgba(255,255,255,0.08)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
                      Disposition: {inspectReport.decision.disposition}
                    </span>
                  )}
                </div>

                {inspectReport.decision?.reason_detail && (
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text)', lineHeight: '1.4' }}>
                    {inspectReport.decision.reason_detail}
                  </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(216, 31, 44, 0.15)', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Decided by Authority: </span>
                    <strong style={{ color: 'var(--text)' }}>{inspectReport.decision?.decided_by_name || 'QA Officer'}</strong>
                    {inspectReport.decision?.decided_by && (
                      <span style={{ color: 'var(--muted)', fontFamily: 'monospace', marginLeft: '4px' }}>
                        ({inspectReport.decision.decided_by})
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>Decision Timestamp: </span>
                    <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {inspectReport.decision?.decided_at ? formatDateTime(inspectReport.decision.decided_at) : '–'}
                    </strong>
                  </div>
                </div>

                {inspectReport.decision?.overturn_reason && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '4px', background: 'rgba(224, 160, 48, 0.12)', border: '1px solid rgba(224, 160, 48, 0.3)', fontSize: '11px', color: 'var(--amber)' }}>
                    <strong>Overturn Note:</strong> {inspectReport.decision.overturn_reason}
                  </div>
                )}
              </div>

              {/* Lab Analytical Parameters Table */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                    Laboratory Analytical Parameters (RF-FR-001)
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {inspectReport.results?.length || 0} Tested Parameters
                  </span>
                </div>

                {(!inspectReport.results || inspectReport.results.length === 0) ? (
                  <p style={{ margin: 0, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', textAlign: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                    No analytical test parameters attached to this report.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--muted)', fontSize: '11px' }}>
                          <th style={{ padding: '8px 12px' }}>Parameter Name</th>
                          <th style={{ padding: '8px 12px' }}>Code</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Result Value</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Specification Compliance</th>
                          <th style={{ padding: '8px 12px' }}>Analyst</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectReport.results.map((res) => {
                          const isFailed = res.in_spec === false;
                          return (
                            <tr 
                              key={res.id || res.parameter_code}
                              style={{ 
                                borderBottom: '1px solid var(--line)',
                                background: isFailed ? 'rgba(216, 31, 44, 0.08)' : undefined
                              }}
                            >
                              <td style={{ padding: '8px 12px', fontWeight: isFailed ? 600 : 400, color: isFailed ? 'var(--redt)' : 'inherit' }}>
                                {res.parameter_name}
                                {res.series_key && (
                                  <small style={{ color: 'var(--muted)', marginLeft: '4px' }}>
                                    ({res.series_key}°C)
                                  </small>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--muted)' }}>
                                {res.parameter_code}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: isFailed ? 'var(--redt)' : 'inherit' }}>
                                {res.value_numeric !== null && res.value_numeric !== undefined
                                  ? `${res.value_numeric} ${res.unit || ''}`
                                  : res.value_text || '–'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                {res.in_spec === true && (
                                  <span className="bd g">IN SPEC</span>
                                )}
                                {res.in_spec === false && (
                                  <span className="bd r">OUT OF SPEC</span>
                                )}
                                {res.in_spec === null || res.in_spec === undefined ? (
                                  <span className="bd">N/A</span>
                                ) : null}
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--muted)' }}>
                                {res.entered_by_name || 'QC Analyst'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.02)' }}>
              <button
                type="button"
                className="primary"
                onClick={() => setInspectReport(null)}
                style={{ height: '32px', padding: '0 16px', fontSize: '12px' }}
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
