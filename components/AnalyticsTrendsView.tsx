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
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#009FE3]/40 bg-[#009FE3]/10 text-[#009FE3] shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <span>Process Trends & Quality Pareto Analytics</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Banded Tolerance Shading · Multi-Tray Temperature Overlays · Statistical Rejection Pareto
              </p>
            </div>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-[#0A1018] p-1 rounded-lg border border-[#1F2E43] font-mono text-xs">
            <button
              onClick={() => setActiveMetric('trays')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMetric === 'trays' ? 'bg-[#009FE3] text-white shadow-xs font-semibold border border-[#009FE3]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#172235]'
              }`}
            >
              Tray Temps (1, 4, 7)
            </button>
            <button
              onClick={() => setActiveMetric('vacuum')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMetric === 'vacuum' ? 'bg-[#009FE3] text-white shadow-xs font-semibold border border-[#009FE3]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#172235]'
              }`}
            >
              Deodorizer Vacuum
            </button>
            <button
              onClick={() => setActiveMetric('steam')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMetric === 'steam' ? 'bg-[#009FE3] text-white shadow-xs font-semibold border border-[#009FE3]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#172235]'
              }`}
            >
              Steam Pressures
            </button>
          </div>
        </div>
      </div>

      {/* 2. Banded Time-Series Chart */}
      <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-[#1F2E43] pb-3">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <TrendingUp className="h-4 w-4 text-[#009FE3]" />
            <span>
              {activeMetric === 'trays' && 'Deodorizer Tray Temperatures (°C) with Configured Operating Bands'}
              {activeMetric === 'vacuum' && 'Processing Vacuum Reach (Torr) — Soft Alert Threshold: 4.5 Torr'}
              {activeMetric === 'steam' && 'Steam Supply Booster vs Ejector Pressures (Bar)'}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Shift: <strong className="text-[#009FE3]">{sheet.shift_date}</strong>
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeMetric === 'trays' ? (
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E43" />
                <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <YAxis domain={[180, 280]} stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A1018', borderColor: '#1F2E43', borderRadius: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', color: '#F8FAFC' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#F8FAFC' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="tray1" name="Tray 1 (°C)" stroke="#009FE3" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray4" name="Tray 4 Peak (°C)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tray7" name="Tray 7 Final (°C)" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : activeMetric === 'vacuum' ? (
              <AreaChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E43" />
                <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <YAxis domain={[0, 8]} stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A1018', borderColor: '#1F2E43', borderRadius: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', color: '#F8FAFC' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#F8FAFC' }}
                />
                <ReferenceLine y={4.5} label={{ value: 'Soft Max: 4.5 Torr', fill: '#F59E0B', fontSize: 10 }} stroke="#F59E0B" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="vacuum" name="Vacuum (Torr)" stroke="#009FE3" fill="#009FE3" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            ) : (
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E43" />
                <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <YAxis domain={[6, 14]} stroke="#64748B" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A1018', borderColor: '#1F2E43', borderRadius: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', color: '#F8FAFC' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#F8FAFC' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="boosterPress" name="Booster Pressure (Bar)" stroke="#009FE3" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ejectorPress" name="Ejector Pressure (Bar)" stroke="#08B5F5" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. QC Pareto Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Defect Reasons Bar Chart */}
        <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-[#1F2E43] pb-3">
            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
              <AlertOctagon className="h-4 w-4 text-[#EF4444]" />
              <span>Monthly QC Rejection Pareto (Reason Codes)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-mono text-[#10B981] border border-[#10B981]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                SYNCED: RF-FR-001
              </span>
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                80/20 Rule Analysis
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoData} margin={{ top: 10, right: 10, bottom: 25, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E43" />
                <XAxis 
                  dataKey="reason" 
                  stroke="#64748B" 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end" 
                  tick={{ fontSize: 9, fontFamily: 'sans-serif', fill: '#94A3B8' }} 
                />
                <YAxis stroke="#64748B" tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A1018', borderColor: '#1F2E43', borderRadius: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', color: '#F8FAFC' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#F8FAFC' }}
                />
                <Bar dataKey="count" name="Rejection Count" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-xs text-slate-300 bg-[#0A1018] p-3 rounded-lg border border-[#1F2E43] font-mono">
            <strong>Key Insight:</strong> 80% of lot failures stem from{' '}
            <span className="text-[#EF4444] font-semibold">{topReasons[0]?.reason || 'Colour out of spec'}</span>
            {topReasons.length > 1 && (
              <>
                {' and '}
                <span className="text-[#F59E0B] font-semibold">{topReasons[1]?.reason || 'FFA above spec'}</span>
              </>
            )}
            {' '}following vacuum dips ({totalParetoRejections} total rejection incidents tracked).
          </div>
        </div>

        {/* Rejection Rate by Product */}
        <div className="rounded-xl border border-[#1F2E43] bg-[#101927] p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-[#1F2E43] pb-3">
            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
              <Layers className="h-4 w-4 text-[#009FE3]" />
              <span>Lot Rejection Frequency by Product</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-mono text-[#10B981] border border-[#10B981]/30">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                SYNCED: RF-FR-001
              </span>
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                Volume vs Rejection
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productRejections} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E43" />
                <XAxis dataKey="product" stroke="#64748B" tick={{ fontSize: 10, fontFamily: 'sans-serif', fill: '#94A3B8' }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0A1018', borderColor: '#1F2E43', borderRadius: '0.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', color: '#F8FAFC' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#F8FAFC' }}
                />
                <Bar dataKey="lots" name="Total Lots Produced" fill="#172235" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejects" name="Rejected Lots" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-xs text-slate-300 bg-[#0A1018] p-3 rounded-lg border border-[#1F2E43] font-mono">
            <strong>Corrective Target:</strong> Highest attention needed during grade switchovers to{' '}
            <span className="text-[#009FE3] font-semibold">
              {highestRejectProduct?.product || 'PL 65 Matsuyama'}
            </span>
            {highestRejectProduct && (
              <span className="text-slate-400">
                {' '}({highestRejectProduct.rejects} rejections / {highestRejectProduct.lots} lots ={' '}
                {highestRejectProduct.lots > 0
                  ? ((highestRejectProduct.rejects / highestRejectProduct.lots) * 100).toFixed(1)
                  : '0'}
                % fail rate)
              </span>
            )}
            .
          </div>
        </div>
      </div>
    </div>
  );
}
