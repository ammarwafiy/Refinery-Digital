'use client';

import React, { useState, useEffect } from 'react';
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
  getCurrentRole 
} from '@/lib/data-service';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Droplets, 
  Gauge, 
  Thermometer, 
  MessageSquare, 
  ChevronRight, 
  ShieldAlert, 
  FlaskConical,
  XCircle,
  FileText
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function SupervisorBoardView() {
  const [sheet, setSheet] = useState<ProcessSheet>(getActiveProcessSheet());
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [reports, setReports] = useState<SampleReport[]>([]);
  const [role, setRole] = useState<UserRole>('supervisor');

  // Acknowledge deviation modal
  const [selectedDev, setSelectedDev] = useState<Deviation | null>(null);
  const [actionNarrative, setActionNarrative] = useState('');
  const [ackError, setAckError] = useState<string | null>(null);

  useEffect(() => {
    setRole(getCurrentRole());
    refreshData();
  }, []);

  const refreshData = () => {
    setSheet(getActiveProcessSheet());
    setDeviations(getDeviations());
    setReports(getSampleReports());
  };

  const handleAcknowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDev) return;
    setAckError(null);

    const res = acknowledgeDeviation(selectedDev.id, actionNarrative);
    if (!res.success) {
      setAckError(res.error || 'Failed to acknowledge deviation.');
      return;
    }

    setSelectedDev(null);
    setActionNarrative('');
    refreshData();
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
  const openDeviations = deviations.filter(d => !d.acknowledged_at);

  // QC Queue samples awaiting results
  const pendingSamples = reports.filter(r => r.status === 'awaiting_results');

  return (
    <div className="space-y-6">
      {/* 1. Supervisor Dashboard Header */}
      <div className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm shadow-purple-950/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-200 bg-purple-100 text-purple-700">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-purple-800">
                  SV-CONSOLE-01
                </span>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-sans">
                  Supervisor Live Operations Board
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-mono text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Nisshin Deodorizer Plant · Active Shift Date: <span className="text-purple-700 font-bold">{sheet.shift_date}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right text-xs font-mono bg-purple-50/60 px-3 py-1.5 rounded-xl border border-purple-100">
              <div className="text-slate-500 text-[10px] uppercase tracking-wider">LATEST LOGGED ROUND</div>
              <div className="text-purple-950 font-bold mt-0.5">
                {latestEntry ? `${latestEntry.slot_label} hrs (${latestEntry.recorded_by_name || 'Shift Operator'})` : 'No readings yet'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Active Vacuum */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
              <span className="uppercase tracking-wider">DEOD VACUUM</span>
              <Gauge className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {latestEntry?.vacuum_torr ? `${latestEntry.vacuum_torr.toFixed(1)}` : '-'}
              <span className="text-xs text-slate-500 font-normal ml-1 font-mono">Torr</span>
            </div>
            <div className="text-[10px] text-purple-700 font-mono mt-1">Band: 1.0 - 4.5 Torr</div>
          </div>

          {/* Tray 4 Max Deod Temp */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
              <span className="uppercase tracking-wider">TRAY 4 TEMP</span>
              <Thermometer className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {latestEntry?.tray_4_temp_c ? `${latestEntry.tray_4_temp_c.toFixed(1)}` : '-'}
              <span className="text-xs text-slate-500 font-normal ml-1 font-mono">°C</span>
            </div>
            <div className="text-[10px] text-purple-700 font-mono mt-1">Band: 250 - 268°C</div>
          </div>

          {/* Missing Slots */}
          <div className={`rounded-xl border p-3.5 ${
            missingSlots.length > 0 ? 'border-rose-200 bg-rose-50/60' : 'border-purple-100 bg-purple-50/40'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
              <span className="uppercase tracking-wider">MISSING SLOTS</span>
              <Clock className={`h-3.5 w-3.5 ${missingSlots.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
            </div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${missingSlots.length > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {missingSlots.length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              {missingSlots.length > 0 ? 'Shift round overdue' : 'All hours logged'}
            </div>
          </div>

          {/* Active Deviations */}
          <div className={`rounded-xl border p-3.5 ${
            openDeviations.length > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-purple-100 bg-purple-50/40'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 font-mono">
              <span className="uppercase tracking-wider">OPEN DEVIATIONS</span>
              <AlertTriangle className={`h-3.5 w-3.5 ${openDeviations.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${openDeviations.length > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {openDeviations.length}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              {openDeviations.length > 0 ? 'Action required' : 'Zero deviations'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Open Deviations & Corrective Action Log */}
        <div className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm shadow-purple-950/5">
          <div className="flex items-center justify-between mb-4 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900 font-mono text-xs uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>Plant Deviations & Corrective Action Notes</span>
            </div>
            <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              COUNT: {deviations.length}
            </span>
          </div>

          {deviations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono bg-purple-50/30 rounded-xl border border-purple-100">
              No process deviations logged. All parameters operating within normal threshold limits.
            </div>
          ) : (
            <div className="space-y-3">
              {deviations.map(dev => {
                const isAck = Boolean(dev.acknowledged_at);
                return (
                  <div
                    key={dev.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isAck ? 'border-purple-100 bg-slate-50/60' : 'border-amber-200 bg-amber-50/40 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            HOUR {dev.slot_label}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-white border border-purple-200 text-purple-800 font-semibold">
                            {dev.field_label}
                          </span>
                          {isAck ? (
                            <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                              ACKNOWLEDGED
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 animate-pulse font-semibold">
                              OPEN DEVIATION
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 text-xs text-slate-700 font-mono">
                          Observed value: <strong className="text-amber-700">{dev.observed}</strong> (Limit Band: {dev.soft_min || 0} - {dev.soft_max || 'N/A'})
                        </div>

                        {dev.action_taken ? (
                          <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-purple-100 font-mono">
                            <span className="font-semibold text-purple-900">Corrective action ({dev.acknowledged_by_name}):</span> {dev.action_taken}
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] text-amber-700 italic font-mono">
                            Awaiting supervisor corrective sign-off...
                          </div>
                        )}
                      </div>

                      {!isAck && (role === 'supervisor' || role === 'admin') && (
                        <button
                          onClick={() => {
                            setSelectedDev(dev);
                            setActionNarrative('');
                          }}
                          className="shrink-0 flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer active:scale-95"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Missing Entries & QC Lab Alert Queue */}
        <div className="space-y-6">
          {/* Missing Hourly Entries Box */}
          <div className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm shadow-purple-950/5">
            <div className="flex items-center justify-between mb-4 border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 font-mono text-xs uppercase tracking-wider">
                <Clock className="h-4 w-4 text-rose-600" />
                <span>Overdue Hourly Log Entries</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
                SHIFT COMPLIANCE CHECK
              </span>
            </div>

            {missingSlots.length === 0 ? (
              <div className="p-3.5 text-center text-xs text-emerald-700 font-mono bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 inline-block mr-1.5 text-emerald-600" />
                Zero overdue slots. Operating shifts are completely up to date.
              </div>
            ) : (
              <div className="space-y-2">
                {missingSlots.map(m => (
                  <div key={m.index} className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-rose-800">Hour {m.label}</span>
                      <span className="text-xs text-slate-500 font-mono">Blank in RF-FR-004</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200 font-semibold">
                      Overdue by ~{m.overdueMin} mins
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QC Lab Status in Realtime */}
          <div className="rounded-2xl border border-purple-100 bg-white p-4 sm:p-5 shadow-sm shadow-purple-950/5">
            <div className="flex items-center justify-between mb-4 border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 font-mono text-xs uppercase tracking-wider">
                <FlaskConical className="h-4 w-4 text-purple-600" />
                <span>QC Lab Sample Queue (RF-FR-001)</span>
              </div>
              <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                PENDING: {pendingSamples.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {reports.slice(0, 3).map(rep => {
                const isRejected = rep.decision?.decision === 'reject';
                const isAccepted = rep.decision?.decision === 'accept';
                return (
                  <div key={rep.id} className="flex items-center justify-between p-3 rounded-xl border border-purple-100 bg-slate-50/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{rep.lot_no}</span>
                        <span className="text-xs text-purple-700 font-mono font-medium">({rep.product_name})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Sampled: {rep.time_check} · {rep.sampling_point_name || 'Deodorizer Outlet'}
                      </div>
                    </div>

                    <div>
                      {isRejected ? (
                        <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
                          REJECTED ({rep.decision?.disposition?.toUpperCase()})
                        </span>
                      ) : isAccepted ? (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                          ACCEPTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                          LAB TESTING
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Acknowledge Deviation Modal */}
      {selectedDev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-purple-700 mb-3">
              <MessageSquare className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Acknowledge Deviation: Hour {selectedDev.slot_label}
              </h3>
            </div>

            <div className="text-xs text-slate-700 mb-4 p-3 rounded-xl bg-purple-50/60 border border-purple-100 font-mono">
              <span className="font-semibold text-purple-900">Parameter:</span> {selectedDev.field_label} ({selectedDev.observed})
            </div>

            {ackError && (
              <div className="mb-4 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200 font-mono">
                {ackError}
              </div>
            )}

            <form onSubmit={handleAcknowledge} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-700 mb-1">
                  Corrective Action Note (Auditor review narrative):
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe cause and correction made (e.g. Adjusted ejector steam bypass valve to 3.2 Bar)..."
                  value={actionNarrative}
                  onChange={e => setActionNarrative(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDev(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold text-xs uppercase px-4 py-1.5 rounded-lg transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Save Corrective Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
