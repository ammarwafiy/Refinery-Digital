'use client';

import React, { useState, useEffect } from 'react';
import { 
  ProcessSheet, 
  ProcessEntry, 
  Product, 
  UserRole,
  Profile,
  Parameter
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
  ensureAutoDispatchedQC
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

      // Proactively auto-dispatch QC sample lot to RF-FR-001 QC Lab for the active timeline hour
      ensureAutoDispatchedQC(slot, realtimeDate);

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
    if (isLiveShift && selectedSlotIndex === currentSlotIndex) {
      ensureAutoDispatchedQC(selectedSlotIndex, activeShiftDate, newProdId);
    }
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
  const isSlotDisabled = sheet.status === 'verified' || !isLiveShift || !isLiveSlot;

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

  return (
    <div className="space-y-6">
      {/* 1. Sheet Header Banner (RF-FR-004 Rev. 02) */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blue-600">
                RF-FR-004 REV. 02
              </span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans">
                Hourly Deodorizer Process Control Log
              </h1>
              {sheet.status === 'verified' ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> VERIFIED & LOCKED
                  </span>
                  {role === 'admin' && (
                    <button
                      onClick={() => {
                        setIsUnlockModalOpen(true);
                        setUnlockError(null);
                        setUnlockReason('');
                        setUnlockPassword('');
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-300 hover:bg-amber-900/40 transition-colors cursor-pointer font-medium"
                      title="Unlock this process sheet"
                    >
                      <Unlock className="h-3 w-3 text-amber-600" />
                      <span>UNLOCK SHEET</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded border border-blue-500/40 bg-blue-600/10 text-blue-600 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span> ACTIVE LOGGING
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400 font-mono">
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">UNIT:</span> UNIT-DEOD-01 · <span className="text-slate-500 uppercase tracking-wider text-[10px]">CYCLE:</span> 07:00 (Start) → 06:00 (Next Day)
              {sheet.status === 'verified' && sheet.verified_by_name && (
                <span className="ml-2 text-green-600 font-medium">
                  · Verified by: {sheet.verified_by_name}
                </span>
              )}
            </p>
          </div>

          {/* Header Setpoints */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            {/* Shift Date Selector */}
            <div className="bg-slate-50 px-3 py-2 rounded border border-slate-200 min-w-[190px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">LOG DATE</span>
                {isLiveShift ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded border border-green-200 bg-green-50 text-green-600 text-[9px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded border border-amber-200 bg-amber-50 text-amber-600 text-[9px] font-medium">
                    ARCHIVED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={activeShiftDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium font-mono text-xs border-0 focus:ring-0 p-0 cursor-pointer hover:text-blue-600"
                  title="Select Shift Date to view log"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d} className="bg-slate-50 text-slate-800">
                      {d} {d === getRealtimeShiftDate() ? '(Today · Live)' : ''}
                    </option>
                  ))}
                  {!availableDates.includes(activeShiftDate) && (
                    <option value={activeShiftDate} className="bg-slate-50 text-slate-800">
                      {activeShiftDate} (Custom)
                    </option>
                  )}
                </select>

                <input
                  type="date"
                  value={activeShiftDate}
                  onChange={(e) => e.target.value && handleDateChange(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 text-[10px] font-mono focus:border-blue-500 focus:outline-none cursor-pointer"
                  title="Pick historical date"
                />

                {!isLiveShift && (
                  <button
                    type="button"
                    onClick={() => handleDateChange(getRealtimeShiftDate())}
                    className="text-[9px] font-mono font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-500/40 bg-blue-600/15 hover:bg-blue-600/25 text-blue-700 transition-colors cursor-pointer"
                    title="Return to today's active live shift"
                  >
                    Go Live
                  </button>
                )}
              </div>
            </div>

            {/* Stripping Steam Setpoint Tile */}
            <div className="bg-slate-50 px-3 py-2 rounded border border-slate-200 flex flex-col justify-center min-w-[130px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">STRIPPING STEAM</span>
                {isStripSteamSynced && (
                  <span className="text-[8px] font-mono px-1 rounded border border-blue-500/40 bg-blue-600/15 text-blue-600 font-medium">
                    SYNC
                  </span>
                )}
              </div>
              <span className="text-slate-900 font-semibold font-mono text-xs mt-0.5">
                {Number(liveStrippingSteam).toFixed(2)} <span className="text-slate-400 font-normal">% oil</span>
              </span>
            </div>

            {/* Tray Steam Supply Tile */}
            <div className="bg-slate-50 px-3 py-2 rounded border border-slate-200 flex flex-col justify-center min-w-[130px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">TRAY STEAM</span>
                {isTraySteamSynced && (
                  <span className="text-[8px] font-mono px-1 rounded border border-amber-200 bg-amber-50 text-amber-600 font-medium">
                    SYNC
                  </span>
                )}
              </div>
              <span className="text-slate-900 font-semibold font-mono text-xs mt-0.5">
                {Number(liveTraySteam).toFixed(2)} <span className="text-slate-400 font-normal">Bar</span>
              </span>
            </div>

            {/* Supervisor Action Button */}
            {(role === 'supervisor' || role === 'admin') && sheet.status !== 'verified' && (
              <button
                onClick={() => setIsVerifyModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-medium text-xs uppercase tracking-wider px-3.5 py-2 rounded transition-all border border-emerald-500 shadow-sm cursor-pointer"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>Verify Shift</span>
              </button>
            )}

            {/* Admin Unlock Action Button */}
            {role === 'admin' && sheet.status === 'verified' && (
              <button
                onClick={() => {
                  setIsUnlockModalOpen(true);
                  setUnlockError(null);
                  setUnlockReason('');
                  setUnlockPassword('');
                }}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-mono font-medium text-xs uppercase tracking-wider px-3.5 py-2 rounded transition-all border border-amber-500 shadow-sm cursor-pointer"
                title="Unlock process sheet for corrections"
              >
                <Unlock className="h-3.5 w-3.5" />
                <span>Admin Unlock</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. 24-Hour Time Slot Navigator Strip */}
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                24-HOUR TIMELINE RIBBON:
              </span>
              {isLiveShift ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  PLANT: {currentTimeStr || '09:00'} MYT · Slot {String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')} ({String(((currentSlotIndex + 7) % 24)).padStart(2, '0')}:00 - {String(((currentSlotIndex + 8) % 24)).padStart(2, '0')}:00)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-600 text-[11px] font-mono">
                  <span>HISTORICAL: {activeShiftDate} (AUDIT VIEW)</span>
                  <button
                    type="button"
                    onClick={() => handleDateChange(getRealtimeShiftDate())}
                    className="text-blue-600 hover:text-blue-700 underline cursor-pointer ml-1 font-medium"
                  >
                    Switch to Live
                  </button>
                </span>
              )}
              {role === 'operator' && isLiveShift && (
                <span className="text-[9px] font-mono text-blue-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  Operator Lock: Restricted to active live slot
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span> Live</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#10b981]"></span> Recorded</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]"></span> Deviation</span>
              <span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5 text-slate-500" /> Locked</span>
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-24 gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: 24 }).map((_, idx) => {
              const label = String(((idx + 7) % 24) * 100).padStart(4, '0');
              const entry = sheet.entries?.find(e => e.slot_index === idx);
              const isSelected = selectedSlotIndex === idx;
              const isLive = isLiveShift && idx === currentSlotIndex;
              const isPast = isLiveShift ? idx < currentSlotIndex : true;
              const isFuture = isLiveShift ? idx > currentSlotIndex : false;
              const hasDev = Boolean(entry?.has_deviation);
              const isFilled = Boolean(entry && (entry.recorded_by || entry.product_id || entry.vacuum_torr != null || entry.oil_feed_rate_litre != null || entry.no_production_reason != null));

              let slotColor = 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-800';
              if (isLive) {
                if (isFilled) {
                  slotColor = 'border-emerald-500/70 bg-green-50 text-emerald-300 font-medium shadow-[0_0_8px_rgba(16,185,129,0.3)]';
                } else {
                  slotColor = 'border-blue-600 bg-blue-600/15 text-blue-700 font-semibold shadow-[0_0_12px_rgba(0,159,227,0.35)]';
                }
              } else if (isFuture) {
                slotColor = 'border-dashed border-slate-200/60 bg-white text-slate-500';
              } else if (hasDev) {
                slotColor = 'border-amber-600/70 bg-amber-50 text-amber-300 font-medium';
              } else if (isFilled) {
                slotColor = 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-50';
              } else if (isPast) {
                slotColor = 'border-slate-200/60 bg-white text-slate-500';
              } else {
                slotColor = 'border-dashed border-slate-200/60 bg-white text-slate-500';
              }

              if (isSelected) {
                slotColor = 'border-2 border-blue-600 bg-blue-600 text-white font-bold shadow-sm ring-2 ring-blue-300';
              }

              const isShiftBoundary = idx === 8 || idx === 16;

              return (
                <button
                  key={idx}
                  onClick={() => loadSlot(idx)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded border text-xs font-mono transition-colors relative cursor-pointer ${slotColor} ${
                    isShiftBoundary ? 'mr-1 sm:mr-1.5' : ''
                  }`}
                  title={`Slot ${label} (${label.slice(0, 2)}:00)`}
                >
                  <span className="text-[11px] font-mono tracking-tight">{label}</span>
                  <div className="mt-0.5 flex items-center justify-center">
                    {isLive ? (
                      isFilled ? (
                        <span className={`text-[7.5px] px-1 py-0.2 rounded font-medium leading-none flex items-center gap-0.5 ${isSelected ? 'bg-white text-slate-900' : 'bg-emerald-600 text-white'}`}>
                          <Check className="h-2 w-2 stroke-[3]" />
                          LIVE
                        </span>
                      ) : (
                        <span className={`text-[7.5px] px-1 py-0.2 rounded font-medium leading-none animate-pulse ${isSelected ? 'bg-white text-slate-900' : 'bg-blue-600 text-white'}`}>
                          LIVE
                        </span>
                      )
                    ) : isFuture ? (
                      <span className={`h-1 w-1 rounded-full inline-block ${isSelected ? 'bg-white' : 'bg-slate-600'}`} />
                    ) : hasDev ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                    ) : isFilled ? (
                      <Check className={`h-2.5 w-2.5 ${isSelected ? 'text-white' : 'text-green-600'}`} />
                    ) : isPast ? (
                      <Lock className={`h-2 w-2 ${isSelected ? 'text-slate-800' : 'text-slate-500'}`} />
                    ) : (
                      <span className={`h-1 w-1 rounded-full inline-block ${isSelected ? 'bg-white' : 'bg-slate-600'}`} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Hourly Data Entry Form Panel */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.03)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-14 items-center justify-center rounded border border-slate-200 bg-slate-50 text-blue-600 font-mono text-lg font-bold tracking-tight shadow-inner">
              {selectedSlotLabel}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap font-sans">
                <span>Hourly Readings for {currentSlotTimeStr} hrs</span>
                {isLiveSlot ? (
                  <span className="inline-flex items-center gap-1.5 rounded border border-blue-500/40 bg-blue-600/10 px-2 py-0.5 text-[11px] font-mono text-blue-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span> LIVE WINDOW ({currentSlotTimeStr} - {nextSlotTimeStr})
                  </span>
                ) : isPastSlot ? (
                  <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-400">
                    <Lock className="h-3 w-3 text-slate-500" /> CLOSED (READ-ONLY)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-400">
                    <Clock className="h-3 w-3 text-slate-500" /> AWAITING SHIFT HOUR
                  </span>
                )}
                {formData.has_deviation && (
                  <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-mono text-amber-300">
                    <AlertTriangle className="h-3 w-3 text-amber-600" /> Soft Deviation
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Layout sequence aligns strictly with paper form RF-FR-004. Ghost numbers indicate previous hour readings.
              </p>
            </div>
          </div>

          {/* Quick Ergonomic Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrevious}
              disabled={selectedSlotIndex === 0 || isSlotDisabled}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono font-medium transition-colors border cursor-pointer disabled:cursor-not-allowed ${
                copiedSlotLabel
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-50 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
              title={isSlotDisabled ? "Slot locked from copying" : "Copy readings from previous recorded hour"}
            >
              {copiedSlotLabel ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Copied From Hour {copiedSlotLabel}!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-blue-600" />
                  <span>Copy Prev Hour ({String((((selectedSlotIndex - 1 + 24) % 24) + 7) % 24 * 100).padStart(4, '0')})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation & Alert feedback banners */}
        {validationError && (
          <div className="mb-5 flex items-center gap-2.5 rounded bg-red-50 p-3.5 text-xs text-red-300 border border-red-200 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded bg-green-50 p-3.5 text-xs text-emerald-300 border border-green-200 font-mono">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Historical Shift Read-Only Notification Banner */}
        {!isLiveShift && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-slate-50 p-3.5 text-xs text-slate-500 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="rounded border border-slate-200 bg-white p-2 text-blue-600 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-900 text-xs block font-mono">
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
              className="bg-blue-600 hover:bg-blue-500 text-white font-mono font-medium text-xs uppercase px-3 py-1.5 rounded transition-all shrink-0 border border-blue-500 cursor-pointer"
            >
              Switch to Live Shift
            </button>
          </div>
        )}

        {/* Realtime Window Feedback Banner */}
        {isLiveShift && isPastSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-amber-950/25 p-3.5 text-xs text-amber-200 border border-amber-800/40">
            <div className="flex items-start gap-3">
              <div className="rounded border border-amber-200 bg-white p-2 text-amber-600 shrink-0">
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
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span>Go to Active Slot ({String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')})</span>
            </button>
          </div>
        )}

        {isFutureSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-slate-50 p-3.5 text-xs text-slate-500 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="rounded border border-slate-200 bg-white p-2 text-blue-600 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-slate-900 text-xs block font-mono">
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
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-white text-slate-800 border border-slate-200 hover:bg-slate-100 text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span>Go to Active Slot ({String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')})</span>
            </button>
          </div>
        )}

        {isLiveShift && isLiveSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex items-start sm:items-center justify-between gap-3 rounded bg-blue-600/10 p-3.5 text-xs text-sky-200 border border-blue-500/30">
            <div className="flex items-center gap-3">
              <div className="rounded border border-blue-500/40 bg-white p-2 text-blue-600 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
              </div>
              <div>
                <span className="font-semibold text-white text-xs block font-mono">
                  LIVE LOGGING WINDOW: Slot {currentSlotTimeStr} – {nextSlotTimeStr} (Plant: {currentTimeStr} MYT)
                </span>
                <p className="text-[11px] text-sky-300 mt-0.5 font-mono">
                  Active window has <strong>{currentMinutesRemaining} min</strong> before auto-closing at {nextSlotTimeStr}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informative Locked Sheet Banner */}
        {sheet.status === 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded bg-green-50 p-3.5 text-xs text-emerald-200 border border-green-200">
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
                className="shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-mono font-medium text-xs uppercase px-3 py-1.5 rounded transition-all border border-amber-500 cursor-pointer shadow-xs"
              >
                <Unlock className="h-3 w-3" />
                <span>Admin Unlock</span>
              </button>
            )}
          </div>
        )}

        {/* Form Inputs Grid */}
        <form onSubmit={handleSaveEntry} className="space-y-5">
          {/* Section A: Product Picker */}
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
              SECTION 1: PRODUCT SPECIFICATION & OIL TYPE
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <select
                value={formData.product_id || ''}
                onChange={e => handleProductChange(e.target.value)}
                disabled={isSlotDisabled}
                className="col-span-2 bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-50 text-slate-900">
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-400 font-mono">
                Auto-carried from previous hour if unchanged.
              </div>
            </div>
          </div>

          {/* Section A.1: Auto-Dispatch to RF-FR-001 QC Lab (Mandatory Plant SOP · Locked) */}
          <div className="rounded border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded border border-slate-200 bg-white p-2 text-blue-600 shrink-0">
                  <FlaskConical className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tracking-tight text-white font-mono">
                      AUTO-DISPATCH SAMPLE LOT → RF-FR-001 QC LAB
                    </span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono border border-green-200 bg-green-50 text-green-600 font-medium flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      MANDATORY SOP · ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Sample lot auto-routed to QC Lab queue upon hour activation. Operator override locked per plant QA manual.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto text-[10px] text-slate-500 font-mono bg-white px-2.5 py-1 rounded border border-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span>SYNCED WITH SHIFT TIMELINE</span>
              </div>
            </div>
          </div>

          {/* Section B: Processing Conditions (Feed Rate, Deod Time, Vacuum) */}
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              <Gauge className="h-3.5 w-3.5 text-blue-600" />
              <span>SECTION 2: PROCESSING CONTROLS (RF-FR-004 COL 2 - 4)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Oil Feed Rate */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-mono">
                  Oil Feed Rate <span className="text-slate-500">(Litre)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    placeholder={ghostData.oil_feed_rate_litre?.toString() || 'e.g. 25000'}
                    value={formData.oil_feed_rate_litre ?? ''}
                    onChange={e => handleFieldChange('oil_feed_rate_litre', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                  {ghostData.oil_feed_rate_litre !== undefined && (
                    <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                      Prev: {ghostData.oil_feed_rate_litre}
                    </span>
                  )}
                </div>
              </div>

              {/* Deod Time Set */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 font-mono">
                  Deod Time Set <span className="text-slate-500">(Hr)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="2.0"
                  value={formData.deod_time_set_hr ?? ''}
                  onChange={e => handleFieldChange('deod_time_set_hr', e.target.value ? Number(e.target.value) : null)}
                  disabled={isSlotDisabled}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                />
              </div>

              {/* Vacuum Reach */}
              <div>
                <label className="block text-[11px] text-slate-500 mb-1 flex items-center justify-between font-mono">
                  <span>Vacuum Reach <span className="text-slate-500">(Torr)</span></span>
                  <span className="text-[10px] text-blue-600 font-medium">Band: 1.0 - 4.5</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.vacuum_torr?.toString() || '2.4'}
                    value={formData.vacuum_torr ?? ''}
                    onChange={e => handleFieldChange('vacuum_torr', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className={`w-full bg-white border rounded px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed ${
                      checkLimit('vacuum_torr', formData.vacuum_torr) === 'soft_warn'
                        ? 'border-amber-500/70 bg-amber-50 text-amber-200'
                        : checkLimit('vacuum_torr', formData.vacuum_torr) === 'hard_error'
                        ? 'border-red-500/70 bg-red-50 text-red-200'
                        : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {ghostData.vacuum_torr !== undefined && (
                    <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                      Prev: {ghostData.vacuum_torr}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Temperature Recorder — Trays 1 to 7 (°C) */}
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <Thermometer className="h-3.5 w-3.5 text-blue-600" />
                <span>SECTION 3: DEODORIZER TEMPERATURE PROFILE — TRAYS 1 TO 7 (°C)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">TAB to cycle left → right</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map(trayNum => {
                const key = `tray_${trayNum}_temp_c` as keyof ProcessEntry;
                const val = formData[key] as number | undefined | null;
                const ghostVal = ghostData[key] as number | undefined | null;
                const status = checkLimit(key, val);

                return (
                  <div key={trayNum}>
                    <label className="block text-[11px] text-slate-500 mb-1 font-mono">
                      Tray {trayNum} <span className="text-[10px] text-slate-500">°C</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder={ghostVal?.toString() || '250.0'}
                        value={val ?? ''}
                        onChange={e => handleFieldChange(key, e.target.value ? Number(e.target.value) : null)}
                        disabled={isSlotDisabled}
                        className={`w-full bg-white border rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed ${
                          status === 'soft_warn'
                            ? 'border-amber-500/70 text-amber-200 bg-amber-50'
                            : status === 'hard_error'
                            ? 'border-red-500/70 text-red-200 bg-red-50'
                            : 'border-slate-200 focus:border-blue-500'
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
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 font-mono">
                BC 101 CONDENSER (°C)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">Water In</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.bc101_water_in_c?.toString() || '30.0'}
                    value={formData.bc101_water_in_c ?? ''}
                    onChange={e => handleFieldChange('bc101_water_in_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">Water Out</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.bc101_water_out_c?.toString() || '42.0'}
                    value={formData.bc101_water_out_c ?? ''}
                    onChange={e => handleFieldChange('bc101_water_out_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Chilling Water */}
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 font-mono">
                CHILLING WATER (°C)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">Water In</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.chill_water_in_c?.toString() || '10.0'}
                    value={formData.chill_water_in_c ?? ''}
                    onChange={e => handleFieldChange('chill_water_in_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">Water Out</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.chill_water_out_c?.toString() || '16.0'}
                    value={formData.chill_water_out_c ?? ''}
                    onChange={e => handleFieldChange('chill_water_out_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Steam Supply Pressures */}
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  STEAM SUPPLY (BAR)
                </span>
                <span className="text-[10px] text-amber-600 font-medium font-mono">
                  Set: {Number(liveTraySteam).toFixed(2)} Bar
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-mono truncate" title="Tray Steam Supply (Bar)">
                    Tray Steam
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.tray_steam_supply_bar?.toString() || sheet.set_steam_supply_bar?.toString() || '3.00'}
                    value={formData.tray_steam_supply_bar ?? ''}
                    onChange={e => handleFieldChange('tray_steam_supply_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-amber-700/60 focus:border-amber-500 rounded px-2 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-mono truncate" title="Booster Press (Bar)">
                    Booster
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.booster_press_bar?.toString() || '9.80'}
                    value={formData.booster_press_bar ?? ''}
                    onChange={e => handleFieldChange('booster_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-mono truncate" title="Ejector Press (Bar)">
                    Ejector
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.ejector_press_bar?.toString() || '10.00'}
                    value={formData.ejector_press_bar ?? ''}
                    onChange={e => handleFieldChange('ejector_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section E: Stripping Steam & Filtration Pressures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stripping Steam */}
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  STRIPPING STEAM RATIO
                </span>
                <span className="text-[10px] text-blue-600 font-medium font-mono">
                  Set: {Number(liveStrippingSteam).toFixed(2)} %
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">% of Oil Feed</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.strip_steam_pct_of_oil?.toString() || sheet.stripping_steam_pct?.toString() || '1.50'}
                    value={formData.strip_steam_pct_of_oil ?? ''}
                    onChange={e => handleFieldChange('strip_steam_pct_of_oil', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">Flow (kg/hr)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.strip_steam_flow_kghr?.toString() || '375.0'}
                    value={formData.strip_steam_flow_kghr ?? ''}
                    onChange={e => handleFieldChange('strip_steam_flow_kghr', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Filtration FP 101A/B Pressures */}
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 font-mono">
                POLISHING FILTRATION FP-101 (BAR)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">FP 101A Press</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.fp101a_press_bar?.toString() || '2.20'}
                    value={formData.fp101a_press_bar ?? ''}
                    onChange={e => handleFieldChange('fp101a_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-mono">FP 101B Press</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.fp101b_press_bar?.toString() || '2.10'}
                    value={formData.fp101b_press_bar ?? ''}
                    onChange={e => handleFieldChange('fp101b_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section F: Remarks & Shift Notes */}
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
              REMARKS & PROCESS DEVIATION NOTES (MANDATORY IF OUT-OF-BAND EVENT)
            </label>
            <textarea
              rows={2}
              placeholder="Record valve adjustments, filter regeneration, feed transitions, or plant equipment states..."
              value={formData.remarks || ''}
              onChange={e => handleFieldChange('remarks', e.target.value)}
              disabled={isSlotDisabled}
              className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-white disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Submit Save Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
            <div className="text-[11px] text-slate-400 font-mono">
              {isJustSaved ? (
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  Hour {selectedSlotLabel} telemetry committed to immutable audit trail!
                </span>
              ) : successMessage ? (
                <span className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  {successMessage}
                </span>
              ) : validationError ? (
                <span className="flex items-center gap-1.5 text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  {validationError}
                </span>
              ) : (
                <span>All committed entries logged with operator credentials and cryptographic timestamp.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSlotDisabled || isSaving}
                className={`flex items-center gap-2 font-mono font-medium text-xs uppercase tracking-wider px-6 py-2.5 rounded transition-all border ${
                  isJustSaved
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer'
                    : isSlotDisabled
                    ? 'bg-white text-slate-500 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 cursor-pointer shadow-xs'
                }`}
              >
                {isJustSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />
                    <span>Hour {selectedSlotLabel} Recorded!</span>
                  </>
                ) : isSaving ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin text-white" />
                    <span>Committing Hour {selectedSlotLabel}...</span>
                  </>
                ) : isSlotDisabled ? (
                  <>
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
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
                    <Save className="h-3.5 w-3.5" />
                    <span>Commit Hour {selectedSlotLabel} Log</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Supervisor Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
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
              <div className="mb-4 rounded bg-red-50 p-2.5 text-xs text-red-300 border border-red-200 font-mono">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-800 cursor-pointer"
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
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="rounded border border-amber-200 bg-amber-50 p-2">
                <Unlock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  Admin Unlock: Process Sheet
                </h3>
                <span className="text-[10px] font-mono text-amber-600 uppercase tracking-wider font-medium">
                  Plant Administrator Override · RF-FR-004
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-200 mb-4 leading-relaxed bg-amber-950/25 p-3 rounded border border-amber-800/40 font-mono">
              Unlocking this sheet allows authorized revisions to hourly readings. This event is logged with your stated justification.
            </p>

            {unlockError && (
              <div className="mb-4 rounded bg-red-50 p-2.5 text-xs text-red-300 border border-red-200 font-mono">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-mono font-medium text-xs uppercase px-4 py-1.5 rounded transition-all flex items-center gap-1.5 border border-amber-500 cursor-pointer shadow-xs"
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
