'use client'

import React, { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  FlaskConical, Save, CheckCircle2, AlertTriangle, ArrowLeft, Shield, XCircle,
  Clock,
} from 'lucide-react'

export default function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [reasons, setReasons] = useState<Record<string, unknown>[]>([])
  const [decision, setDecision] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // QC decision form
  const [decisionType, setDecisionType] = useState('')
  const [reasonId, setReasonId] = useState('')
  const [reasonDetail, setReasonDetail] = useState('')
  const [disposition, setDisposition] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showDecisionForm, setShowDecisionForm] = useState(false)

  const loadReport = useCallback(async () => {
    try {
      const { data: rep } = await supabase
        .from('sample_reports')
        .select('*, products(name)')
        .eq('id', id)
        .single()

      setReport(rep)

      const { data: res } = await supabase
        .from('sample_results')
        .select('*, parameters(name, code, unit, is_series)')
        .eq('report_id', id)
        .order('parameter_id')

      setResults(res || [])

      const { data: dec } = await supabase
        .from('qc_decisions')
        .select('*, rejection_reasons(label)')
        .eq('report_id', id)
        .order('decided_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setDecision(dec)

      const { data: reas } = await supabase.from('rejection_reasons').select('*').eq('active', true)
      setReasons(reas || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, id])

  useEffect(() => { loadReport() }, [loadReport])

  const updateResultValue = (resultId: string, field: string, value: string) => {
    setResults(prev => prev.map(r =>
      r.id === resultId ? { ...r, [field]: field.includes('numeric') ? (value === '' ? null : parseFloat(value)) : value } : r
    ))
  }

  const saveResults = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      for (const result of results) {
        if (!result.requested) continue
        await supabase
          .from('sample_results')
          .update({
            value_numeric: result.value_numeric ?? null,
            value_text: result.value_text ?? null,
            entered_by: user?.id,
            entered_at: new Date().toISOString(),
          })
          .eq('id', result.id)
      }

      await supabase
        .from('sample_reports')
        .update({ status: 'results_entered' })
        .eq('id', id)

      setMessage({ type: 'success', text: 'Results saved successfully.' })
      await loadReport()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const submitDecision = async () => {
    if (!decisionType) { setMessage({ type: 'error', text: 'Select a decision.' }); return }
    if (decisionType !== 'accept' && !reasonId) { setMessage({ type: 'error', text: 'Reason code is required.' }); return }
    if (decisionType !== 'accept' && reasonDetail.length < 10) { setMessage({ type: 'error', text: 'Reason detail must be at least 10 characters.' }); return }
    if (decisionType === 'reject' && !disposition) { setMessage({ type: 'error', text: 'Disposition is required for rejection.' }); return }
    if (!confirmPassword || confirmPassword.length < 4) { setMessage({ type: 'error', text: 'Electronic signature (password) required.' }); return }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const empNo = user?.user_metadata?.employee_no || user?.email?.split('@')[0] || ''
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('employee_no', empNo).maybeSingle()

      const failedParams = results
        .filter(r => r.in_spec === false)
        .map(r => String((r.parameters as Record<string, unknown>)?.name || r.parameter_id))

      const { error } = await supabase.from('qc_decisions').insert({
        report_id: id,
        decision: decisionType,
        reason_id: reasonId || null,
        reason_detail: reasonDetail || null,
        failed_parameters: failedParams.length > 0 ? failedParams : null,
        disposition: disposition || null,
        decided_by: user?.id,
      })

      if (error) throw error

      await supabase.from('sample_reports').update({ status: 'decided' }).eq('id', id)

      setMessage({ type: 'success', text: 'QC decision recorded.' })
      setShowDecisionForm(false)
      await loadReport()
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Decision failed' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500 text-sm"><Clock className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
  }

  if (!report) {
    return <div className="text-center text-slate-500 py-12">Report not found.</div>
  }

  const productName = (report.products as Record<string, unknown>)?.name
    ? String((report.products as Record<string, unknown>).name)
    : String(report.product_other || '—')

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/samples" className="text-slate-400 hover:text-white transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
            {String(report.report_no)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{productName} · Lot {String(report.lot_no)} · {String(report.sample_date)}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${
          report.status === 'decided' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        }`}>{String(report.status).replace(/_/g, ' ').toUpperCase()}</span>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Report Header Info */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><span className="text-slate-500">Date:</span> <span className="text-white ml-1">{String(report.sample_date)}</span></div>
          <div><span className="text-slate-500">Time:</span> <span className="text-white ml-1">{String(report.time_check)}</span></div>
          <div><span className="text-slate-500">Lot:</span> <span className="text-white ml-1 font-mono">{String(report.lot_no)}</span></div>
          <div><span className="text-slate-500">Product:</span> <span className="text-white ml-1">{productName}</span></div>
          <div><span className="text-slate-500">Submitted by:</span> <span className="text-white ml-1">{String(report.submitted_by_name || '—')}</span></div>
          {Boolean(report.remark_flushing) && <div className="text-emerald-400 font-semibold">✓ Flushing</div>}
          {Boolean(report.remark_cooling) && <div className="text-blue-400 font-semibold">✓ Cooling</div>}
          {Boolean(report.remark_pushover) && <div className="text-purple-400 font-semibold">✓ Push Over</div>}
          {Boolean(report.remarks) && (
            <div className="col-span-2 sm:col-span-4 mt-1 pt-2 border-t border-slate-800/80 text-slate-300">
              <span className="text-slate-500 font-medium">Remarks:</span> <span className="italic">{String(report.remarks)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results Entry */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Analysis Results</h2>
          {report.status !== 'decided' && (
            <button onClick={saveResults} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Results'}
            </button>
          )}
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {results.filter(r => r.requested).map((result, i) => {
              const param = result.parameters as Record<string, unknown> | null
              const isSelect = param?.code === 'ODOUR'
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
                  <div className="w-48 min-w-[120px]">
                    <span className="text-xs text-slate-300 font-medium">
                      {param?.name ? String(param.name) : '—'}
                      {result.series_key != null && <span className="text-slate-500 ml-1">@ {String(result.series_key)}°C</span>}
                    </span>
                  </div>
                  <div className="flex-1">
                    {isSelect ? (
                      <select
                        value={String(result.value_text || '')}
                        onChange={e => updateResultValue(String(result.id), 'value_text', e.target.value)}
                        disabled={report.status === 'decided'}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-xs outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
                      >
                        <option value="">— Select —</option>
                        <option value="bland">Bland</option>
                        <option value="acceptable">Acceptable</option>
                        <option value="off">Off</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={(result.value_numeric as string | number) ?? ''}
                        onChange={e => updateResultValue(String(result.id), 'value_numeric', e.target.value)}
                        disabled={report.status === 'decided'}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-xs font-mono outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50"
                        placeholder="—"
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600 w-12 text-right">{param?.unit ? String(param.unit) : ''}</span>
                  {result.in_spec === true && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                  {result.in_spec === false && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* QC Decision */}
      {decision && (
        <div className={`bg-slate-900/60 border rounded-xl p-4 ${
          decision.decision === 'accept' ? 'border-emerald-500/30' : decision.decision === 'reject' ? 'border-rose-500/30' : 'border-amber-500/30'
        }`}>
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" /> QC Decision
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-slate-500">Decision:</span> <span className={`ml-1 font-bold ${
              decision.decision === 'accept' ? 'text-emerald-400' : decision.decision === 'reject' ? 'text-rose-400' : 'text-amber-400'
            }`}>{String(decision.decision).replace(/_/g, ' ').toUpperCase()}</span></div>
            {Boolean(decision.reason_detail) && <div className="col-span-2"><span className="text-slate-500">Reason:</span> <span className="text-white ml-1">{String(decision.reason_detail)}</span></div>}
            {Boolean(decision.disposition) && <div><span className="text-slate-500">Disposition:</span> <span className="text-white ml-1">{String(decision.disposition)}</span></div>}
          </div>
        </div>
      )}

      {/* Make decision button */}
      {report.status === 'results_entered' && !decision && !showDecisionForm && (
        <button onClick={() => setShowDecisionForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/20">
          <Shield className="h-4 w-4" /> Make QC Decision
        </button>
      )}

      {/* Decision form */}
      {showDecisionForm && (
        <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400" /> QC Decision — Electronic Signature Required
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Decision *</label>
              <select value={decisionType} onChange={e => setDecisionType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/40">
                <option value="">— Select —</option>
                <option value="accept">Accept</option>
                <option value="accept_concession">Accept with Concession</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            {decisionType !== 'accept' && decisionType && (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Reason Code *</label>
                  <select value={reasonId} onChange={e => setReasonId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/40">
                    <option value="">— Select —</option>
                    {reasons.map((r, i) => <option key={i} value={String(r.id)}>{String(r.label)}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Reason Detail * (min 10 chars)</label>
                  <textarea value={reasonDetail} onChange={e => setReasonDetail(e.target.value)} rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/40 resize-none" />
                </div>
                {decisionType === 'reject' && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Disposition *</label>
                    <select value={disposition} onChange={e => setDisposition(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/40">
                      <option value="">— Select —</option>
                      <option value="rework">Rework</option>
                      <option value="reprocess">Reprocess</option>
                      <option value="downgrade">Downgrade</option>
                      <option value="hold">Hold</option>
                      <option value="scrap">Scrap</option>
                    </select>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Electronic Signature (Password) *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/40" placeholder="Re-enter your password" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={submitDecision} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-50">
              <Shield className="h-4 w-4" /> {saving ? 'Submitting…' : 'Submit Decision'}
            </button>
            <button onClick={() => setShowDecisionForm(false)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
