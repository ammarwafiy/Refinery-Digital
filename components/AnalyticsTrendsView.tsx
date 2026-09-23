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
      <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 border border-purple-200 text-purple-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>Process Trends & Quality Pareto Analytics</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Banded Tolerance Shading · Multi-Tray Temperature Overlays · Statistical Rejection Pareto
              </p>
            </div>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-purple-100 font-mono text-xs">
            <button
              onClick={() => setActiveMetric('trays')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeMetric === 'trays' ? 'bg-purple-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/50'
              }`}
            >
              Tray Temps (1, 4, 7)
            </button>
            <button
              onClick={() => setActiveMetric('vacuum')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeMetric === 'vacuum' ? 'bg-purple-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/50'
              }`}
            >
              Deodorizer Vacuum
            </button>
            <button
              onClick={() => setActiveMetric('steam')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeMetric === 'steam' ? 'bg-purple-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/50'
              }`}
            >
              Steam Pressures
            </button>
          </div>
        </div>
      </div>

      {/* 2. Banded Time-Series Chart */}
      <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-purple-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span>
              {activeMetric === 'trays' && 'Deodorizer Tray Temperatures (°C) with Configured Operating Bands'}
              {activeMetric === 'vacuum' && 'Processing Vacuum Reach (Torr) — Soft Alert Threshold: 4.5 Torr'}
              {activeMetric === 'steam' && 'Steam Supply Booster vs Ejector Pressures (Bar)'}
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Shift: {sheet.shift_date}
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeMetric === 'trays' ? (
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[180, 280]} stroke="#94a3b8" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="tray1" name="Tray 1 (°C)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tray4" name="Tray 4 Peak (°C)" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tray7" name="Tray 7 Final (°C)" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : activeMetric === 'vacuum' ? (
              <AreaChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[0, 8]} stroke="#94a3b8" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#1e293b' }}
                />
                <ReferenceLine y={4.5} label={{ value: 'Soft Max: 4.5 Torr', fill: '#d97706', fontSize: 10 }} stroke="#d97706" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="vacuum" name="Vacuum (Torr)" stroke="#7c3aed" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            ) : (
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[6, 14]} stroke="#94a3b8" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="boosterPress" name="Booster Pressure (Bar)" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ejectorPress" name="Ejector Pressure (Bar)" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. QC Pareto Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Defect Reasons Bar Chart */}
        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <AlertOctagon className="h-5 w-5 text-rose-500" />
              <span>Monthly QC Rejection Pareto (Reason Codes)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              80/20 Rule Analysis
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoData} margin={{ top: 10, right: 10, bottom: 25, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="reason" 
                  stroke="#94a3b8" 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end" 
                  tick={{ fontSize: 9, fontFamily: 'sans-serif' }} 
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#1e293b' }}
                />
                <Bar dataKey="count" name="Rejection Count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-xs text-slate-600 bg-purple-50/60 p-3 rounded-xl border border-purple-100 font-mono">
            <strong>Key Insight:</strong> 80% of lot failures stem from <span className="text-rose-600 font-semibold">Colour Lovibond drift</span> and <span className="text-amber-600 font-semibold">FFA excursions</span> following vacuum dips.
          </div>
        </div>

        {/* Rejection Rate by Product */}
        <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2 text-slate-800 font-semibold">
              <Layers className="h-5 w-5 text-purple-600" />
              <span>Lot Rejection Frequency by Product</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Volume vs Rejection
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productRejections} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="product" stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'sans-serif' }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: 12, fontFamily: 'monospace', color: '#1e293b' }}
                />
                <Bar dataKey="lots" name="Total Lots Produced" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejects" name="Rejected Lots" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-xs text-slate-600 bg-purple-50/60 p-3 rounded-xl border border-purple-100 font-mono">
            <strong>Corrective Target:</strong> Highest attention needed during grade switchovers to <span className="text-purple-700 font-semibold">PL 65 Matsuyama</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
