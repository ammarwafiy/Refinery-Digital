'use client';

import React, { useState, useEffect } from 'react';
import { 
  ProcessSheet, 
  ProcessEntry, 
  Product, 
  UserRole,
  Profile,
  Parameter,
  SampleReport
} from '@/types/refinery';
import { 
  getProcessSheetByDate,
  getAvailableShiftDates,
  getRealtimeShiftDate,
  saveProcessEntry, 
  copyPreviousHour, 
  verifySheet, 
  unlockSheet,
  getProducts, 
  getParameters,
  getParameterLimits, 
  getCurrentRole,
  getRealtimeSlotIndex,
  ensureAutoDispatchedQC,
  syncAllProcessEntriesToQC,
  getSampleReports,
  syncSampleReportsFromSupabase,
  syncProcessSheetsFromSupabase
} from '@/lib/data-service';
import { DEFAULT_PRODUCT_ID } from '@/lib/mock-data';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Save, 
  Lock, 
  Unlock,
  Clock, 
  Gauge, 
  Thermometer, 
  Check, 
  FileCheck2, 
  AlertCircle,
  FlaskConical
} from 'lucide-react';

interface ProcessLogViewProps {
  currentRole?: UserRole;
  currentUser?: Profile | null;
}

export default function ProcessLogView({ currentRole, currentUser }: ProcessLogViewProps = {}) {
  const [activeShiftDate, setActiveShiftDate] = useState<string>(getRealtimeShiftDate());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [sheet, setSheet] = useState<ProcessSheet>(() => getProcessSheetByDate(getRealtimeShiftDate()));
  const isLiveShift = activeShiftDate === getRealtimeShiftDate();

  const [products, setProducts] = useState<Product[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [autoDispatchQc, setAutoDispatchQc] = useState<boolean>(true);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(getRealtimeSlotIndex());
  const [currentSlotIndex, setCurrentSlotIndex] = useState<number>(getRealtimeSlotIndex());
  const [currentMinutesRemaining, setCurrentMinutesRemaining] = useState<number>(60);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [role, setRole] = useState<UserRole>(currentRole || currentUser?.role || getCurrentRole());
  const [sampleReports, setSampleReports] = useState<SampleReport[]>(() => getSampleReports());

  // Active entry form state
  const [formData, setFormData] = useState<Partial<ProcessEntry>>({});
  const [ghostData, setGhostData] = useState<Partial<ProcessEntry>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [copiedSlotLabel, setCopiedSlotLabel] = useState<string | null>(null);

  // Supervisor verification modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Admin Unlock modal state
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const limits = getParameterLimits();

  // Realtime clock, slot tracker, and shift date rollover
  useEffect(() => {
    setAvailableDates(getAvailableShiftDates());

    const updateRealtime = () => {
      const now = new Date();
      const mytDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
      const currentMinute = mytDate.getMinutes();
      const slot = getRealtimeSlotIndex();
      const realtimeDate = getRealtimeShiftDate();
      
      setCurrentSlotIndex(slot);
      setCurrentMinutesRemaining(60 - currentMinute);
      setCurrentTimeStr(
        mytDate.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );

      // Proactively auto-dispatch QC sample lot to RF-FR-001 QC Lab for the active timeline hour and recorded entries
      syncAllProcessEntriesToQC(activeShiftDate);

      // Auto-rollover in realtime when shift date changes (e.g. 07:00 AM hits)
      setActiveShiftDate(prevDate => {
        if (isLiveShift && prevDate !== realtimeDate) {
          const freshSheet = getProcessSheetByDate(realtimeDate);
          setSheet(freshSheet);
          setSelectedSlotIndex(slot);
          loadSlot(slot, freshSheet);
          setAvailableDates(getAvailableShiftDates());
          return realtimeDate;
        }
        return prevDate;
      });
    };

    updateRealtime();
    const timer = setInterval(updateRealtime, 1000);
    return () => clearInterval(timer);
  }, [isLiveShift]);

  useEffect(() => {
    setProducts(getProducts());
    setParameters(getParameters());
    setRole(currentRole || currentUser?.role || getCurrentRole());
    refreshSheet();
    setSampleReports(getSampleReports());

    // Hydrate Supabase on mount/shift change
    syncSampleReportsFromSupabase().then(() => {
      setSampleReports(getSampleReports());
    });
    syncProcessSheetsFromSupabase().then(() => {
      refreshSheet();
    });

    const handleReportsUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setSampleReports(e.detail);
      } else {
        setSampleReports(getSampleReports());
      }
    };
    const handleSheetUpdated = () => {
      refreshSheet();
    };

    window.addEventListener('refinery_reports_updated', handleReportsUpdated);
    window.addEventListener('refinery_sheet_updated', handleSheetUpdated);

    return () => {
      window.removeEventListener('refinery_reports_updated', handleReportsUpdated);
      window.removeEventListener('refinery_sheet_updated', handleSheetUpdated);
    };
  }, [currentRole, currentUser, activeShiftDate]);

  const handleDateChange = (newDate: string) => {
    setActiveShiftDate(newDate);
    const targetSheet = getProcessSheetByDate(newDate);
    setSheet(targetSheet);
    const isNowLive = newDate === getRealtimeShiftDate();
    const targetSlot = isNowLive ? getRealtimeSlotIndex() : 0;
    setSelectedSlotIndex(targetSlot);
    loadSlot(targetSlot, targetSheet);
  };

  const refreshSheet = (preserveSuccess = false) => {
    const s = getProcessSheetByDate(activeShiftDate);
    setSheet(s);
    syncAllProcessEntriesToQC(activeShiftDate);
    loadSlot(selectedSlotIndex, s, preserveSuccess);
    setAvailableDates(getAvailableShiftDates());
  };

  const loadSlot = (slotIdx: number, activeSheet = sheet, preserveSuccess = false) => {
    setSelectedSlotIndex(slotIdx);
    setValidationError(null);
    if (!preserveSuccess) {
      setSuccessMessage(null);
      setIsJustSaved(false);
    }

    const existingEntry = activeSheet.entries?.find(e => e.slot_index === slotIdx);
    const prevEntry = activeSheet.entries?.find(e => e.slot_index === slotIdx - 1);

    if (prevEntry) {
      setGhostData(prevEntry);
    } else {
      setGhostData({});
    }

    if (existingEntry) {
      setFormData({ ...existingEntry });
      setAutoDispatchQc(existingEntry.auto_dispatch_qc !== false);
    } else {
      // Initialize with defaults / carried-over product
      const defaultProdId = prevEntry?.product_id || products[25]?.id || DEFAULT_PRODUCT_ID;
      const initialDispatch = prevEntry ? prevEntry.auto_dispatch_qc !== false : true;

      setFormData({
        slot_index: slotIdx,
        product_id: defaultProdId,
        deod_time_set_hr: 2.0,
        strip_steam_pct_of_oil: prevEntry?.strip_steam_pct_of_oil ?? activeSheet.stripping_steam_pct ?? 1.5,
        tray_steam_supply_bar: prevEntry?.tray_steam_supply_bar ?? activeSheet.set_steam_supply_bar ?? 3.0,
        auto_dispatch_qc: initialDispatch,
      });
      setAutoDispatchQc(initialDispatch);
    }
  };

  const handleFieldChange = (field: keyof ProcessEntry, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
  };

  const handleProductChange = (newProdId: string) => {
    handleFieldChange('product_id', newProdId);
    // Proactively sync auto-dispatched QC report with the newly selected product
    ensureAutoDispatchedQC(selectedSlotIndex, activeShiftDate, newProdId);
  };

  const handleCopyPrevious = () => {
    if (selectedSlotIndex === 0) {
      setValidationError('Cannot copy for the 0700 first hour of the shift.');
      return;
    }
    const res = copyPreviousHour(selectedSlotIndex, activeShiftDate);
    if (res.success && res.data) {
      setIsCopying(true);
      const sourceSlot = res.prevSlotLabel || String((((selectedSlotIndex - 1 + 24) % 24) + 7) % 24 * 100).padStart(4, '0');
      setCopiedSlotLabel(sourceSlot);
      setFormData(prev => ({
        ...prev,
        ...res.data,
      }));
      if (res.data.auto_dispatch_qc !== undefined) {
        setAutoDispatchQc(res.data.auto_dispatch_qc !== false);
      }
      setSuccessMessage(`✓ Successfully copied 21 process parameters & QC dispatch settings from Hour ${sourceSlot}! Please review and click 'Save Hour ${selectedSlotLabel} Readings' below.`);
      setTimeout(() => setIsCopying(false), 1200);
      setTimeout(() => setCopiedSlotLabel(null), 3500);
    } else {
      setValidationError(res.error || 'Failed to copy previous hour.');
    }
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSlotDisabled) {
      setValidationError(`Hour ${selectedSlotLabel} is locked (Read-Only). Readings can only be saved during the active live window (${String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')}).`);
      return;
    }
    setValidationError(null);
    setIsSaving(true);

    const res = saveProcessEntry({
      ...formData,
      slot_index: selectedSlotIndex,
      auto_dispatch_qc: autoDispatchQc,
    }, activeShiftDate);

    if (!res.success) {
      setIsSaving(false);
      setValidationError(res.error || 'Failed to save entry.');
      return;
    }

    setIsSaving(false);
    setIsJustSaved(true);
    if (autoDispatchQc) {
      setSuccessMessage(`✓ Hour ${res.entry.slot_label} readings recorded! Product sample (${res.entry.product_name}) auto-dispatched to RF-FR-001 QC Lab.`);
    } else {
      setSuccessMessage(`✓ Hour ${res.entry.slot_label} readings recorded!`);
    }
    refreshSheet(true);

    setTimeout(() => {
      setIsJustSaved(false);
    }, 4000);
  };

  const handleVerifySheet = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    const res = verifySheet(sheet.id, signaturePassword, activeShiftDate);
    if (!res.success) {
      setVerifyError(res.error || 'Verification failed.');
      return;
    }

    setIsVerifyModalOpen(false);
    setSignaturePassword('');
    setSuccessMessage('Shift sheet verified and locked successfully by Supervisor!');
    refreshSheet();
  };

  const handleUnlockSheet = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);

    const res = unlockSheet(sheet.id, unlockReason, unlockPassword, activeShiftDate);
    if (!res.success) {
      setUnlockError(res.error || 'Failed to unlock sheet.');
      return;
    }

    setIsUnlockModalOpen(false);
    setUnlockReason('');
    setUnlockPassword('');
    setSuccessMessage('Process sheet unlocked successfully by Admin! You may now edit hourly readings.');
    refreshSheet();
  };

  // Helper to determine soft/hard limit status for styling
  const checkLimit = (fieldKey: string, val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return 'normal';
    const lim = limits.find(l => l.field_key === fieldKey);
    if (!lim) return 'normal';
    if ((lim.hard_max !== null && lim.hard_max !== undefined && val > lim.hard_max) ||
        (lim.hard_min !== null && lim.hard_min !== undefined && val < lim.hard_min)) {
      return 'hard_error';
    }
    if ((lim.soft_max !== null && lim.soft_max !== undefined && val > lim.soft_max) ||
        (lim.soft_min !== null && lim.soft_min !== undefined && val < lim.soft_min)) {
      return 'soft_warn';
    }
    return 'normal';
  };

  const selectedSlotLabel = String(((selectedSlotIndex + 7) % 24) * 100).padStart(4, '0');
  const currentSlotTimeStr = `${selectedSlotLabel.slice(0, 2)}:00`;
  const nextSlotTimeStr = `${String((Number(selectedSlotLabel.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00`;

  // Realtime slot status
  const isLiveSlot = selectedSlotIndex === currentSlotIndex;
  const isPastSlot = isLiveShift ? selectedSlotIndex < currentSlotIndex : true;
  const isFutureSlot = isLiveShift ? selectedSlotIndex > currentSlotIndex : false;

  // Strict realtime lock rule
  const isSlotDisabled = sheet.status === 'verified' || (role !== 'admin' && (!isLiveShift || !isLiveSlot));

  // Real-time synchronization of Stripping Steam & Tray Steam Supply
  const latestEntryWithStripSteam = [...(sheet.entries || [])]
    .filter(e => e.strip_steam_pct_of_oil != null && !isNaN(Number(e.strip_steam_pct_of_oil)))
    .sort((a, b) => b.slot_index - a.slot_index)[0];

  const latestEntryWithTraySteam = [...(sheet.entries || [])]
    .filter(e => e.tray_steam_supply_bar != null && !isNaN(Number(e.tray_steam_supply_bar)))
    .sort((a, b) => b.slot_index - a.slot_index)[0];

  const liveStrippingSteam = latestEntryWithStripSteam?.strip_steam_pct_of_oil ?? sheet.stripping_steam_pct ?? 1.5;
  const liveTraySteam = latestEntryWithTraySteam?.tray_steam_supply_bar ?? sheet.set_steam_supply_bar ?? 3.0;
  const isStripSteamSynced = latestEntryWithStripSteam != null;
  const isTraySteamSynced = latestEntryWithTraySteam != null;

  // Real-time synchronization of QC Lab Decision for the selected hour slot
  const matchingQCReport = sampleReports.find(
    r => r.sample_date === activeShiftDate && (r.time_check === currentSlotTimeStr || r.time_check === selectedSlotLabel.slice(0, 2) + ':00')
  );

  return (
    <div className="space-y-5">
      {/* 1. Sheet Header Banner (RF-FR-004 Rev. 02) */}
      <section className="panel">
        <div className="head">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2>Hourly Deodorizer Process Control Log</h2>
              {sheet.status === 'verified' && (
                <span className="bd g">
                  Verified &amp; Locked
                </span>
              )}
            </div>
            <p className="meta">
              <span className="live-dot"></span>
              Deodorizer 01, cycle runs 07:00 to 06:00 the next day
              {sheet.status === 'verified' && sheet.verified_by_name && (
                <span className="ml-2 text-green-600 font-medium">
                  · Verified by: {sheet.verified_by_name}
                </span>
              )}
            </p>
          </div>

          {/* Header Setpoints & Controls */}
          <div className="stats">
            {/* Shift Date Selector */}
            <div className="f">
              <label htmlFor="d">Log date</label>
              <input
                id="d"
                type="date"
                value={activeShiftDate}
                onChange={(e) => e.target.value && handleDateChange(e.target.value)}
                className="cursor-pointer"
                title="Pick shift date"
              />
            </div>

            {/* Stripping Steam Metric */}
            <div className="m">
              <label>Stripping steam</label>
              <strong>{Number(liveStrippingSteam).toFixed(2)}</strong>
              <span>% oil</span>
            </div>

            {/* Tray Steam Metric */}
            <div className="m">
              <label>Tray steam</label>
              <strong>{Number(liveTraySteam).toFixed(2)}</strong>
              <span>bar</span>
            </div>

            {/* Supervisor Action Button */}
            {(role === 'supervisor' || role === 'admin') && sheet.status !== 'verified' && (
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(true)}
                className="primary"
              >
                Verify shift
              </button>
            )}

            {/* Admin Unlock Action Button */}
            {role === 'admin' && sheet.status === 'verified' && (
              <button
                type="button"
                onClick={() => {
                  setIsUnlockModalOpen(true);
                  setUnlockError(null);
                  setUnlockReason('');
                  setUnlockPassword('');
                }}
                className="ghost"
                title="Unlock process sheet for corrections"
              >
                Unlock shift
              </button>
            )}
          </div>
        </div>

        {/* 2. 24-Hour Time Slot Navigator Strip */}
        <div className="tl">
          <div className="tlh">
            <b>24-hour timeline</b>
            <div className="legend">
              <span><i style={{ background: 'var(--red)' }}></i>Live</span>
              <span><i style={{ background: 'var(--green)' }}></i>Recorded / QC Pass</span>
              <span><i style={{ background: 'var(--amber)' }}></i>Deviation</span>
              <span><i style={{ background: '#EF4444' }}></i>QC Rejected</span>
              <span>Locked hours are read-only</span>
            </div>
          </div>

          <div className="ribbon-grid" role="group" aria-label="Select hour">
            {Array.from({ length: 24 }).map((_, idx) => {
              const label = String(((idx + 7) % 24) * 100).padStart(4, '0');
              const slotTime = `${label.slice(0, 2)}:00`;
              const entry = sheet.entries?.find(e => e.slot_index === idx);
              const isSelected = selectedSlotIndex === idx;
              const isLive = isLiveShift && idx === currentSlotIndex;
              const isPast = isLiveShift ? idx < currentSlotIndex : true;
              const hasDev = Boolean(entry?.has_deviation);
              const isFilled = Boolean(entry && (entry.recorded_by || entry.product_id || entry.vacuum_torr != null || entry.oil_feed_rate_litre != null || entry.no_production_reason != null));

              const qcRep = sampleReports.find(r => r.sample_date === activeShiftDate && r.time_check === slotTime);
              const isQCRejected = qcRep?.decision?.decision === 'reject';
              const isQCAccepted = qcRep?.decision?.decision === 'accept' || qcRep?.decision?.decision === 'accept_concession';

              let statusClass = 'locked';
              let statusIndicator: React.ReactNode = <i className="dot" />;

              if (isLive) {
                statusClass = 'live';
                statusIndicator = 'Live';
              } else if (isQCRejected) {
                statusClass = 'dev rejected';
                statusIndicator = <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block shadow-xs" title="QC Rejected" />;
              } else if (hasDev) {
                statusClass = 'dev';
                statusIndicator = <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)] inline-block" />;
              } else if (isQCAccepted) {
                statusClass = 'recorded';
                statusIndicator = <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] inline-block shadow-xs" title="QC Accepted" />;
              } else if (isFilled) {
                statusClass = 'recorded';
                statusIndicator = <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] inline-block" />;
              } else if (isPast) {
                statusClass = 'locked';
                statusIndicator = <Lock className="h-2.5 w-2.5 text-[var(--muted)]" />;
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => loadSlot(idx)}
                  className={`ribbon-cell ${statusClass} ${isSelected ? 'sel' : ''}`}
                  title={`Slot ${label} (${label.slice(0, 2)}:00)${isQCRejected ? ' - QC REJECTED' : isQCAccepted ? ' - QC ACCEPTED' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span>{label}</span>
                  <small>{statusIndicator}</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Hourly Data Entry Form Panel */}
      <section className="panel">
        <div className="rh">
          <div className="rt">
            <div className="badge">
              {selectedSlotLabel.slice(0, 2)}:00
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                Hourly readings for {currentSlotTimeStr} hrs
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Ghost numbers show the previous hour&apos;s readings.
              </p>
            </div>
          </div>

          {/* Quick Ergonomic Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrevious}
              disabled={selectedSlotIndex === 0 || isSlotDisabled}
              className="ghost"
              title={isSlotDisabled ? "Slot locked from copying" : "Copy readings from previous recorded hour"}
            >
              {copiedSlotLabel ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[var(--green)] mr-1" />
                  <span>Copied from Hour {copiedSlotLabel}!</span>
                </>
              ) : (
                <span>Copy readings from {String((((selectedSlotIndex - 1 + 24) % 24) + 7) % 24 * 100).padStart(4, '0').slice(0, 2)}:00</span>
              )}
            </button>
          </div>
        </div>

        {/* Validation & Alert feedback banners */}
        {validationError && (
          <div className="mb-5 flex items-center gap-2.5 rounded bg-[#EF4444]/15 p-3.5 text-xs text-red-300 border border-[#EF4444]/40 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded bg-[#10B981]/15 p-3.5 text-xs text-emerald-300 border border-[#10B981]/40 font-mono">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Historical Shift Read-Only Notification Banner */}
        {!isLiveShift && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-[#101927] p-3.5 text-xs text-slate-500 border border-[#1F2E43]">
            <div className="flex items-start gap-3">
              <div className="rounded border border-[#1F2E43] bg-[#101927] p-2 text-[#009FE3] shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-100 text-xs block font-mono">
                  HISTORICAL SHIFT ARCHIVE ({activeShiftDate}) · READ-ONLY
                </span>
                <span className="text-slate-400 block text-[11px] mt-0.5">
                  Records in this view are locked for audit compliance. Live operations are active on today&apos;s shift ({getRealtimeShiftDate()}).
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDateChange(getRealtimeShiftDate())}
              className="bg-[#009FE3] hover:bg-[#08B5F5] text-white font-mono font-medium text-xs uppercase px-3 py-1.5 rounded transition-all shrink-0 border border-[#009FE3] cursor-pointer"
            >
              Switch to Live Shift
            </button>
          </div>
        )}

        {/* Realtime Window Feedback Banner */}
        {isLiveShift && isPastSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-amber-950/25 p-3.5 text-xs text-amber-200 border border-amber-800/40">
            <div className="flex items-start gap-3">
              <div className="rounded border border-[#F59E0B]/40 bg-[#101927] p-2 text-amber-600 shrink-0">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-amber-300 text-xs block font-mono">
                  LOG CLOSED: Slot {selectedSlotLabel} Window Has Passed ({currentSlotTimeStr} – {nextSlotTimeStr})
                </span>
                <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed font-mono">
                  Hourly recording window closed automatically at {nextSlotTimeStr} per refinery standard procedure to prevent post-hoc alteration.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadSlot(currentSlotIndex)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#101927] text-slate-200 border border-[#1F2E43] hover:bg-slate-100 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-[#009FE3]" />
              <span>Go to Active Slot ({String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')})</span>
            </button>
          </div>
        )}

        {isFutureSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-[#101927] p-3.5 text-xs text-slate-500 border border-[#1F2E43]">
            <div className="flex items-start gap-3">
              <div className="rounded border border-[#1F2E43] bg-[#101927] p-2 text-[#009FE3] shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-100 text-xs block font-mono">
                  PENDING SHIFT HOUR: Slot {selectedSlotLabel}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-mono">
                  Input fields unlock automatically when plant time reaches {currentSlotTimeStr}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadSlot(currentSlotIndex)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#101927] text-slate-200 border border-[#1F2E43] hover:bg-slate-100 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-[#009FE3]" />
              <span>Go to Active Slot ({String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')})</span>
            </button>
          </div>
        )}



        {/* Informative Locked Sheet Banner */}
        {sheet.status === 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-[#10B981]/15 p-3.5 text-xs text-emerald-200 border border-[#10B981]/40">
            <div className="flex items-start sm:items-center gap-2.5">
              <Lock className="h-4 w-4 shrink-0 text-green-600 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold text-emerald-100 font-mono text-xs">Shift Sheet Verified & Locked</span>
                <p className="text-[11px] text-emerald-300 mt-0.5 font-mono">
                  All hourly input fields locked against operator modification. 
                  {sheet.verified_by_name ? ` Sign-off: ${sheet.verified_by_name}.` : ''} 
                  {role === 'admin' ? ' Admin may unlock for justified corrections.' : ''}
                </p>
              </div>
            </div>
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setIsUnlockModalOpen(true);
                  setUnlockError(null);
                  setUnlockReason('');
                  setUnlockPassword('');
                }}
                className="shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-[#F59E0B]/150 text-white font-mono font-medium text-xs uppercase px-3 py-1.5 rounded transition-all border border-amber-500 cursor-pointer shadow-xs"
              >
                <Unlock className="h-3 w-3" />
                <span>Admin Unlock</span>
              </button>
            )}
          </div>
        )}

        {/* Form Inputs Grid */}
        <form onSubmit={handleSaveEntry}>
          {/* Section A: Product Picker */}
          <div className="row">
            <label htmlFor="prod">Product specification and oil type</label>
            <div className="sel-wrap">
              <select
                id="prod"
                value={formData.product_id || ''}
                onChange={e => handleProductChange(e.target.value)}
                disabled={isSlotDisabled}
                className="bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-sm text-[var(--text)]"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id} className="bg-[var(--bg)] text-[var(--text)]">
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="hint">
                Carried over from previous hour unless changed.
              </span>
            </div>
          </div>

          {/* Section A.1: Auto-Dispatch to RF-FR-001 QC Lab */}
          <div className="row dispatch">
            <div>
              <div className="flex items-center gap-2">
                <b>Auto-dispatch sample lot to QC Lab</b>
                {matchingQCReport ? (
                  <span className="font-mono text-[11px] text-[var(--muted)]">
                    (Lot: {matchingQCReport.lot_no || matchingQCReport.report_no})
                  </span>
                ) : null}
              </div>
              <p>The sample lot is sent to the QC Lab queue when the hour starts. Operators cannot override this, per the plant QA manual.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {matchingQCReport?.decision ? (
                matchingQCReport.decision.decision === 'accept' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>QC Accepted &amp; Released</span>
                  </span>
                ) : matchingQCReport.decision.decision === 'accept_concession' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>QC Concession Released</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-red-500/15 text-red-400 border border-red-500/30">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>QC Rejected: {matchingQCReport.decision.reason_label || matchingQCReport.decision.reason_detail || 'Non-compliant'}</span>
                  </span>
                )
              ) : matchingQCReport ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <FlaskConical className="h-3.5 w-3.5 animate-pulse" />
                  <span>Awaiting QC Lab Analysis</span>
                </span>
              ) : (
                <span className="sync">
                  <i></i>
                  <span>Synced with shift timeline</span>
                </span>
              )}
            </div>
          </div>

          {/* Section B: Processing Conditions (Feed Rate, Deod Time, Vacuum) */}
          <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">
              <Gauge className="h-3.5 w-3.5 text-[var(--red)]" />
              <span>Processing Controls</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Oil Feed Rate */}
              <div>
                <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">
                  Oil Feed Rate <span>(Litre)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    placeholder={ghostData.oil_feed_rate_litre?.toString() || 'e.g. 25000'}
                    value={formData.oil_feed_rate_litre ?? ''}
                    onChange={e => handleFieldChange('oil_feed_rate_litre', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {ghostData.oil_feed_rate_litre !== undefined && (
                    <span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted)] pointer-events-none">
                      Prev: {ghostData.oil_feed_rate_litre}
                    </span>
                  )}
                </div>
              </div>

              {/* Deod Time Set */}
              <div>
                <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">
                  Deod Time Set <span>(Hr)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="2.0"
                  value={formData.deod_time_set_hr ?? ''}
                  onChange={e => handleFieldChange('deod_time_set_hr', e.target.value ? Number(e.target.value) : null)}
                  disabled={isSlotDisabled}
                  className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Vacuum Reach */}
              <div>
                <label className="block text-[11px] text-[var(--muted)] mb-1 flex items-center justify-between font-medium">
                  <span>Vacuum Reach <span>(Torr)</span></span>
                  <span className="text-[10px] text-[var(--redt)] font-medium">Band: 1.0 - 4.5</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.vacuum_torr?.toString() || '2.4'}
                    value={formData.vacuum_torr ?? ''}
                    onChange={e => handleFieldChange('vacuum_torr', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className={`w-full bg-[var(--bg)] border rounded-lg px-3 py-2 text-xs font-mono text-[var(--text)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      checkLimit('vacuum_torr', formData.vacuum_torr) === 'soft_warn'
                        ? 'border-[var(--amber)] bg-[rgba(224,160,48,0.12)] text-[var(--amber)]'
                        : checkLimit('vacuum_torr', formData.vacuum_torr) === 'hard_error'
                        ? 'border-[var(--red)] bg-[rgba(216,31,44,0.12)] text-[var(--redt)]'
                        : 'border-[var(--line)] focus:border-[var(--red)]'
                    }`}
                  />
                  {ghostData.vacuum_torr !== undefined && (
                    <span className="absolute right-2.5 top-2 text-[10px] font-mono text-[var(--muted)] pointer-events-none">
                      Prev: {ghostData.vacuum_torr}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Temperature Recorder — Trays 1 to 7 (°C) */}
          <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">
              <div className="flex items-center gap-2">
                <Thermometer className="h-3.5 w-3.5 text-[var(--red)]" />
                <span>SECTION 3: DEODORIZER TEMPERATURE PROFILE — TRAYS 1 TO 7 (°C)</span>
              </div>
              <span className="text-[10px] text-[var(--muted)] font-normal normal-case">TAB to cycle left → right</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map(trayNum => {
                const key = `tray_${trayNum}_temp_c` as keyof ProcessEntry;
                const val = formData[key] as number | undefined | null;
                const ghostVal = ghostData[key] as number | undefined | null;
                const status = checkLimit(key, val);

                return (
                  <div key={trayNum}>
                    <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">
                      Tray {trayNum} <span>°C</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder={ghostVal?.toString() || '250.0'}
                        value={val ?? ''}
                        onChange={e => handleFieldChange(key, e.target.value ? Number(e.target.value) : null)}
                        disabled={isSlotDisabled}
                        className={`w-full bg-[var(--bg)] border rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                          status === 'soft_warn'
                            ? 'border-[var(--amber)] text-[var(--amber)] bg-[rgba(224,160,48,0.12)]'
                            : status === 'hard_error'
                            ? 'border-[var(--red)] text-[var(--redt)] bg-[rgba(216,31,44,0.12)]'
                            : 'border-[var(--line)] focus:border-[var(--red)]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section D: Cooling, Steam Supply & Stripping Steam */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* BC 101 Water Temperatures */}
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text)] mb-3">
                BC 101 CONDENSER (°C)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">Water In</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.bc101_water_in_c?.toString() || '30.0'}
                    value={formData.bc101_water_in_c ?? ''}
                    onChange={e => handleFieldChange('bc101_water_in_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">Water Out</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.bc101_water_out_c?.toString() || '42.0'}
                    value={formData.bc101_water_out_c ?? ''}
                    onChange={e => handleFieldChange('bc101_water_out_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Chilling Water */}
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text)] mb-3">
                CHILLING WATER (°C)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">Water In</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.chill_water_in_c?.toString() || '10.0'}
                    value={formData.chill_water_in_c ?? ''}
                    onChange={e => handleFieldChange('chill_water_in_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">Water Out</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.chill_water_out_c?.toString() || '16.0'}
                    value={formData.chill_water_out_c ?? ''}
                    onChange={e => handleFieldChange('chill_water_out_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Steam Supply Pressures */}
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">
                  STEAM SUPPLY (BAR)
                </span>
                <span className="text-[10px] text-[var(--amber)] font-medium font-mono">
                  Set: {Number(liveTraySteam).toFixed(2)} Bar
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1 truncate" title="Tray Steam Supply (Bar)">
                    Tray Steam
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.tray_steam_supply_bar?.toString() || sheet.set_steam_supply_bar?.toString() || '3.00'}
                    value={formData.tray_steam_supply_bar ?? ''}
                    onChange={e => handleFieldChange('tray_steam_supply_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[rgba(224,160,48,0.5)] focus:border-[var(--amber)] rounded-lg px-2 py-2 text-xs font-mono text-[var(--text)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1 truncate" title="Booster Press (Bar)">
                    Booster
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.booster_press_bar?.toString() || '9.80'}
                    value={formData.booster_press_bar ?? ''}
                    onChange={e => handleFieldChange('booster_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1 truncate" title="Ejector Press (Bar)">
                    Ejector
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.ejector_press_bar?.toString() || '10.00'}
                    value={formData.ejector_press_bar ?? ''}
                    onChange={e => handleFieldChange('ejector_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section E: Stripping Steam & Filtration Pressures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stripping Steam */}
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">
                  STRIPPING STEAM RATIO
                </span>
                <span className="text-[10px] text-[var(--redt)] font-medium font-mono">
                  Set: {Number(liveStrippingSteam).toFixed(2)} %
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">% of Oil Feed</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.strip_steam_pct_of_oil?.toString() || sheet.stripping_steam_pct?.toString() || '1.50'}
                    value={formData.strip_steam_pct_of_oil ?? ''}
                    onChange={e => handleFieldChange('strip_steam_pct_of_oil', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] focus:border-[var(--red)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">Flow (kg/hr)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.strip_steam_flow_kghr?.toString() || '375.0'}
                    value={formData.strip_steam_flow_kghr ?? ''}
                    onChange={e => handleFieldChange('strip_steam_flow_kghr', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Filtration FP 101A/B Pressures */}
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text)] mb-3">
                POLISHING FILTRATION FP-101 (BAR)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">FP 101A Press</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.fp101a_press_bar?.toString() || '2.20'}
                    value={formData.fp101a_press_bar ?? ''}
                    onChange={e => handleFieldChange('fp101a_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1 font-medium">FP 101B Press</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.fp101b_press_bar?.toString() || '2.10'}
                    value={formData.fp101b_press_bar ?? ''}
                    onChange={e => handleFieldChange('fp101b_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-2.5 py-2 text-xs font-mono text-[var(--text)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section F: Remarks & Shift Notes */}
          <div className="row">
            <label htmlFor="remarks">
              Remarks and process deviation notes <span className="hint" style={{ fontWeight: 400 }}>(required for out-of-band readings)</span>
            </label>
            <textarea
              id="remarks"
              rows={3}
              placeholder="Valve adjustments, filter regeneration, feed transitions or equipment states..."
              value={formData.remarks || ''}
              onChange={e => handleFieldChange('remarks', e.target.value)}
              disabled={isSlotDisabled}
              className="rem"
            />
          </div>

          {/* Submit Save Button */}
          <div className="foot">
            <div className="text-[12px] text-[var(--muted)]">
              {isJustSaved ? (
                <span className="flex items-center gap-1.5 text-[var(--green)] font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--green)]" />
                  Hour {selectedSlotLabel} telemetry committed to immutable audit trail!
                </span>
              ) : successMessage ? (
                <span className="flex items-center gap-1.5 text-[var(--green)]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--green)]" />
                  {successMessage}
                </span>
              ) : validationError ? (
                <span className="flex items-center gap-1.5 text-[var(--amber)]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[var(--amber)]" />
                  {validationError}
                </span>
              ) : (
                <span>Committed entries are logged with your credentials and a timestamp.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSlotDisabled || isSaving}
                className="primary"
              >
                {isJustSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-white mr-1.5" />
                    <span>Hour {selectedSlotLabel} Recorded!</span>
                  </>
                ) : isSaving ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin text-white mr-1.5" />
                    <span>Committing Hour {selectedSlotLabel}...</span>
                  </>
                ) : isSlotDisabled ? (
                  <>
                    <Lock className="h-3.5 w-3.5 text-white/70 mr-1.5" />
                    <span>
                      {sheet.status === 'verified'
                        ? 'Sheet Locked (Verified)'
                        : !isLiveShift
                        ? `Historical (${activeShiftDate}) · Read-Only`
                        : isPastSlot
                        ? `Hour ${selectedSlotLabel} Closed`
                        : isFutureSlot
                        ? `Hour ${selectedSlotLabel} Pending`
                        : `Hour ${selectedSlotLabel} Locked`}
                    </span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    <span>Commit Hour {selectedSlotLabel} Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Supervisor Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-[#1F2E43] bg-[#101927] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-green-600 mb-3">
              <FileCheck2 className="h-5 w-5" />
              <h3 className="text-base font-bold text-white font-sans">
                Electronic Signature: Verify Shift Sheet
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-mono">
              Verifying irreversibly locks this 24-hour log against operator edits. Stored in append-only audit trail.
            </p>

            {verifyError && (
              <div className="mb-4 rounded bg-[#EF4444]/15 p-2.5 text-xs text-red-300 border border-[#EF4444]/40 font-mono">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleVerifySheet} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1">
                  Re-enter Supervisor Password (E-Signature):
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={signaturePassword}
                  onChange={e => setSignaturePassword(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-medium text-xs uppercase px-4 py-1.5 rounded transition-all border border-emerald-500 cursor-pointer shadow-xs"
                >
                  Confirm & Sign Lock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Unlock Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-[#1F2E43] bg-[#101927] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="rounded border border-[#F59E0B]/40 bg-[#F59E0B]/15 p-2">
                <Unlock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  Admin Unlock: Process Sheet
                </h3>
                <span className="text-[10px] font-mono text-amber-600 uppercase tracking-wider font-medium">
                  Plant Administrator Override
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-200 mb-4 leading-relaxed bg-amber-950/25 p-3 rounded border border-amber-800/40 font-mono">
              Unlocking this sheet allows authorized revisions to hourly readings. This event is logged with your stated justification.
            </p>

            {unlockError && (
              <div className="mb-4 rounded bg-[#EF4444]/15 p-2.5 text-xs text-red-300 border border-[#EF4444]/40 font-mono">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlockSheet} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1">
                  Correction Justification (Mandatory):
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Correcting Tray 3 temperature reading due to erroneous keyboard input..."
                  value={unlockReason}
                  onChange={e => setUnlockReason(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-500 mb-1">
                  Admin Confirmation Password:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Admin password..."
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  className="w-full bg-[#0A1018] border border-[#1F2E43] rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-[#F59E0B]/150 text-white font-mono font-medium text-xs uppercase px-4 py-1.5 rounded transition-all flex items-center gap-1.5 border border-amber-500 cursor-pointer shadow-xs"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Confirm & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
