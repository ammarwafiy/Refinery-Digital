'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import {
  Layers, Save, Copy, AlertTriangle, CheckCircle2, Clock,
  Thermometer, Gauge, Lock, FileCheck2, ChevronDown, ChevronUp, Info,
} from 'lucide-react'

interface ProcessEntry {
  id?: string
  sheet_id?: string
  slot_index: number
  slot_label?: string
  product_id?: string | null
  oil_feed_rate_litre?: number | null
  deod_time_set_hr?: number | null
  vacuum_torr?: number | null
  tray_1_temp_c?: number | null
  tray_2_temp_c?: number | null
  tray_3_temp_c?: number | null
  tray_4_temp_c?: number | null
  tray_5_temp_c?: number | null
  tray_6_temp_c?: number | null
  tray_7_temp_c?: number | null
  bc101_water_in_c?: number | null
  bc101_water_out_c?: number | null
  chill_water_in_c?: number | null
  chill_water_out_c?: number | null
  booster_press_bar?: number | null
  ejector_press_bar?: number | null
  strip_steam_pct_of_oil?: number | null
  strip_steam_flow_kghr?: number | null
  fp101a_press_bar?: number | null
  fp101b_press_bar?: number | null
  remarks?: string | null
  no_production_reason?: string | null
  has_deviation?: boolean
  recorded_by?: string | null
  recorded_at?: string | null
  [key: string]: unknown
}

interface Product {
  id: string
  code: string
  name: string
}

const SLOT_LABELS = Array.from({ length: 24 }, (_, i) => {
  const h = (i + 7) % 24
  return String(h * 100).padStart(4, '0')
})

const FIELDS = [
  { key: 'oil_feed_rate_litre', label: 'Oil Feed Rate', unit: 'L', group: 'Processing' },
  { key: 'deod_time_set_hr', label: 'Deod Time Set', unit: 'Hr', group: 'Processing' },
  { key: 'vacuum_torr', label: 'Vacuum Reach', unit: 'Torr', group: 'Processing' },
  { key: 'tray_1_temp_c', label: 'Tray 1', unit: '°C', group: 'Trays' },
  { key: 'tray_2_temp_c', label: 'Tray 2', unit: '°C', group: 'Trays' },
  { key: 'tray_3_temp_c', label: 'Tray 3', unit: '°C', group: 'Trays' },
  { key: 'tray_4_temp_c', label: 'Tray 4', unit: '°C', group: 'Trays' },
  { key: 'tray_5_temp_c', label: 'Tray 5', unit: '°C', group: 'Trays' },
  { key: 'tray_6_temp_c', label: 'Tray 6', unit: '°C', group: 'Trays' },
  { key: 'tray_7_temp_c', label: 'Tray 7', unit: '°C', group: 'Trays' },
  { key: 'bc101_water_in_c', label: 'BC101 Water In', unit: '°C', group: 'BC101' },
  { key: 'bc101_water_out_c', label: 'BC101 Water Out', unit: '°C', group: 'BC101' },
  { key: 'chill_water_in_c', label: 'Chill Water In', unit: '°C', group: 'Chilling' },
  { key: 'chill_water_out_c', label: 'Chill Water Out', unit: '°C', group: 'Chilling' },
  { key: 'booster_press_bar', label: 'Booster Pressure', unit: 'Bar', group: 'Steam' },
  { key: 'ejector_press_bar', label: 'Ejector Pressure', unit: 'Bar', group: 'Steam' },
  { key: 'strip_steam_pct_of_oil', label: 'Strip Steam %', unit: '%', group: 'Stripping' },
  { key: 'strip_steam_flow_kghr', label: 'Strip Steam Flow', unit: 'kg/hr', group: 'Stripping' },
  { key: 'fp101a_press_bar', label: 'FP101A Pressure', unit: 'Bar', group: 'Filtration' },
  { key: 'fp101b_press_bar', label: 'FP101B Pressure', unit: 'Bar', group: 'Filtration' },
]

