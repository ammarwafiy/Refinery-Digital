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
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Supervisor Live Process Board</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-xs font-mono text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Realtime Telemetry
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Nisshin Deodorizer Plant · Shift Date: <span className="font-mono text-slate-200">{sheet.shift_date}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs font-mono">
              <div className="text-slate-400">Last Reading Logged</div>
              <div className="text-slate-200 font-bold">
                {latestEntry ? `${latestEntry.slot_label} hrs (${latestEntry.recorded_by_name || 'Ahmad Razak'})` : 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Active Vacuum */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
              <span>DEOD VACUUM</span>
              <Gauge className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {latestEntry?.vacuum_torr ? `${latestEntry.vacuum_torr.toFixed(1)}` : '-'}
              <span className="text-xs text-slate-500 font-normal ml-1">Torr</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">Target: &lt; 4.5 Torr</div>
          </div>

          {/* Tray 4 Max Deod Temp */}
          <div className="rounded-xl border border-slate-800 bg-[#090d16] p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
              <span>TRAY 4 TEMP</span>
              <Thermometer className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {latestEntry?.tray_4_temp_c ? `${latestEntry.tray_4_temp_c.toFixed(1)}` : '-'}
              <span className="text-xs text-slate-500 font-normal ml-1">°C</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">Soft: 250 - 268°C</div>
          </div>

          {/* Missing Slots */}
          <div className={`rounded-xl border p-3.5 ${
            missingSlots.length > 0 ? 'border-rose-900/60 bg-rose-950/20' : 'border-slate-800 bg-[#090d16]'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
              <span>MISSING SLOTS</span>
              <Clock className={`h-3.5 w-3.5 ${missingSlots.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${missingSlots.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {missingSlots.length}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              {missingSlots.length > 0 ? 'Action required' : 'All hours up to date'}
            </div>
          </div>

          {/* Active Deviations */}
          <div className={`rounded-xl border p-3.5 ${
            openDeviations.length > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-800 bg-[#090d16]'
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
              <span>OPEN DEVIATIONS</span>
              <AlertTriangle className={`h-3.5 w-3.5 ${openDeviations.length > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
            </div>
            <div className={`text-2xl font-bold font-mono ${openDeviations.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {openDeviations.length}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              {openDeviations.length > 0 ? 'Requires acknowledgment' : 'Zero deviations'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Open Deviations & Corrective Action Log */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              <span>Plant Deviations & Corrective Action Notes</span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Total: {deviations.length}
            </span>
          </div>

          {deviations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              No process deviations logged. Plant operating within configured limits.
            </div>
          ) : (
            <div className="space-y-3">
              {deviations.map(dev => {
                const isAck = Boolean(dev.acknowledged_at);
                return (
                  <div
                    key={dev.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isAck ? 'border-slate-800 bg-slate-900/50' : 'border-amber-500/40 bg-amber-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-white">
                            Hour {dev.slot_label}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                            {dev.field_label}
                          </span>
                          {isAck ? (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ACKNOWLEDGED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-500/30 animate-pulse">
                              OPEN DEVIATION
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-slate-300">
                          Observed value: <strong className="font-mono text-amber-300">{dev.observed}</strong> (Soft Band: {dev.soft_min || 0} - {dev.soft_max || 'N/A'})
                        </div>

                        {dev.action_taken ? (
                          <div className="mt-2 text-xs text-slate-400 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                            <span className="font-semibold text-slate-300">Action taken ({dev.acknowledged_by_name}):</span> {dev.action_taken}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-amber-400/80 italic">
                            Awaiting supervisor corrective action note...
                          </div>
                        )}
                      </div>

                      {!isAck && (role === 'supervisor' || role === 'admin') && (
                        <button
                          onClick={() => {
                            setSelectedDev(dev);
                            setActionNarrative('');
                          }}
                          className="shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow"
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
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Clock className="h-5 w-5 text-rose-400" />
                <span>Missing Hourly Log Entries</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Overdue Check
              </span>
            </div>

            {missingSlots.length === 0 ? (
              <div className="p-4 text-center text-xs text-emerald-400 font-mono bg-emerald-950/20 rounded-xl border border-emerald-900/40">
                <CheckCircle2 className="h-4 w-4 inline-block mr-1.5" />
                Zero missing slots. All operators have logged timely rounds.
              </div>
            ) : (
              <div className="space-y-2">
                {missingSlots.map(m => (
                  <div key={m.index} className="flex items-center justify-between p-3 rounded-xl border border-rose-900/40 bg-rose-950/20">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-rose-300">Hour {m.label}</span>
                      <span className="text-xs text-slate-400">Blank slot in RF-FR-004</span>
                    </div>
                    <span className="text-xs font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800/40">
                      Overdue by ~{m.overdueMin} mins
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QC Lab Status in Realtime */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-semibold text-white">
                <FlaskConical className="h-5 w-5 text-cyan-400" />
                <span>QC Lab Sample Status (RF-FR-001)</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Queue: {pendingSamples.length} awaiting results
              </span>
            </div>

            <div className="space-y-2.5">
              {reports.slice(0, 3).map(rep => {
                const isRejected = rep.decision?.decision === 'reject';
                const isAccepted = rep.decision?.decision === 'accept';
                return (
                  <div key={rep.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#090d16]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-200">{rep.lot_no}</span>
                        <span className="text-xs text-slate-400">({rep.product_name})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Sampled: {rep.time_check} · {rep.sampling_point_name || 'Deodorizer Outlet'}
                      </div>
                    </div>

                    <div>
                      {isRejected ? (
                        <span className="text-xs font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                          REJECTED ({rep.decision?.disposition?.toUpperCase()})
                        </span>
                      ) : isAccepted ? (
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                          ACCEPTED
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/40">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <MessageSquare className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">
                Acknowledge Deviation: Hour {selectedDev.slot_label}
              </h3>
            </div>

            <div className="text-xs text-slate-300 mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-semibold text-slate-200">Parameter:</span> {selectedDev.field_label} ({selectedDev.observed})
            </div>

            {ackError && (
              <div className="mb-4 rounded-lg bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60">
                {ackError}
              </div>
            )}

            <form onSubmit={handleAcknowledge} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Corrective Action Note (Auditor review narrative):
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe cause and correction made (e.g. Adjusted ejector steam bypass valve to 3.2 Bar)..."
                  value={actionNarrative}
                  onChange={e => setActionNarrative(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDev(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors"
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
