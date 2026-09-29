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
function getReasonCategory(label?: string | null): string {
  if (!label) return 'Other Defect';
  const l = label.toLowerCase();
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
  return label;
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

// Month-to-date historical baseline prior to active shift session
const BASELINE_REASONS: Record<string, number> = {
  'Colour out of spec': 11,
  'FFA above spec': 8,
  'Off odour': 4,
  'SMP out of range': 3,
  'Moisture above limit': 2,
  'Soap content high': 1,
};

const BASELINE_PRODUCTS: Record<string, { lots: number; rejects: number }> = {
  'PL 65 Matsuyama': { lots: 45, rejects: 5 },
  'Chocohi 357A': { lots: 21, rejects: 4 },
  'Naturel WOS': { lots: 35, rejects: 3 },
  'Daisy Soft PM18': { lots: 18, rejects: 2 },
  'RPMO': { lots: 30, rejects: 1 },
};

export default function AnalyticsTrendsView() {
  const [sheet, setSheet] = useState<ProcessSheet>(() => getActiveProcessSheet());
  const [reports, setReports] = useState<SampleReport[]>(() => getSampleReports());

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

  // Build Pareto defect reasons data dynamically synced with RF-FR-001 QC Lab reports
  const paretoData = useMemo(() => {
    const reasonsMap: Record<string, number> = { ...BASELINE_REASONS };
    const allReasons = getRejectionReasons();

    // Iterate through all live reports from RF-FR-001 QC Lab
    reports.forEach(report => {
      if (report.decision?.decision === 'reject') {
        const reasonObj = allReasons.find(r => r.id === report.decision?.reason_id);
        const rawLabel = report.decision.reason_label || reasonObj?.label || 'Other Defect';
        const category = getReasonCategory(rawLabel);
        reasonsMap[category] = (reasonsMap[category] || 0) + 1;
      }
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
  }, [reports]);

  // Build Lot Rejection Frequency by Product dynamically synced with RF-FR-001 QC Lab reports
  const productRejections = useMemo(() => {
    const prodMap: Record<string, { lots: number; rejects: number }> = {};
    Object.entries(BASELINE_PRODUCTS).forEach(([prod, data]) => {
      prodMap[prod] = { ...data };
    });

    reports.forEach(report => {
      const prod = getProductCategory(report.product_name);
      if (!prodMap[prod]) {
        prodMap[prod] = { lots: 0, rejects: 0 };
      }
      prodMap[prod].lots += 1;
      if (report.decision?.decision === 'reject') {
        prodMap[prod].rejects += 1;
      }
    });

    return Object.entries(prodMap)
      .map(([product, data]) => ({
        product,
        lots: data.lots,
        rejects: data.rejects,
      }))
      .sort((a, b) => b.rejects - a.rejects);
  }, [reports]);

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
          <div className="ph">
            <span>Monthly QC rejection Pareto by reason code</span>
            <span className="hint" style={{ fontWeight: 400 }}>80/20 analysis</span>
          </div>

          <div style={{ padding: '8px 20px 16px' }}>
            {paretoData.length === 0 ? (
              <p className="empty">No QC rejections logged this month.</p>
            ) : (
              paretoData.map((p) => {
                const maxCount = Math.max(1, ...paretoData.map((d) => d.count));
                const pct = Math.round((p.count / maxCount) * 100);
                return (
                  <div key={p.reason} className="pr">
                    <span title={p.reason} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.reason}
                    </span>
                    <div className="bar">
                      <i style={{ width: `${pct}%`, background: 'var(--red)' }} />
                    </div>
                    <b style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.count}</b>
                  </div>
                );
              })
            )}
          </div>

          <p className="foot">
            {topReasons[0]?.reason || 'Colour out of spec'} and {topReasons[1]?.reason || 'FFA above spec'} account for{' '}
            {totalParetoRejections > 0
              ? Math.round((((topReasons[0]?.count || 0) + (topReasons[1]?.count || 0)) / totalParetoRejections) * 100)
              : 0}
            % of the {totalParetoRejections} rejections tracked this month.
          </p>
        </section>

        {/* Lot Rejection Frequency by Product */}
        <section className="panel">
          <div className="ph">
            <span>Lot rejection frequency by product</span>
            <span className="hint" style={{ fontWeight: 400 }}>Volume and rejections</span>
          </div>

          <div style={{ padding: '8px 20px 16px' }}>
            {productRejections.length === 0 ? (
              <p className="empty">No product lots recorded.</p>
            ) : (
              productRejections.map((prod) => {
                const maxLots = Math.max(1, ...productRejections.map((p) => p.lots));
                const pct = Math.round((prod.lots / maxLots) * 100);
                return (
                  <div key={prod.product} className="pr" style={{ gridTemplateColumns: '130px 1fr 110px' }}>
                    <span title={prod.product} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.product}
                    </span>
                    <div className="bar">
                      <i style={{ width: `${pct}%`, background: 'var(--muted)' }} />
                    </div>
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>
                      {prod.lots} lots, <b style={{ color: prod.rejects > 0 ? 'var(--redt)' : 'inherit' }}>{prod.rejects}</b> rej
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <p className="foot">
            Most rejections: {highestRejectProduct?.product || 'PL 65 Matsuyama'},{' '}
            {highestRejectProduct?.rejects || 0} of {highestRejectProduct?.lots || 0} lots (
            {highestRejectProduct && highestRejectProduct.lots > 0
              ? ((highestRejectProduct.rejects / highestRejectProduct.lots) * 100).toFixed(1)
              : '0'}
            % fail rate). Watch grade switchovers.
          </p>
        </section>
      </div>
    </div>
  );
}
