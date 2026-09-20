'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import {
  FlaskConical, Plus, Search, Filter, CheckCircle2, Clock, AlertTriangle,
  FileText, ChevronRight,
} from 'lucide-react'

export default function SamplesListPage() {
  const supabase = createSupabaseBrowser()
  const [reports, setReports] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadReports = useCallback(async () => {
    try {
      let query = supabase
        .from('sample_reports')
        .select('*, products(name)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (searchTerm) {
        query = query.or(`lot_no.ilike.%${searchTerm}%,report_no.ilike.%${searchTerm}%`)
      }

      const { data } = await query
      setReports(data || [])
    } catch (err) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, statusFilter, searchTerm])

  useEffect(() => { loadReports() }, [loadReports])

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      awaiting_results: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      results_entered: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      decided: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      voided: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    }
    return styles[status] || styles.draft
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-400" />
            RF-FR-001 Sample Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Sample analysis reports for Nisshin Deodorizer Plant</p>
        </div>
        <Link
          href="/samples/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> New Sample Report
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by lot no. or report no.…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-white focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 outline-none"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="awaiting_results">Awaiting Results</option>
          <option value="results_entered">Results Entered</option>
          <option value="decided">Decided</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
            <Clock className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <FileText className="h-8 w-8 mb-2 text-slate-600" />
            <p className="text-sm">No sample reports found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500">
                  <th className="text-left px-4 py-3 font-medium">Report No.</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Lot No.</th>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Submitted By</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, i) => (
                  <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-cyan-400 font-medium">{String(report.report_no)}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{String(report.sample_date)}</td>
                    <td className="px-4 py-3 text-white font-medium">{String(report.lot_no)}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {(report.products as Record<string, unknown>)?.name
                        ? String((report.products as Record<string, unknown>).name)
                        : String(report.product_other || '—')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-medium ${statusBadge(String(report.status))}`}>
                        {String(report.status).replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{String(report.submitted_by_name || '—')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/samples/${report.id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
