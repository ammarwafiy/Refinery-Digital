'use client';

import React, { useState, useEffect } from 'react';
import { 
  ProcessSheet, 
  ProcessEntry, 
  Product, 
  UserRole,
  Profile 
} from '@/types/refinery';
import { 
  getActiveProcessSheet, 
  saveProcessEntry, 
  copyPreviousHour, 
  verifySheet, 
  unlockSheet,
  getProducts, 
  getParameterLimits, 
  getCurrentRole 
} from '@/lib/data-service';
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
  AlertCircle
} from 'lucide-react';

interface ProcessLogViewProps {
  currentRole?: UserRole;
  currentUser?: Profile | null;
}

export default function ProcessLogView({ currentRole, currentUser }: ProcessLogViewProps = {}) {
  const [sheet, setSheet] = useState<ProcessSheet>(getActiveProcessSheet());
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(2); // Default to 0900 (has sample data)
  const [role, setRole] = useState<UserRole>(currentRole || currentUser?.role || getCurrentRole());

  // Active entry form state
  const [formData, setFormData] = useState<Partial<ProcessEntry>>({});
  const [ghostData, setGhostData] = useState<Partial<ProcessEntry>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

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

  useEffect(() => {
    setProducts(getProducts());
    setRole(currentRole || currentUser?.role || getCurrentRole());
    refreshSheet();
  }, [currentRole, currentUser]);

  const refreshSheet = () => {
    const s = getActiveProcessSheet();
    setSheet(s);
    loadSlot(selectedSlotIndex, s);
  };

  const loadSlot = (slotIdx: number, activeSheet = sheet) => {
    setSelectedSlotIndex(slotIdx);
    setValidationError(null);
    setSuccessMessage(null);

    const existingEntry = activeSheet.entries?.find(e => e.slot_index === slotIdx);
    const prevEntry = activeSheet.entries?.find(e => e.slot_index === slotIdx - 1);

    if (prevEntry) {
      setGhostData(prevEntry);
    } else {
      setGhostData({});
    }

    if (existingEntry) {
      setFormData({ ...existingEntry });
    } else {
      // Initialize with defaults / carried-over product
      setFormData({
        slot_index: slotIdx,
        product_id: prevEntry?.product_id || products[25]?.id || 'prod-26', // PL 65 Matsuyama
        deod_time_set_hr: 2.0,
        strip_steam_pct_of_oil: activeSheet.stripping_steam_pct,
      });
    }
  };

  const handleFieldChange = (field: keyof ProcessEntry, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
  };

  const handleCopyPrevious = () => {
    if (selectedSlotIndex === 0) {
      setValidationError('Cannot copy for the 0700 first hour of the shift.');
      return;
    }
    const res = copyPreviousHour(selectedSlotIndex);
    if (res.success && res.data) {
      setIsCopying(true);
      setFormData(prev => ({
        ...prev,
        ...res.data,
      }));
      setSuccessMessage('Copied all measured fields from previous hour! Please review and save.');
      setTimeout(() => setIsCopying(false), 800);
    } else {
      setValidationError(res.error || 'Failed to copy previous hour.');
    }
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    const res = saveProcessEntry({
      ...formData,
      slot_index: selectedSlotIndex,
    });

    if (!res.success) {
      setValidationError(res.error || 'Failed to save entry.');
      return;
    }

    setSuccessMessage(`Hour ${res.entry.slot_label} successfully saved!`);
    refreshSheet();
  };

  const handleVerifySheet = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    const res = verifySheet(sheet.id, signaturePassword);
    if (!res.success) {
      setVerifyError(res.error || 'Verification failed.');
      return;
    }

    setIsVerifyModalOpen(false);
    setSignaturePassword('');
    refreshSheet();
  };

  const handleUnlockSheet = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);

    const res = unlockSheet(sheet.id, unlockReason, unlockPassword);
    if (!res.success) {
      setUnlockError(res.error || 'Gagal membuka semula kunci lembaran.');
      return;
    }

    setIsUnlockModalOpen(false);
    setUnlockReason('');
    setUnlockPassword('');
    setSuccessMessage('Kunci lembaran berjaya dibuka semula oleh Admin! Anda kini boleh menyunting semula bacaan jam.');
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
                      title="Buka semula kunci lembaran proses ini"
                    >
                      <Unlock className="h-3 w-3 text-amber-400" />
                      <span>Buka Kunci</span>
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
                  · Disahkan oleh: {sheet.verified_by_name}
                </span>
              )}
            </p>
          </div>

          {/* Header Setpoints */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">SHIFT DATE</span>
              <span className="text-slate-200 font-semibold">{sheet.shift_date}</span>
            </div>
            <div className="bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">STRIPPING STEAM</span>
              <span className="text-cyan-400 font-semibold">{sheet.stripping_steam_pct.toFixed(2)} % of oil</span>
            </div>
            <div className="bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">TRAY STEAM SUPPLY</span>
              <span className="text-amber-400 font-semibold">{sheet.set_steam_supply_bar.toFixed(2)} Bar</span>
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
                title="Buka semula kunci lembaran proses untuk pembetulan bacaan oleh Admin"
              >
                <Unlock className="h-4 w-4" />
                <span>Admin Unlock / Buka Kunci</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. 24-Hour Time Slot Navigator Strip */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              24-Hour Shift Timeline (Select hour slot to view or log readings):
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Green: Recorded · Amber: Deviation · Dashed: Pending
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 lg:grid-cols-24 gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: 24 }).map((_, idx) => {
              const label = String(((idx + 7) % 24) * 100).padStart(4, '0');
              const entry = sheet.entries?.find(e => e.slot_index === idx);
              const isSelected = selectedSlotIndex === idx;
              const hasDev = entry?.has_deviation;
              const isFilled = Boolean(entry);

              let slotColor = 'border-slate-800 bg-slate-900/60 text-slate-500 hover:border-slate-700';
              if (hasDev) {
                slotColor = 'border-amber-500/60 bg-amber-950/40 text-amber-300 font-semibold';
              } else if (isFilled) {
                slotColor = 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300';
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
                  className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-xs font-mono transition-all relative ${slotColor} ${
                    isShiftBoundary ? 'mr-1 sm:mr-1.5' : ''
                  }`}
                >
                  <span className="text-[11px]">{label}</span>
                  <div className="mt-0.5">
                    {hasDev ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block animate-ping" />
                    ) : isFilled ? (
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-slate-700 inline-block" />
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
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Hourly Readings for {currentSlotTimeStr} hrs</span>
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
              disabled={selectedSlotIndex === 0 || sheet.status === 'verified'}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 px-3 py-2 rounded-lg text-xs font-mono transition-all border border-slate-700"
              title="Copy previous hour readings to accelerate input"
            >
              <Copy className="h-3.5 w-3.5 text-cyan-400" />
              <span>Copy Previous Hour ({String((((selectedSlotIndex - 1 + 24) % 24) + 7) % 24 * 100).padStart(4, '0')})</span>
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

        {/* Informative Locked Sheet Banner */}
        {sheet.status === 'verified' && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-emerald-950/30 p-4 text-xs text-emerald-300 border border-emerald-800/60">
            <div className="flex items-start sm:items-center gap-2.5">
              <Lock className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold text-emerald-200">Lembaran Syif Telah Disahkan & Dikunci (Locked for Audit Integrity)</span>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  Semua medan input jam telah dikunci daripada sebarang suntingan. 
                  {sheet.verified_by_name ? ` Disahkan oleh ${sheet.verified_by_name}.` : ''} 
                  {role === 'admin' 
                    ? ' Sebagai Admin, anda mempunyai kuasa penuh untuk membuka semula kunci sekiranya terdapat keperluan pembetulan.'
                    : ' Hanya Pentadbir Loji (Admin) yang mempunyai autoriti untuk membuka semula kunci lembaran ini.'}
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
                <span>Buka Semula Kunci (Admin)</span>
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
                onChange={e => handleFieldChange('product_id', e.target.value)}
                disabled={sheet.status === 'verified'}
                className="col-span-2 bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500 font-mono">
                Carries forward automatically from previous hour.
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
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
                  disabled={sheet.status === 'verified'}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
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
                    disabled={sheet.status === 'verified'}
                    className={`w-full bg-[#090d16] border rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none disabled:opacity-50 ${
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
                        disabled={sheet.status === 'verified'}
                        className={`w-full bg-[#090d16] border rounded-lg px-2.5 py-2 text-sm font-mono text-white focus:outline-none disabled:opacity-50 ${
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Steam Supply Pressures */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 font-mono">
                Steam Supply (Bar)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Booster Press</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.booster_press_bar?.toString() || '9.80'}
                    value={formData.booster_press_bar ?? ''}
                    onChange={e => handleFieldChange('booster_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">Ejector Press</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={ghostData.ejector_press_bar?.toString() || '10.00'}
                    value={formData.ejector_press_bar ?? ''}
                    onChange={e => handleFieldChange('ejector_press_bar', e.target.value ? Number(e.target.value) : null)}
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section E: Stripping Steam & Filtration Pressures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stripping Steam */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 font-mono">
                Stripping Steam
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono">% of Oil Input</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1.50"
                    value={formData.strip_steam_pct_of_oil ?? ''}
                    onChange={e => handleFieldChange('strip_steam_pct_of_oil', e.target.value ? Number(e.target.value) : null)}
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
                    disabled={sheet.status === 'verified'}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
              disabled={sheet.status === 'verified'}
              className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Submit Save Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-500 font-mono">
              Saved entries write to append-only audit trail with operator identity and server timestamp.
            </div>

            <button
              type="submit"
              disabled={sheet.status === 'verified'}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-medium px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-950/60 font-mono cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save Hour {selectedSlotLabel} Readings</span>
            </button>
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
                  Admin Unlock: Buka Kunci Lembaran
                </h3>
                <span className="text-[11px] font-mono text-amber-400/90">
                  Kuasa Khas Pentadbir Loji · RF-FR-004
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              Membuka semula kunci lembaran ini akan membolehkan Operator / Penyelia menyunting semula bacaan jam bagi syif ini. Setiap tindakan pembukaan kunci akan direkodkan ke dalam <strong className="text-amber-300 font-mono">Audit Trail</strong> kekal bersama alasan anda.
            </p>

            {unlockError && (
              <div className="mb-4 rounded-lg bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlockSheet} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Sebab Pembukaan Kunci / Justifikasi Pembetulan (Wajib):
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Pembetulan bacaan suhu Tray 3 disebabkan salah input semasa syif..."
                  value={unlockReason}
                  onChange={e => setUnlockReason(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Kata Laluan Pengesahan Admin (E-Signature):
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan kata laluan Admin..."
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/50"
                >
                  <Unlock className="h-4 w-4" />
                  <span>Sahkan & Buka Kunci</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
