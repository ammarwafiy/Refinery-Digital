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
  getRejectionReasons 
} from '@/lib/data-service';
import { SampleReport, ProcessSheet } from '@/types/refinery';
import { BarChart3, TrendingUp, AlertOctagon, Layers } from 'lucide-react';

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

  // Listen for live QC lab updates (RF-FR-001)
  useEffect(() => {
    const handleUpdate = () => {
      setReports(getSampleReports());
      setSheet(getActiveProcessSheet());
    };

    window.addEventListener('refinery_reports_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('refinery_reports_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Selected parameter view
  const [activeMetric, setActiveMetric] = useState<'trays' | 'vacuum' | 'steam'>('trays');

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
    tray4: entry.tray_4_temp_c,
    tray7: entry.tray_7_temp_c,
    feedRate: entry.oil_feed_rate_litre,
    boosterPress: entry.booster_press_bar,
    ejectorPress: entry.ejector_press_bar,
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
      const prod = getProductCategory(report.product_name);
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
        <div className="segs" style={{ '--c': 3, margin: 0 } as React.CSSProperties}>
          <button
            className="seg"
            aria-pressed={activeMetric === 'trays'}
            type="button"
            onClick={() => setActiveMetric('trays')}
          >
            Tray temps (1, 4, 7)
          </button>
          <button
            className="seg"
            aria-pressed={activeMetric === 'vacuum'}
            type="button"
            onClick={() => setActiveMetric('vacuum')}
          >
            Deodorizer vacuum
          </button>
          <button
            className="seg"
            aria-pressed={activeMetric === 'steam'}
            type="button"
            onClick={() => setActiveMetric('steam')}
          >
            Steam pressure
          </button>
        </div>
      </section>

      {/* 2. Banded Time-Series Chart */}
      <section className="panel">
        <div className="ph">
          <span>
            {activeMetric === 'trays' && 'Deodorizer tray temperatures (°C) with configured operating bands'}
            {activeMetric === 'vacuum' && 'Deodorizer vacuum (Torr) with operating band'}
            {activeMetric === 'steam' && 'Steam supply booster vs ejector pressures (bar)'}
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
                <YAxis domain={[180, 280]} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <ReferenceLine y={250} stroke="var(--green)" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Band Min 250°C', fill: 'var(--green)', fontSize: 10 }} />
                <ReferenceLine y={268} stroke="var(--green)" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'Band Max 268°C', fill: 'var(--green)', fontSize: 10 }} />
                <Line type="monotone" dataKey="tray1" name="Tray 1 (°C)" stroke="#8a92a6" strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray4" name="Tray 4 Peak (°C)" stroke="#d81f2c" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tray7" name="Tray 7 Final (°C)" stroke="#f3f5f9" strokeWidth={1.5} dot={{ r: 3 }} />
              </LineChart>
            ) : activeMetric === 'vacuum' ? (
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <YAxis domain={[0, 8]} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <ReferenceLine y={4.5} label={{ value: 'Soft Max: 4.5 Torr', fill: 'var(--amber)', fontSize: 10 }} stroke="var(--amber)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="vacuum" name="Vacuum (Torr)" stroke="#d81f2c" fill="#d81f2c" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            ) : (
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="time" stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <YAxis domain={[6, 14]} stroke="var(--muted)" tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'var(--muted)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--raised)', borderColor: 'var(--line)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="boosterPress" name="Booster Pressure (Bar)" stroke="#d81f2c" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ejectorPress" name="Ejector Pressure (Bar)" stroke="#8a92a6" strokeWidth={1.5} dot={{ r: 3 }} />
              </LineChart>
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
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="inp"
                style={{ height: '28px', padding: '0 8px', fontSize: '12px', minWidth: '130px', width: 'auto' }}
                title="Filter by shift month"
              >
                <option value="all">All Shifts (All-Time MTD)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>

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
                return (
                  <div key={p.reason} className="pr" style={{ gridTemplateColumns: '150px 1fr 70px' }}>
                    <span title={p.reason} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.reason}
                    </span>
                    <div className="bar">
                      <i style={{ width: `${pct}%`, background: 'var(--red)' }} />
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{p.count}</b>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', width: '34px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {p.cumulative}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className="foot">
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
          </p>
        </section>

        {/* Lot Rejection Frequency by Product */}
        <section className="panel">
          <div className="ph" style={{ flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600 }}>Lot rejection frequency by product</span>
              <p className="meta" style={{ margin: 0, fontSize: '11px' }}>Volume and rejection breakdown</p>
            </div>
            <span className="hint" style={{ fontWeight: 400, marginLeft: 'auto' }}>
              {productRejections.length} {productRejections.length === 1 ? 'Product Grade' : 'Product Grades'}
            </span>
          </div>

          <div style={{ padding: '8px 20px 16px' }}>
            {productRejections.length === 0 ? (
              <p className="empty">No product lots recorded.</p>
            ) : (
              productRejections.map((prod) => {
                const maxLots = Math.max(1, ...productRejections.map((p) => p.lots));
                const pct = Math.round((prod.lots / maxLots) * 100);
                return (
                  <div key={prod.product} className="pr" style={{ gridTemplateColumns: '130px 1fr 120px' }}>
                    <span title={prod.product} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.product}
                    </span>
                    <div className="bar">
                      <i style={{ width: `${pct}%`, background: 'var(--muted)' }} />
                    </div>
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>
                      {prod.lots} lots, <b style={{ color: prod.effectiveRejects > 0 ? 'var(--redt)' : 'inherit' }}>{prod.effectiveRejects}</b> rej
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <p className="foot">
            {highestRejectProduct && highestRejectProduct.effectiveRejects > 0 ? (
              <span>
                Most rejections: <b>{highestRejectProduct.product}</b>, {highestRejectProduct.effectiveRejects} of {highestRejectProduct.lots} lots (
                {((highestRejectProduct.effectiveRejects / highestRejectProduct.lots) * 100).toFixed(1)}% fail rate). Watch grade switchovers.
              </span>
            ) : (
              <span>All {scopedReports.length} tested lots passed with 0 rejections across all product grades.</span>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