export default function ProcessLogPage() {
  const supabase = createSupabaseBrowser()
  const [sheet, setSheet] = useState<Record<string, unknown> | null>(null)
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedSlot, setSelectedSlot] = useState<number>(-1)
  const [formData, setFormData] = useState<ProcessEntry>({ slot_index: 0 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [headerOpen, setHeaderOpen] = useState(false)
  const [headerSteam, setHeaderSteam] = useState('')
  const [headerBar, setHeaderBar] = useState('')

  const loadData = useCallback(async () => {
    try {
      // Load products
      const { data: prods } = await supabase.from('products').select('id, code, name').eq('active', true).order('sort_order')
      setProducts(prods || [])

      // Load or create today's sheet
      const today = new Date().toISOString().split('T')[0]
      let { data: existingSheet } = await supabase
        .from('process_sheets')
        .select('*')
        .eq('shift_date', today)
        .single()

      if (existingSheet) {
        setSheet(existingSheet)
        setHeaderSteam(String(existingSheet.stripping_steam_pct || ''))
        setHeaderBar(String(existingSheet.set_steam_supply_bar || ''))

        const { data: ents } = await supabase
          .from('process_entries')
          .select('*')
          .eq('sheet_id', existingSheet.id)
          .order('slot_index')

        setEntries((ents as ProcessEntry[]) || [])
      } else {
        setSheet(null)
      }

      // Auto-select current hour slot
      const now = new Date()
      const myt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }))
      const h = myt.getHours()
      const slotIdx = h >= 7 ? h - 7 : h + 17
      setSelectedSlot(slotIdx)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (selectedSlot >= 0) {
      const existing = entries.find(e => e.slot_index === selectedSlot)
      if (existing) {
        setFormData({ ...existing })
      } else {
        setFormData({ slot_index: selectedSlot })
      }
    }
  }, [selectedSlot, entries])

  const createSheet = async () => {
    const steamPct = parseFloat(headerSteam)
    const steamBar = parseFloat(headerBar)
    if (isNaN(steamPct) || isNaN(steamBar)) {
      setMessage({ type: 'error', text: 'Enter valid steam % and steam supply bar values.' })
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: { user } } = await supabase.auth.getUser()

    const { data: newSheet, error } = await supabase
      .from('process_sheets')
      .insert({
        plant_id: '11111111-1111-1111-1111-111111111111',
        shift_date: today,
        stripping_steam_pct: steamPct,
        set_steam_supply_bar: steamBar,
        opened_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    setSheet(newSheet)
    setMessage({ type: 'success', text: 'Process sheet opened for today.' })
  }

  const handleSave = async () => {
    if (!sheet) return
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const existingEntry = entries.find(e => e.slot_index === selectedSlot)

      const slotStart = new Date()
      slotStart.setHours((selectedSlot + 7) % 24, 0, 0, 0)

      const entryData = {
        sheet_id: sheet.id as string,
        slot_index: selectedSlot,
        slot_start: slotStart.toISOString(),
        product_id: formData.product_id || null,
        oil_feed_rate_litre: formData.oil_feed_rate_litre ?? null,
        deod_time_set_hr: formData.deod_time_set_hr ?? null,
        vacuum_torr: formData.vacuum_torr ?? null,
        tray_1_temp_c: formData.tray_1_temp_c ?? null,
        tray_2_temp_c: formData.tray_2_temp_c ?? null,
        tray_3_temp_c: formData.tray_3_temp_c ?? null,
        tray_4_temp_c: formData.tray_4_temp_c ?? null,
        tray_5_temp_c: formData.tray_5_temp_c ?? null,
        tray_6_temp_c: formData.tray_6_temp_c ?? null,
        tray_7_temp_c: formData.tray_7_temp_c ?? null,
        bc101_water_in_c: formData.bc101_water_in_c ?? null,
        bc101_water_out_c: formData.bc101_water_out_c ?? null,
        chill_water_in_c: formData.chill_water_in_c ?? null,
        chill_water_out_c: formData.chill_water_out_c ?? null,
        booster_press_bar: formData.booster_press_bar ?? null,
        ejector_press_bar: formData.ejector_press_bar ?? null,
        strip_steam_pct_of_oil: formData.strip_steam_pct_of_oil ?? null,
        strip_steam_flow_kghr: formData.strip_steam_flow_kghr ?? null,
        fp101a_press_bar: formData.fp101a_press_bar ?? null,
        fp101b_press_bar: formData.fp101b_press_bar ?? null,
        remarks: formData.remarks || null,
        no_production_reason: formData.no_production_reason || null,
        recorded_by: user?.id,
      }

      if (existingEntry?.id) {
        const { error } = await supabase
          .from('process_entries')
          .update(entryData)
          .eq('id', existingEntry.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('process_entries')
          .insert(entryData)

        if (error) throw error
      }

      setMessage({ type: 'success', text: `Slot ${SLOT_LABELS[selectedSlot]} saved successfully.` })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setMessage({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleCopyPrevious = () => {
    if (selectedSlot <= 0) return
    const prev = entries.find(e => e.slot_index === selectedSlot - 1)
    if (!prev) {
      setMessage({ type: 'error', text: 'No previous hour data to copy.' })
      return
    }

    const copied: ProcessEntry = { ...formData }
    FIELDS.forEach(f => {
      if (prev[f.key] !== undefined) {
        (copied as Record<string, unknown>)[f.key] = prev[f.key]
      }
    })
    copied.product_id = prev.product_id
    setFormData(copied)
    setMessage({ type: 'success', text: `Copied readings from ${SLOT_LABELS[selectedSlot - 1]}.` })
  }

  const updateField = (key: string, value: string) => {
    const numVal = value === '' ? null : parseFloat(value)
    setFormData(prev => ({ ...prev, [key]: numVal }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        <Layers className="h-5 w-5 animate-pulse mr-2" /> Loading process log…
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            RF-FR-004 Process Control Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Nisshin Deodorizer Plant — 24-hour shift sheet (0700–0600)
          </p>
        </div>
        {sheet && (
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-lg border font-medium ${
              sheet.status === 'verified'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}>
              {String(sheet.status).toUpperCase()}
            </span>
            <span className="text-slate-500 font-mono">{String(sheet.shift_date)}</span>
          </div>
        )}
      </div>

      {/* Create sheet if none */}
      {!sheet && (
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-3">Open Today&apos;s Process Sheet</h2>
          <p className="text-xs text-slate-400 mb-4">No sheet exists for today. Set the sheet header values to begin.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Stripping Steam (% of oil)</label>
              <input value={headerSteam} onChange={e => setHeaderSteam(e.target.value)}
                type="number" step="0.01" className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 outline-none" placeholder="e.g. 1.50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Set Steam Supply, Trays 1–7 (Bar)</label>
              <input value={headerBar} onChange={e => setHeaderBar(e.target.value)}
                type="number" step="0.01" className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 outline-none" placeholder="e.g. 3.00" />
            </div>
          </div>
          <button onClick={createSheet} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors">
            Open Sheet
          </button>
        </div>
      )}

      {/* Sheet header info */}
      {sheet && (
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl">
          <button onClick={() => setHeaderOpen(!headerOpen)} className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <span className="flex items-center gap-2"><Info className="h-3.5 w-3.5" /> Sheet Header</span>
            {headerOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {headerOpen && (
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-800/40 pt-3">
              <div><span className="text-slate-500">Plant:</span> <span className="text-white ml-1">Nisshin Deod</span></div>
              <div><span className="text-slate-500">Date:</span> <span className="text-white ml-1 font-mono">{String(sheet.shift_date)}</span></div>
              <div><span className="text-slate-500">Strip Steam:</span> <span className="text-cyan-400 ml-1 font-mono">{String(sheet.stripping_steam_pct)}%</span></div>
              <div><span className="text-slate-500">Steam Supply:</span> <span className="text-cyan-400 ml-1 font-mono">{String(sheet.set_steam_supply_bar)} Bar</span></div>
            </div>
          )}
        </div>
      )}

      {sheet && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Slot selector */}
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800/40 text-xs font-semibold text-slate-300">
              <Clock className="h-3.5 w-3.5 inline mr-1.5 text-cyan-400" /> 24-Hour Time Slots
            </div>
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-2 space-y-0.5">
              {SLOT_LABELS.map((label, idx) => {
                const entry = entries.find(e => e.slot_index === idx)
                const isSelected = selectedSlot === idx
                const now = new Date()
                const myt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }))
                const curHour = myt.getHours()
                const slotHour = (idx + 7) % 24
                const isCurrent = slotHour === curHour

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : isCurrent
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/15'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <span className="font-mono font-bold">{label}</span>
                    <div className="flex items-center gap-1.5">
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                      {entry ? (
                        entry.has_deviation ? (
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        )
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-700" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Entry form */}
          <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl">
            <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Gauge className="h-4 w-4 text-cyan-400" />
                Slot {SLOT_LABELS[selectedSlot]} — Entry Form
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyPrevious} disabled={selectedSlot <= 0}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all disabled:opacity-30 disabled:pointer-events-none">
                  <Copy className="h-3.5 w-3.5" /> Copy Prev
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {message && (
                <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                  message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {message.text}
                </div>
              )}

              {/* Product picker */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Type of Oil</label>
                <select
                  value={formData.product_id || ''}
                  onChange={e => setFormData(p => ({ ...p, product_id: e.target.value || null }))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 outline-none"
                >
                  <option value="">— Select product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Field groups */}
              {['Processing', 'Trays', 'BC101', 'Chilling', 'Steam', 'Stripping', 'Filtration'].map(group => {
                const groupFields = FIELDS.filter(f => f.group === group)
                return (
                  <div key={group}>
                    <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">{group}</div>
                    <div className={`grid gap-2 ${group === 'Trays' ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {groupFields.map(field => {
                        const prevEntry = entries.find(e => e.slot_index === selectedSlot - 1)
                        const ghost = prevEntry ? prevEntry[field.key] : undefined
                        return (
                          <div key={field.key}>
                            <label className="text-[11px] text-slate-500 mb-0.5 block truncate">{field.label}</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={((formData as Record<string, any>)[field.key] ?? '') as string | number}
                                onChange={e => updateField(field.key, e.target.value)}
                                placeholder={ghost != null ? String(ghost) : '—'}
                                className="w-full px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm font-mono focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 outline-none placeholder:text-slate-700"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 pointer-events-none">{field.unit}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Remarks */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Remarks</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 outline-none resize-none"
                  placeholder="Required if any reading is outside its soft band"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
              >
                {saving ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : `Save Slot ${SLOT_LABELS[selectedSlot]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
