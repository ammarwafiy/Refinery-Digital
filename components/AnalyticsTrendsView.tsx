'use client';

import React, { useState } from 'react';
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
import { getActiveProcessSheet, getSampleReports } from '@/lib/data-service';
import { BarChart3, TrendingUp, AlertOctagon, Activity, Layers } from 'lucide-react';

export default function AnalyticsTrendsView() {
  const sheet = getActiveProcessSheet();
  const reports = getSampleReports();

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

  // Build Pareto defect reasons data
  const paretoData = [
    { reason: 'Colour out of spec', count: 12, cumulative: 40 },
    { reason: 'FFA above spec', count: 8, cumulative: 67 },
    { reason: 'Off odour', count: 4, cumulative: 80 },
    { reason: 'SMP out of range', count: 3, cumulative: 90 },
    { reason: 'Moisture above limit', count: 2, cumulative: 97 },
    { reason: 'Soap content high', count: 1, cumulative: 100 },
  ];

  // Rejection by product
  const productRejections = [
    { product: 'PL 65 Matsuyama', rejects: 6, lots: 48 },
    { product: 'Chocohi 357A', rejects: 4, lots: 22 },
    { product: 'Naturel WOS', rejects: 3, lots: 35 },
    { product: 'Daisy Soft PM18', rejects: 2, lots: 18 },
    { product: 'RPMO', rejects: 1, lots: 30 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="rounded-xl border border-[#1e2d42] bg-[#0f1724] p-4 sm:p-5 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#009fe3]/40 bg-[#009fe3]/10 text-[#08b5f5] shadow-inner shadow-[#009fe3]/20">
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
          <div className="flex items-center gap-1.5 bg-[#0b111b] p-1 rounded-lg border border-[#1e2d42] font-mono text-xs">
            <button
              onClick={() => setActiveMetric('trays')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMetric === 'trays' ? 'bg-[#009fe3] text-white shadow-xs font-semibold border border-[#22c3ff]/40' : 'text-slate-400 hover:text-slate-200 hover:bg-[#162235]/60'
              }`}
            >
              Tray Temps (1, 4, 7)
            </button>
            <button
              onClick={() => setActiveMetric('vacuum')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMetric === 'vacuum' ? 'bg-[#009fe3] text-white shadow-xs font-semibold border border-[#22c3ff]/40' : 'text-slate-400 hover:text-slate-200 hover:bg-[#162235]/60'
              }`}
            >
              Deodorizer Vacuum
            </button>
            <button
              onClick={() => setActiveMetric('steam')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                activeMetric === 'steam' ? 'bg-[#009fe3] text-white shadow-xs font-semibold border border-[#22c3ff]/40' : 'text-slate-400 hover:text-slate-200 hover:bg-[#162235]/60'
              }`}
            >
              Steam Pressures
            </button>
          </div>
        </div>
      </div>

      {/* 2. Banded Time-Series Chart */}
      <div className="rounded-xl border border-[#1e2d42] bg-[#0f1724] p-5 sm:p-6 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between mb-4 border-b border-[#1e2d42] pb-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <TrendingUp className="h-4 w-4 text-[#08b5f5]" />
            <span>
              {activeMetric === 'trays' && 'Deodorizer Tray Temperatures (°C) with Configured Operating Bands'}
              {activeMetric === 'vacuum' && 'Processing Vacuum Reach (Torr) — Soft Alert Threshold: 4.5 Torr'}
              {activeMetric === 'steam' && 'Steam Supply Booster vs Ejector Pressures (Bar)'}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Shift: <strong className="text-[#08b5f5]">{sheet.shift_date}</strong>
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeMetric === 'trays' ? (
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[180, 280]} stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1724', borderColor: '#1e2d42', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="tray1" name="Tray 1 (°C)" stroke="#08b5f5" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray4" name="Tray 4 Peak (°C)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tray7" name="Tray 7 Final (°C)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : activeMetric === 'vacuum' ? (
              <AreaChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[0, 8]} stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1724', borderColor: '#1e2d42', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#f1f5f9' }}
                />
                <ReferenceLine y={4.5} label={{ value: 'Soft Max: 4.5 Torr', fill: '#f59e0b', fontSize: 10 }} stroke="#f59e0b" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="vacuum" name="Vacuum (Torr)" stroke="#08b5f5" fill="#009fe3" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            ) : (
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[6, 14]} stroke="#64748b" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1724', borderColor: '#1e2d42', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="boosterPress" name="Booster Pressure (Bar)" stroke="#08b5f5" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ejectorPress" name="Ejector Pressure (Bar)" stroke="#22c3ff" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. QC Pareto Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Defect Reasons Bar Chart */}
        <div className="rounded-xl border border-[#1e2d42] bg-[#0f1724] p-5 sm:p-6 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-4 border-b border-[#1e2d42] pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <AlertOctagon className="h-4 w-4 text-rose-400" />
              <span>Monthly QC Rejection Pareto (Reason Codes)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              80/20 Rule Analysis
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoData} margin={{ top: 10, right: 10, bottom: 25, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
                <XAxis 
                  dataKey="reason" 
                  stroke="#64748b" 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end" 
                  tick={{ fontSize: 9, fontFamily: 'sans-serif', fill: '#94a3b8' }} 
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1724', borderColor: '#1e2d42', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#f1f5f9' }}
                />
                <Bar dataKey="count" name="Rejection Count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-xs text-slate-300 bg-[#0b111b] p-3 rounded-lg border border-[#1e2d42] font-mono">
            <strong>Key Insight:</strong> 80% of lot failures stem from <span className="text-rose-400 font-semibold">Colour Lovibond drift</span> and <span className="text-amber-400 font-semibold">FFA excursions</span> following vacuum dips.
          </div>
        </div>

        {/* Rejection Rate by Product */}
        <div className="rounded-xl border border-[#1e2d42] bg-[#0f1724] p-5 sm:p-6 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-4 border-b border-[#1e2d42] pb-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Layers className="h-4 w-4 text-[#08b5f5]" />
              <span>Lot Rejection Frequency by Product</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Volume vs Rejection
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productRejections} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
                <XAxis dataKey="product" stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'sans-serif', fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f1724', borderColor: '#1e2d42', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#f1f5f9' }}
                />
                <Bar dataKey="lots" name="Total Lots Produced" fill="#1e293b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejects" name="Rejected Lots" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-xs text-slate-300 bg-[#0b111b] p-3 rounded-lg border border-[#1e2d42] font-mono">
            <strong>Corrective Target:</strong> Highest attention needed during grade switchovers to <span className="text-[#08b5f5] font-semibold">PL 65 Matsuyama</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
