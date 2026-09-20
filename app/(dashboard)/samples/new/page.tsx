'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { FlaskConical, Save, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewSampleReportPage() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [products, setProducts] = useState<Record<string, unknown>[]>([])
  const [tanks, setTanks] = useState<Record<string, unknown>[]>([])
  const [samplingPoints, setSamplingPoints] = useState<Record<string, unknown>[]>([])
  const [parameters, setParameters] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    sample_date: new Date().toISOString().split('T')[0],
    time_check: new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' }),
    lot_no: '',
    product_id: '',
    product_other: '',
    feed_tank_id: '',
    discharge_tank_id: '',
    crystallizer_no: '',
    batch_no: '',
    sampling_point_id: '',
    remark_flushing: false,
    remark_cooling: false,
    remark_pushover: false,
    remarks: '',
    selected_params: [] as string[],
  })

  useEffect(() => {
    const load = async () => {
      const [prodRes, tankRes, spRes, paramRes] = await Promise.all([
        supabase.from('products').select('id, code, name').eq('active', true).order('sort_order'),
        supabase.from('tanks').select('id, code, kind').eq('active', true),
        supabase.from('sampling_points').select('id, name').eq('active', true),
        supabase.from('parameters').select('*').order('sort_order'),
      ])
      setProducts(prodRes.data || [])
      setTanks(tankRes.data || [])
      setSamplingPoints(spRes.data || [])
      setParameters(paramRes.data || [])
    }
    load()
  }, [supabase])

  const handleSubmit = async () => {
    if (!form.lot_no) { setMessage({ type: 'error', text: 'Lot number is required.' }); return }
    if (!form.product_id && !form.product_other) { setMessage({ type: 'error', text: 'Select a product or enter "Others".' }); return }
    if (form.selected_params.length === 0) { setMessage({ type: 'error', text: 'Select at least one parameter for testing.' }); return }

    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const empNo = user?.user_metadata?.employee_no || user?.email?.split('@')[0] || ''
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('employee_no', empNo).maybeSingle()

      // Generate report number
      const reportNo = `SAR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

      const { data: report, error } = await supabase
        .from('sample_reports')
        .insert({
          plant_id: '11111111-1111-1111-1111-111111111111',
          report_no: reportNo,
          sample_date: form.sample_date,
          time_check: form.time_check,
          lot_no: form.lot_no,
          product_id: form.product_id || null,
          product_other: form.product_other || null,
          feed_tank_id: form.feed_tank_id || null,
          discharge_tank_id: form.discharge_tank_id || null,
          crystallizer_no: form.crystallizer_no || null,
          batch_no: form.batch_no || null,
          sampling_point_id: form.sampling_point_id || null,
          submitted_by: user?.id,
          submitted_by_name: profile?.full_name || user?.email,
          remark_flushing: form.remark_flushing,
          remark_cooling: form.remark_cooling,
          remark_pushover: form.remark_pushover,
          remarks: form.remarks || null,
          status: 'awaiting_results',
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      // Insert requested parameters as sample_results
      const results = form.selected_params.flatMap(paramId => {
        const param = parameters.find(p => p.id === paramId)
        if (!param) return []
        if (param.is_series && Array.isArray(param.series_values)) {
          return (param.series_values as number[]).map(temp => ({
            report_id: report.id,
            parameter_id: paramId,
            series_key: temp,
            requested: true,
          }))
        }
        return [{ report_id: report.id, parameter_id: paramId, requested: true }]
      })

      if (results.length > 0) {
        const { error: resError } = await supabase.from('sample_results').insert(results)
        if (resError) throw resError
      }

      router.push(`/samples/${report.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create report'
      setMessage({ type: 'error', text: msg })
    } finally {
      setSaving(false)
    }
  }

  const feedTanks = tanks.filter(t => t.kind === 'feed' || t.kind === 'both')
  const dischargeTanks = tanks.filter(t => t.kind === 'discharge' || t.kind === 'both')

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/samples" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
            Raise Sample Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">RF-FR-001 — Create a new sample analysis report</p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-5 space-y-5">
        {/* Report Header Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date *</label>
            <input type="date" value={form.sample_date} onChange={e => setForm(f => ({ ...f, sample_date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Time Check *</label>
            <input type="time" value={form.time_check} onChange={e => setForm(f => ({ ...f, time_check: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Lot No. *</label>
            <input value={form.lot_no} onChange={e => setForm(f => ({ ...f, lot_no: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="Enter lot number" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Product *</label>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40">
              <option value="">— Select product —</option>
              {products.map((p, i) => <option key={i} value={String(p.id)}>{String(p.name)}</option>)}
              <option value="">Others (fill below)</option>
            </select>
          </div>
          {!form.product_id && (
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Product (Others) *</label>
              <input value={form.product_other} onChange={e => setForm(f => ({ ...f, product_other: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="Specify product name" />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Feed Tank</label>
            <select value={form.feed_tank_id} onChange={e => setForm(f => ({ ...f, feed_tank_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40">
              <option value="">— Select —</option>
              {feedTanks.map((t, i) => <option key={i} value={String(t.id)}>{String(t.code)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Discharge Tank</label>
            <select value={form.discharge_tank_id} onChange={e => setForm(f => ({ ...f, discharge_tank_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40">
              <option value="">— Select —</option>
              {dischargeTanks.map((t, i) => <option key={i} value={String(t.id)}>{String(t.code)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Sampling Point</label>
            <select value={form.sampling_point_id} onChange={e => setForm(f => ({ ...f, sampling_point_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40">
              <option value="">— Select —</option>
              {samplingPoints.map((sp, i) => <option key={i} value={String(sp.id)}>{String(sp.name)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Crystallizer / Batch No.</label>
            <input value={form.crystallizer_no} onChange={e => setForm(f => ({ ...f, crystallizer_no: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40" placeholder="Optional" />
          </div>
        </div>

        {/* Parameters */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wider">Parameters for Testing *</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {parameters.map((param, i) => (
              <label key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${
                form.selected_params.includes(String(param.id))
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-800/30 border-slate-700/40 text-slate-400 hover:border-slate-600/60'
              }`}>
                <input type="checkbox" checked={form.selected_params.includes(String(param.id))}
                  onChange={e => {
                    const id = String(param.id)
                    setForm(f => ({
                      ...f,
                      selected_params: e.target.checked
                        ? [...f.selected_params, id]
                        : f.selected_params.filter(p => p !== id)
                    }))
                  }}
                  className="accent-cyan-500"
                />
                <span className="font-medium">{String(param.name)}</span>
                {Boolean(param.unit) && <span className="text-slate-600 text-[10px]">({String(param.unit)})</span>}
              </label>
            ))}
          </div>
        </div>

        {/* Remarks checkboxes */}
        <div>
          <label className="text-xs text-slate-400 mb-2 block font-semibold uppercase tracking-wider">Remarks</label>
          <div className="flex items-center gap-4">
            {[
              { key: 'remark_flushing', label: 'Flushing' },
              { key: 'remark_cooling', label: 'Cooling' },
              { key: 'remark_pushover', label: 'Push Over' },
            ].map(r => (
              <label key={r.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form[r.key as keyof typeof form] as boolean}
                  onChange={e => setForm(f => ({ ...f, [r.key]: e.target.checked }))}
                  className="accent-cyan-500" />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={form.remarks}
            onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
            rows={2}
            className="w-full mt-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
            placeholder="Additional remarks…"
          />
        </div>

        <button onClick={handleSubmit} disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20">
          {saving ? <span className="animate-spin">⟳</span> : <Save className="h-4 w-4" />}
          {saving ? 'Creating…' : 'Create Sample Report'}
        </button>
      </div>
    </div>
  )
}
