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
  getActiveProcessSheet, 
  getProcessSheetByDate,
  getAvailableShiftDates,
  getRealtimeShiftDate,
  saveProcessEntry, 
  copyPreviousHour, 
  verifySheet, 
  unlockSheet,
  getProducts, 
  getParameters,
  getDefaultParametersForProduct,
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
  Info, 
  Gauge, 
  Thermometer, 
  Droplets, 
  ChevronRight, 
  Check, 
  FileCheck2, 
  AlertCircle,
  FlaskConical,
  ShieldCheck
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

  // Strict realtime lock rule:
  // Only the active live window slot on today's live shift date is editable and savable.
  // Past shift sheets, past slots, and future slots are locked in read-only mode to maintain plant operational audit integrity.
  const isSlotDisabled = sheet.status === 'verified' || !isLiveShift || !isLiveSlot;

  // Real-time synchronization of Stripping Steam & Tray Steam Supply with latest operator entries
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
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-400 border border-cyan-800/50">
                RF-FR-004 Rev. 02
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Hourly Deodorizer Process Control Log
              </h1>
              {sheet.status === 'verified' ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="h-3 w-3" /> VERIFIED & LOCKED
                  </span>
                  {role === 'admin' && (
                    <button
                      onClick={() => {
                        setIsUnlockModalOpen(true);
                        setUnlockError(null);
                        setUnlockReason('');
                        setUnlockPassword('');
                      }}
                      className="flex items-center gap-1 text-xs font-mono px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 transition-colors shadow-sm cursor-pointer"
                      title="Unlock this process sheet"
                    >
                      <Unlock className="h-3 w-3 text-amber-400" />
                      <span>Unlock Sheet</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/40">
                  <Clock className="h-3 w-3" /> ACTIVE / OPEN
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Nisshin Deodorizer Plant · Shift runs 07:00 (Today) to 06:00 (Tomorrow)
              {sheet.status === 'verified' && sheet.verified_by_name && (
                <span className="ml-2 text-emerald-400 font-mono">
                  · Verified by: {sheet.verified_by_name}
                </span>
              )}
            </p>
          </div>

          {/* Header Setpoints */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 block text-[10px] font-mono">SHIFT DATE</span>
                {isLiveShift ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-400 text-[10px]">
                    PAST LOG
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <select
                  value={activeShiftDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent text-slate-200 font-semibold font-mono text-xs border-0 focus:ring-0 p-0 cursor-pointer hover:text-cyan-400"
                  title="Select Shift Date to view log"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d} className="bg-slate-900 text-slate-200">
                      {d} {d === getRealtimeShiftDate() ? '(Today · Live)' : ''}
                    </option>
                  ))}
                  {!availableDates.includes(activeShiftDate) && (
                    <option value={activeShiftDate} className="bg-slate-900 text-slate-200">
                      {activeShiftDate} (Custom Date)
                    </option>
                  )}
                </select>

                <input
                  type="date"
                  value={activeShiftDate}
                  onChange={(e) => e.target.value && handleDateChange(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[11px] font-mono focus:border-cyan-500 focus:outline-none cursor-pointer"
                  title="Pick any historical date from calendar"
                />

                {!isLiveShift && (
                  <button
                    type="button"
                    onClick={() => handleDateChange(getRealtimeShiftDate())}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 transition-colors cursor-pointer"
                    title="Return to today's active live shift"
                  >
                    Go Live
                  </button>
                )}
              </div>
            </div>
            <div className="bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 block text-[10px] font-mono">STRIPPING STEAM</span>
                {isStripSteamSynced && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold">
                    SYNC
                  </span>
                )}
              </div>
              <span className="text-cyan-400 font-semibold font-mono">{Number(liveStrippingSteam).toFixed(2)} % of oil</span>
            </div>
            <div className="bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 block text-[10px] font-mono">TRAY STEAM SUPPLY</span>
                {isTraySteamSynced && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60 font-semibold">
                    SYNC
                  </span>
                )}
              </div>
              <span className="text-amber-400 font-semibold font-mono">{Number(liveTraySteam).toFixed(2)} Bar</span>
            </div>

            {/* Supervisor Action Button */}
            {(role === 'supervisor' || role === 'admin') && sheet.status !== 'verified' && (
              <button
                onClick={() => setIsVerifyModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-2 rounded-lg text-xs transition-colors shadow-lg shadow-emerald-950/50"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>Verify & Lock Sheet</span>
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
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium px-3.5 py-2 rounded-lg text-xs transition-colors shadow-lg shadow-amber-950/50"
                title="Unlock process sheet for data corrections by Admin"
              >
                <Unlock className="h-4 w-4" />
                <span>Admin Unlock</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. 24-Hour Time Slot Navigator Strip */}
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                24-Hour Shift Timeline:
              </span>
              {isLiveShift ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  PLANT TIME: {currentTimeStr || '09:00'} MYT · Current Slot: {String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')} ({String(((currentSlotIndex + 7) % 24)).padStart(2, '0')}:00 - {String(((currentSlotIndex + 8) % 24)).padStart(2, '0')}:00)
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold shadow-sm">
                  <span>HISTORICAL SHIFT: {activeShiftDate} (Read-Only)</span>
                  <button
                    type="button"
                    onClick={() => handleDateChange(getRealtimeShiftDate())}
                    className="text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                  >
                    Switch to Live Shift ({getRealtimeShiftDate()})
                  </button>
                </span>
              )}
              {role === 'operator' && isLiveShift && (
                <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Operator Mode: Restricted to current active hour only
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span> Live Current</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400"></span> Recorded</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400"></span> Deviation</span>
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
              const hasDev = entry?.has_deviation;
              const isFilled = Boolean(entry);

              let slotColor = 'border-slate-800 bg-slate-900/60 text-slate-500 hover:border-slate-700';
              if (isLive) {
                if (isFilled) {
                  slotColor = 'border-emerald-400 bg-emerald-950/80 text-emerald-200 font-bold shadow-lg shadow-emerald-950/80 ring-1 ring-emerald-500/50';
                } else {
                  slotColor = 'border-cyan-400 bg-cyan-950/90 text-cyan-200 font-bold shadow-lg shadow-cyan-950/80 ring-1 ring-cyan-500/50';
                }
              } else if (hasDev) {
                slotColor = 'border-amber-500/60 bg-amber-950/40 text-amber-300 font-semibold';
              } else if (isFilled) {
                slotColor = 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300';
              } else if (isPast) {
                slotColor = 'border-slate-800/80 bg-slate-950/60 text-slate-600';
              } else {
                slotColor = 'border-dashed border-slate-800/60 bg-slate-950/30 text-slate-600';
              }

              if (isSelected) {
                slotColor += ' ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#090d16] font-bold text-white';
              }

              // Shift dividers
              const isShiftBoundary = idx === 8 || idx === 16;

              return (
                <button
                  key={idx}
                  onClick={() => loadSlot(idx)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-xs font-mono transition-all relative cursor-pointer ${slotColor} ${
                    isShiftBoundary ? 'mr-1 sm:mr-1.5' : ''
                  }`}
                  title={`Slot ${label} (${label.slice(0, 2)}:00) ${isLive ? (isFilled ? '— Current Active Slot (Recorded & Saved)' : '— Current Active Slot (Editable)') : isPast ? '— Expired (Locked)' : '— Upcoming'}`}
                >
                  <span className="text-[11px]">{label}</span>
                  <div className="mt-0.5 flex items-center justify-center">
                    {isLive ? (
                      isFilled ? (
                        <span className="text-[7.5px] px-1 py-0.2 rounded bg-emerald-400 text-slate-950 font-bold leading-none flex items-center gap-0.5">
                          <Check className="h-2 w-2 stroke-[3]" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-[7.5px] px-1 py-0.2 rounded bg-cyan-400 text-slate-950 font-bold leading-none animate-pulse">
                          LIVE
                        </span>
                      )
                    ) : hasDev ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block animate-ping" />
                    ) : isFilled ? (
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    ) : isPast ? (
                      <Lock className="h-2 w-2 text-slate-600" />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-slate-800 inline-block" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Hourly Data Entry Form Panel */}
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono text-lg font-bold">
              {selectedSlotLabel}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Hourly Readings for {currentSlotTimeStr} hrs</span>
                {isLiveSlot ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan-950/90 px-2.5 py-0.5 text-xs font-mono text-cyan-300 border border-cyan-500/50 shadow-sm animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-cyan-400"></span> LIVE WINDOW ({currentSlotTimeStr} - {nextSlotTimeStr})
                  </span>
                ) : isPastSlot ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/80 px-2.5 py-0.5 text-xs font-mono text-amber-300 border border-amber-500/40">
                    <Lock className="h-3 w-3 text-amber-400" /> EXPIRED (READ-ONLY)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-mono text-slate-400 border border-slate-700/60">
                    <Clock className="h-3 w-3" /> AWAITING SHIFT HOUR
                  </span>
                )}
                {formData.has_deviation && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 px-2 py-0.5 text-xs font-mono text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="h-3 w-3" /> Soft Deviation Logged
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Tab order left-to-right matching RF-FR-004 physical sheet. Faint numbers indicate previous hour readings.
              </p>
            </div>
          </div>

          {/* Quick Ergonomic Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPrevious}
              disabled={selectedSlotIndex === 0 || isSlotDisabled}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all border cursor-pointer disabled:cursor-not-allowed ${
                copiedSlotLabel
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/60'
                  : 'bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
              title={isSlotDisabled ? "This slot is not active for copying" : "Copy readings from previous recorded hour"}
            >
              {copiedSlotLabel ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Copied From Hour {copiedSlotLabel}!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Copy Previous Hour ({String((((selectedSlotIndex - 1 + 24) % 24) + 7) % 24 * 100).padStart(4, '0')})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation & Alert feedback banners */}
        {validationError && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-rose-950/60 p-3.5 text-xs text-rose-300 border border-rose-800/60">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-950/60 p-3.5 text-xs text-emerald-300 border border-emerald-800/60">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Historical Shift Read-Only Notification Banner */}
        {!isLiveShift && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-900/80 p-4 text-xs text-slate-300 border border-slate-700/60 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-800 p-2 border border-slate-700 text-cyan-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-100 text-sm block">
                  Viewing Historical Shift Log ({activeShiftDate}) · Read-Only
                </span>
                <span className="text-slate-400 block mt-0.5">
                  You are viewing past records. Live input and hourly recordings are active on today&apos;s shift sheet ({getRealtimeShiftDate()}).
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDateChange(getRealtimeShiftDate())}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors shrink-0 shadow-md font-mono cursor-pointer"
            >
              Switch to Live Shift
            </button>
          </div>
        )}

        {/* Realtime Window Feedback Banner */}
        {isLiveShift && isPastSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-amber-950/40 p-4 text-xs text-amber-200 border border-amber-800/60 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-950 p-2 border border-amber-600/40 text-amber-400 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-amber-200 text-sm block">
                  Access Closed: Recording Window for Slot {selectedSlotLabel} Has Expired
                </span>
                <p className="text-[11px] text-amber-300/80 mt-1 leading-relaxed">
                  According to refinery realtime operating procedures, slot <strong>{currentSlotTimeStr} – {nextSlotTimeStr}</strong> was closed and locked from further data entry at {nextSlotTimeStr}. 
                  This timeline is now locked in read-only mode to preserve operational audit integrity.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadSlot(currentSlotIndex)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-600/60 hover:bg-cyan-900 text-xs font-mono font-medium transition-all shadow-md cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
              <span>Open Current Active Slot ({String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')})</span>
            </button>
          </div>
        )}

        {isFutureSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-900/90 p-4 text-xs text-slate-300 border border-slate-700/60 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-950 p-2 border border-slate-700 text-cyan-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-slate-200 text-sm block">
                  Awaiting Shift Hour: Slot {selectedSlotLabel} Not Started
                </span>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Log entries for hour <strong>{currentSlotTimeStr}</strong> can only be recorded when the actual plant time reaches {currentSlotTimeStr}. Pre-filling is restricted to ensure instrument data is recorded in real time.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadSlot(currentSlotIndex)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-600/60 hover:bg-cyan-900 text-xs font-mono font-medium transition-all shadow-md cursor-pointer"
            >
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>Open Current Active Slot ({String(((currentSlotIndex + 7) % 24) * 100).padStart(4, '0')})</span>
            </button>
          </div>
        )}

        {isLiveShift && isLiveSlot && sheet.status !== 'verified' && (
          <div className="mb-5 flex items-start sm:items-center justify-between gap-3 rounded-xl bg-cyan-950/40 p-4 text-xs text-cyan-300 border border-cyan-700/60 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-900/50 p-2 border border-cyan-500/40 text-cyan-400 shrink-0">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
                </span>
              </div>
              <div>
                <span className="font-semibold text-cyan-200 text-sm block">
                  REALTIME ACTIVE SLOT: Hour {currentSlotTimeStr} – {nextSlotTimeStr} (Plant Time: {currentTimeStr} MYT)
                </span>
                <p className="text-[11px] text-cyan-300/80 mt-0.5">
                  You are currently within the active entry window. <strong>{currentMinutesRemaining} minutes</strong> remaining before this slot automatically closes at {nextSlotTimeStr}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informative Locked Sheet Banner */}
        {sheet.status === 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-emerald-950/30 p-4 text-xs text-emerald-300 border border-emerald-800/60">
            <div className="flex items-start sm:items-center gap-2.5">
              <Lock className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold text-emerald-200">Shift Sheet Verified & Locked (Locked for Audit Integrity)</span>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  All hourly input fields have been locked from editing. 
                  {sheet.verified_by_name ? ` Verified by ${sheet.verified_by_name}.` : ''} 
                  {role === 'admin' 
                    ? ' As Admin, you have full authority to reopen the lock if data corrections are necessary.'
                    : ' Only the Plant Administrator (Admin) has authority to unlock this sheet.'}
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
                className="shrink-0 flex items-center gap-1.5 bg-amber-600/90 hover:bg-amber-500 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs transition-colors border border-amber-500/40 shadow-sm"
              >
                <Unlock className="h-3.5 w-3.5" />
                <span>Unlock Sheet (Admin)</span>
              </button>
            )}
          </div>
        )}

        {/* Form Inputs Grid */}
        <form onSubmit={handleSaveEntry} className="space-y-6">
          {/* Section A: Product Picker */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1.5 font-mono">
              Type of Oil / Product Specification
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <select
                value={formData.product_id || ''}
                onChange={e => handleProductChange(e.target.value)}
                disabled={isSlotDisabled}
                className="col-span-2 bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500 font-mono">
                Carries forward automatically from previous hour.
              </div>
            </div>
          </div>

          {/* Section A.1: Auto-Dispatch to RF-FR-001 QC Lab (Mandatory Plant SOP · Locked) */}
          <div className="rounded-xl border border-cyan-800/60 bg-gradient-to-r from-[#0b1329]/90 to-[#081b2c]/80 p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-950/90 p-2.5 text-cyan-400 border border-cyan-700/50 shrink-0">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold tracking-wide text-cyan-200 font-mono">
                      Auto-Dispatch to RF-FR-001 QC Lab
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono border bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-medium flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Mandatory Plant SOP · Always Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    System automatically dispatches hourly sample lot directly into RF-FR-001 QC Lab queue as each shift timeline hour activates. Operator override disabled per quality SOP.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] text-cyan-300 font-mono bg-cyan-950/50 px-3 py-1.5 rounded-lg border border-cyan-800/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Synced with Shift Timeline</span>
              </div>
            </div>
          </div>

          {/* Section B: Processing Conditions (Feed Rate, Deod Time, Vacuum) */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <span>Processing Controls (RF-FR-004 Col 2 - 4)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Oil Feed Rate */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Oil Feed Rate <span className="text-slate-500 font-mono">(Litre)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    placeholder={ghostData.oil_feed_rate_litre?.toString() || 'e.g. 25000'}
                    value={formData.oil_feed_rate_litre ?? ''}
                    onChange={e => handleFieldChange('oil_feed_rate_litre', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {ghostData.oil_feed_rate_litre !== undefined && (
                    <span className="absolute right-3 top-2 text-xs font-mono text-slate-600 pointer-events-none">
                      Prev: {ghostData.oil_feed_rate_litre}
                    </span>
                  )}
                </div>
              </div>

              {/* Deod Time Set */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Deod Time Set <span className="text-slate-500 font-mono">(Hr)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="2.0"
                  value={formData.deod_time_set_hr ?? ''}
                  onChange={e => handleFieldChange('deod_time_set_hr', e.target.value ? Number(e.target.value) : null)}
                  disabled={isSlotDisabled}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Vacuum Reach */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center justify-between">
                  <span>Vacuum Reach <span className="text-slate-500 font-mono">(Torr)</span></span>
                  <span className="text-[10px] text-slate-500 font-mono">Soft: 1.0 - 4.5</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.vacuum_torr?.toString() || '2.4'}
                    value={formData.vacuum_torr ?? ''}
                    onChange={e => handleFieldChange('vacuum_torr', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className={`w-full bg-[#090d16] border rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      checkLimit('vacuum_torr', formData.vacuum_torr) === 'soft_warn'
                        ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                        : checkLimit('vacuum_torr', formData.vacuum_torr) === 'hard_error'
                        ? 'border-rose-500 text-rose-300 bg-rose-950/30'
                        : 'border-slate-700 focus:border-cyan-500'
                    }`}
                  />
                  {ghostData.vacuum_torr !== undefined && (
                    <span className="absolute right-3 top-2 text-xs font-mono text-slate-600 pointer-events-none">
                      Prev: {ghostData.vacuum_torr}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Temperature Recorder — Trays 1 to 7 (°C) */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-amber-400" />
                <span>Temperature Recorder — Trays 1 to 7 (°C)</span>
              </div>
              <span className="text-[10px] text-slate-500">Grouped for keypad tab-entry</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map(trayNum => {
                const key = `tray_${trayNum}_temp_c` as keyof ProcessEntry;
                const val = formData[key] as number | undefined | null;
                const ghostVal = ghostData[key] as number | undefined | null;
                const status = checkLimit(key, val);

                return (
                  <div key={trayNum}>
                    <label className="block text-xs text-slate-400 mb-1 font-mono">
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
                        className={`w-full bg-[#090d16] border rounded-lg px-2.5 py-2 text-sm font-mono text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                          status === 'soft_warn'
                            ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                            : status === 'hard_error'
                            ? 'border-rose-500 text-rose-300 bg-rose-950/30'
                            : 'border-slate-700 focus:border-cyan-500'
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
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 font-mono">
                BC 101 Barometric Condenser (°C)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Water In</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.bc101_water_in_c?.toString() || '30.0'}
                    value={formData.bc101_water_in_c ?? ''}
                    onChange={e => handleFieldChange('bc101_water_in_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Water Out</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.bc101_water_out_c?.toString() || '42.0'}
                    value={formData.bc101_water_out_c ?? ''}
                    onChange={e => handleFieldChange('bc101_water_out_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Chilling Water */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 font-mono">
                Chilling Water (°C)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Water In</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.chill_water_in_c?.toString() || '10.0'}
                    value={formData.chill_water_in_c ?? ''}
                    onChange={e => handleFieldChange('chill_water_in_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Water Out</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.chill_water_out_c?.toString() || '16.0'}
                    value={formData.chill_water_out_c ?? ''}
                    onChange={e => handleFieldChange('chill_water_out_c', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Steam Supply Pressures */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  Steam Supply (Bar)
                </span>
                <span className="text-[10px] text-amber-400/90 font-mono">
                  Current: {Number(liveTraySteam).toFixed(2)} Bar
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono truncate" title="Tray Steam Supply (Bar)">
                    Tray Steam
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.tray_steam_supply_bar?.toString() || sheet.set_steam_supply_bar?.toString() || '3.00'}
                    value={formData.tray_steam_supply_bar ?? ''}
                    onChange={e => handleFieldChange('tray_steam_supply_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-amber-500/30 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono truncate" title="Booster Press (Bar)">
                    Booster Press
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.booster_press_bar?.toString() || '9.80'}
                    value={formData.booster_press_bar ?? ''}
                    onChange={e => handleFieldChange('booster_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono truncate" title="Ejector Press (Bar)">
                    Ejector Press
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.ejector_press_bar?.toString() || '10.00'}
                    value={formData.ejector_press_bar ?? ''}
                    onChange={e => handleFieldChange('ejector_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section E: Stripping Steam & Filtration Pressures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stripping Steam */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  Stripping Steam
                </span>
                <span className="text-[10px] text-cyan-400/90 font-mono">
                  Current: {Number(liveStrippingSteam).toFixed(2)} %
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">% of Oil Input</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.strip_steam_pct_of_oil?.toString() || sheet.stripping_steam_pct?.toString() || '1.50'}
                    value={formData.strip_steam_pct_of_oil ?? ''}
                    onChange={e => handleFieldChange('strip_steam_pct_of_oil', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-cyan-500/30 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Flow Rate (kg/hr)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder={ghostData.strip_steam_flow_kghr?.toString() || '375.0'}
                    value={formData.strip_steam_flow_kghr ?? ''}
                    onChange={e => handleFieldChange('strip_steam_flow_kghr', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Filtration FP 101A/B Pressures */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 font-mono">
                Polishing Filtration (Bar)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">FP 101A Pressure</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.fp101a_press_bar?.toString() || '2.20'}
                    value={formData.fp101a_press_bar ?? ''}
                    onChange={e => handleFieldChange('fp101a_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">FP 101B Pressure</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.fp101b_press_bar?.toString() || '2.10'}
                    value={formData.fp101b_press_bar ?? ''}
                    onChange={e => handleFieldChange('fp101b_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={isSlotDisabled}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section F: Remarks & Shift Notes */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              Remarks & Deviation Corrective Notes (Required if soft-band alert triggered)
            </label>
            <textarea
              rows={2}
              placeholder="Record any valve adjustments, filter switchovers, or plant conditions..."
              value={formData.remarks || ''}
              onChange={e => handleFieldChange('remarks', e.target.value)}
              disabled={isSlotDisabled}
              className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Submit Save Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400 font-mono">
              {isJustSaved ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs animate-pulse">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  Hour {selectedSlotLabel} readings recorded successfully in audit trail!
                </span>
              ) : successMessage ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {successMessage}
                </span>
              ) : validationError ? (
                <span className="flex items-center gap-1.5 text-rose-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  {validationError}
                </span>
              ) : (
                <span>Saved entries write to append-only audit trail with operator identity and server timestamp.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSlotDisabled || isSaving}
                className={`flex items-center gap-2 font-medium px-6 py-3 rounded-xl text-sm transition-all shadow-lg font-mono ${
                  isJustSaved
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 cursor-pointer ring-2 ring-emerald-400/50'
                    : isSlotDisabled
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/60 cursor-pointer'
                }`}
              >
                {isJustSaved ? (
                  <>
                    <Check className="h-4 w-4 text-white" />
                    <span>Hour {selectedSlotLabel} Readings Saved!</span>
                  </>
                ) : isSaving ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin text-white" />
                    <span>Saving Hour {selectedSlotLabel}...</span>
                  </>
                ) : isSlotDisabled ? (
                  <>
                    <Lock className="h-4 w-4 text-slate-500" />
                    <span>
                      {sheet.status === 'verified'
                        ? 'Shift Sheet Locked (Verified)'
                        : !isLiveShift
                        ? `Historical Log (${activeShiftDate}) · Read-Only`
                        : isPastSlot
                        ? `Expired: Hour ${selectedSlotLabel} Closed (Read-Only)`
                        : isFutureSlot
                        ? `Awaiting: Hour ${selectedSlotLabel} Not Started`
                        : `Hour ${selectedSlotLabel} Locked (Read-Only)`}
                    </span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Hour {selectedSlotLabel} Readings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Supervisor Verification Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400 mb-4">
              <FileCheck2 className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">
                Electronic Signature: Verify Shift Sheet
              </h3>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Verifying locks this 24-hour sheet against further operator edits. This action is permanently recorded in the immutable audit trail under your supervisor ID.
            </p>

            {verifyError && (
              <div className="mb-4 rounded-lg bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleVerifySheet} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Re-enter Account Password (Electronic Signature):
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={signaturePassword}
                  onChange={e => setSignaturePassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-600/50 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <div className="rounded-lg bg-amber-950/80 p-2 border border-amber-600/30">
                <Unlock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Admin Unlock: Process Sheet
                </h3>
                <span className="text-[11px] font-mono text-amber-400/90">
                  Plant Administrator Authority · RF-FR-004
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              Unlocking this sheet will allow Operators / Supervisors to re-edit hourly readings for this shift. Every unlock event is permanently logged into the immutable <strong className="text-amber-300 font-mono">Audit Trail</strong> along with your stated justification.
            </p>

            {unlockError && (
              <div className="mb-4 rounded-lg bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlockSheet} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Unlock Reason / Correction Justification (Required):
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Correcting Tray 3 temperature reading due to erroneous keyboard input during shift..."
                  value={unlockReason}
                  onChange={e => setUnlockReason(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Admin Confirmation Password (E-Signature):
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Admin password..."
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/50 cursor-pointer"
                >
                  <Unlock className="h-4 w-4" />
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
