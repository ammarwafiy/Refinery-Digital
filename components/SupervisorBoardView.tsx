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
  getCurrentRole,
  syncSampleReportsFromSupabase,
  syncProcessSheetsFromSupabase
} from '@/lib/data-service';

export default function SupervisorBoardView() {
  const [sheet, setSheet] = useState<ProcessSheet>(getActiveProcessSheet());
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [reports, setReports] = useState<SampleReport[]>([]);
  const [role, setRole] = useState<UserRole>('supervisor');

  // Acknowledge deviation modal
  const [selectedDev, setSelectedDev] = useState<Deviation | null>(null);
  const [actionNarrative, setActionNarrative] = useState('');
  const [ackError, setAckError] = useState<string | null>(null);

  const refreshData = () => {
    setSheet(getActiveProcessSheet());
    setDeviations(getDeviations());
    setReports(getSampleReports());
  };

  useEffect(() => {
    setRole(getCurrentRole());
    refreshData();

    syncSampleReportsFromSupabase().then(() => refreshData()).catch(() => {});
    syncProcessSheetsFromSupabase().then(() => refreshData()).catch(() => {});

    window.addEventListener('refinery_reports_updated', refreshData);
    window.addEventListener('refinery_sheet_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('refinery_reports_updated', refreshData);
      window.removeEventListener('refinery_sheet_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

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
    <div>
      {/* 1. Supervisor Dashboard Header */}
      <section className="panel head">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>Supervisor live operations board</h2>
          <p className="meta">
            Nisshin Deodorizer Plant, active shift date <span style={{ color: 'var(--text)', fontWeight: 500 }}>{sheet.shift_date}</span>
          </p>
        </div>
        <span className="bd">
          {latestEntry ? `Latest logged: ${latestEntry.slot_label} hrs (${latestEntry.recorded_by_name || 'Shift Operator'})` : 'Latest logged round: no readings yet'}
        </span>
      </section>

      {/* Quick KPI Stat Cards */}
      <div className="cards">
        <div className="panel">
          <label>Deodorizer vacuum</label>
          <b>{latestEntry?.vacuum_torr ? latestEntry.vacuum_torr.toFixed(1) : '–'} <small>Torr</small></b>
          <p>Spec 1.0 to 4.5 Torr</p>
        </div>

        <div className="panel">
          <label>Tray 4 temperature</label>
          <b>{latestEntry?.tray_4_temp_c ? latestEntry.tray_4_temp_c.toFixed(1) : '–'} <small>°C</small></b>
          <p>Spec 250 to 268 °C</p>
        </div>

        <div className={`panel ${missingSlots.length > 0 ? 'al' : ''}`}>
          <label>Missing slots</label>
          <b>{missingSlots.length}</b>
          <p>{missingSlots.length > 0 ? 'Shift round overdue' : 'All hours logged'}</p>
        </div>

        <div className={`panel ${openDeviations.length > 0 ? 'wa' : ''}`}>
          <label>Open deviations</label>
          <b>{openDeviations.length}</b>
          <p>{openDeviations.length > 0 ? 'Action required' : 'Zero deviations'}</p>
        </div>
      </div>

      {/* Two Column Layout: Deviations & Queues */}
      <div className="two">
        {/* Plant Deviations & Corrective Action Notes */}
        <section className="panel">
          <div className="ph">
            <span>Plant deviations and corrective action notes</span>
            <span className="bd">{deviations.length}</span>
          </div>

          <div>
            {deviations.length === 0 ? (
              <p className="empty">No process deviations logged. All parameters operating within normal threshold limits.</p>
            ) : (
              deviations.map(dev => {
                const isAck = Boolean(dev.acknowledged_at);
                return (
                  <div key={dev.id} className={`li ${isAck ? 'ok' : 'dv'}`}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <b style={{ color: 'var(--text)' }}>Hour {dev.slot_label}</b>
                        <span className="bd">{dev.field_label}</span>
                        <span className={`bd ${isAck ? 'g' : 'r'}`}>
                          {isAck ? 'Acknowledged' : 'Open deviation'}
                        </span>
                      </div>

                      <p style={{ marginTop: '4px' }}>
                        Observed value: <strong style={{ color: isAck ? 'var(--text)' : 'var(--amber)' }}>{dev.observed}</strong> (Limit band: {dev.soft_min || 0} – {dev.soft_max || 'N/A'})
                      </p>

                      {dev.action_taken ? (
                        <p style={{ marginTop: '6px', color: 'var(--text)', background: 'var(--raised)', padding: '6px 10px', borderRadius: '6px' }}>
                          <span style={{ fontWeight: 600 }}>Action ({dev.acknowledged_by_name}):</span> {dev.action_taken}
                        </p>
                      ) : (
                        <p style={{ marginTop: '4px', color: 'var(--amber)', fontStyle: 'italic', fontSize: '12px' }}>
                          Awaiting supervisor corrective sign-off...
                        </p>
                      )}
                    </div>

                    {!isAck && (role === 'supervisor' || role === 'admin') && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setSelectedDev(dev);
                          setActionNarrative('');
                        }}
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Overdue Slots and QC Lab Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Overdue Entries */}
          <section className="panel">
            <div className="ph">
              <span>Overdue hourly log entries</span>
              <span className="hint" style={{ fontWeight: 400 }}>Shift compliance check</span>
            </div>

            <div>
              {missingSlots.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--green)', fontSize: '13px' }}>
                  Zero overdue slots. Operating shifts are completely up to date.
                </div>
              ) : (
                missingSlots.map(m => (
                  <div key={m.index} className="li od">
                    <div>
                      <b style={{ color: 'var(--text)' }}>Hour {m.label}</b>
                      <p>Pending hourly process log entry</p>
                    </div>
                    <span className="bd r">Overdue ~{m.overdueMin}m</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* QC Lab Queue */}
          <section className="panel">
            <div className="ph">
              <span>QC lab sample queue</span>
              <span className="bd a">Pending {pendingSamples.length}</span>
            </div>

            <div>
              {reports.length === 0 ? (
                <p className="empty">No QC samples registered today.</p>
              ) : (
                reports.slice(0, 6).map(rep => {
                  const isRejected = rep.decision?.decision === 'reject';
                  const isAccepted = rep.decision?.decision === 'accept';
                  const isConcession = rep.decision?.decision === 'accept_concession';
                  return (
                    <div key={rep.id} className="li">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <b style={{ color: 'var(--text)' }}>{rep.lot_no}</b>
                          <span className="hint">({rep.product_name})</span>
                        </div>
                        <p style={{ marginTop: '2px', fontSize: '12px' }}>
                          Sampled: {rep.time_check} · {rep.sampling_point_name || 'Deodorizer Outlet'}
                        </p>
                      </div>

                      <div>
                        {isRejected ? (
                          <span className="bd r">Rejected ({String(rep.decision?.disposition || 'REPROCESS').toUpperCase()})</span>
                        ) : isAccepted ? (
                          <span className="bd g">Accepted</span>
                        ) : isConcession ? (
                          <span className="bd a">Concession</span>
                        ) : (
                          <span className="bd a">Lab testing</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Acknowledge Deviation Modal */}
      {selectedDev && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div className="panel" style={{ maxWidth: '480px', width: '100%', margin: 0, padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
              Acknowledge Deviation: Hour {selectedDev.slot_label}
            </h3>

            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Parameter:</span> {selectedDev.field_label} ({selectedDev.observed})
            </div>

            {ackError && (
              <p className="err" style={{ marginBottom: '12px' }}>{ackError}</p>
            )}

            <form onSubmit={handleAcknowledge}>
              <div className="fld">
                <label htmlFor="dev-narrative">Corrective Action Note (Auditor review narrative):</label>
                <textarea
                  id="dev-narrative"
                  required
                  rows={3}
                  placeholder="Describe cause and correction made (e.g. Adjusted ejector steam bypass valve to 3.2 Bar)..."
                  value={actionNarrative}
                  onChange={e => setActionNarrative(e.target.value)}
                  className="rem"
                  style={{ height: '80px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDev(null)}
                  className="ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
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

