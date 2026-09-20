'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Thermometer,
  Gauge,
  FlaskConical,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
} from 'lucide-react'

interface DashboardStats {
  totalEntries: number
  missingSlots: number
  openDeviations: number
  pendingSamples: number
  rejections: number
  latestHour: string | null
}

export default function DashboardPage() {
  const supabase = createSupabaseBrowser()
  const [stats, setStats] = useState<DashboardStats>({
    totalEntries: 0,
    missingSlots: 0,
    openDeviations: 0,
    pendingSamples: 0,
    rejections: 0,
    latestHour: null,
  })
  const [recentEntries, setRecentEntries] = useState<Record<string, unknown>[]>([])
  const [recentDeviations, setRecentDeviations] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      // Get today's sheet
      const today = new Date().toISOString().split('T')[0]

      const { data: sheet } = await supabase
        .from('process_sheets')
        .select('id, shift_date, status, stripping_steam_pct, set_steam_supply_bar')
        .eq('shift_date', today)
        .single()

      if (sheet) {
        const { data: entries } = await supabase
          .from('process_entries')
          .select('*')
          .eq('sheet_id', sheet.id)
          .order('slot_index', { ascending: true })

        const entryCount = entries?.length || 0
        const filledSlots = new Set(entries?.map(e => e.slot_index))
        const now = new Date()
        const myt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }))
        const currentHour = myt.getHours()
        const shiftStart = 7
        let expectedSlots = 0

        if (currentHour >= shiftStart) {
          expectedSlots = currentHour - shiftStart + 1
        } else {
          expectedSlots = (24 - shiftStart) + currentHour + 1
        }
        expectedSlots = Math.min(expectedSlots, 24)

        let missing = 0
        for (let i = 0; i < expectedSlots; i++) {
          if (!filledSlots.has(i)) missing++
        }

        setRecentEntries(entries?.slice(-5).reverse() || [])

        setStats(prev => ({
          ...prev,
          totalEntries: entryCount,
          missingSlots: missing,
          latestHour: entries?.length ? entries[entries.length - 1].slot_label : null,
        }))
      }

      // Open deviations
      const { data: devs, count: devCount } = await supabase
        .from('deviations')
        .select('*', { count: 'exact' })
        .is('acknowledged_by', null)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentDeviations(devs || [])
      setStats(prev => ({ ...prev, openDeviations: devCount || 0 }))

      // Pending samples
      const { count: sampleCount } = await supabase
        .from('sample_reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'awaiting_results'])

      setStats(prev => ({ ...prev, pendingSamples: sampleCount || 0 }))

      // Rejections today
      const { count: rejCount } = await supabase
        .from('qc_decisions')
        .select('*', { count: 'exact', head: true })
        .eq('decision', 'reject')
        .gte('decided_at', today)

      setStats(prev => ({ ...prev, rejections: rejCount || 0 }))
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [loadData])

  const StatCard = ({ icon: Icon, label, value, color, sub }: {
    icon: React.ElementType; label: string; value: number | string; color: string; sub?: string
  }) => (
    <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 hover:border-slate-700/60 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 font-mono ${color}`}>{value}</p>
          {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-slate-800/60`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <Activity className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Loading live board…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            Supervisor Live Board
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time plant status — auto-refreshes every 30 seconds
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Layers} label="Entries Today" value={stats.totalEntries} color="text-cyan-400" sub={`Latest: ${stats.latestHour || 'None'}`} />
        <StatCard icon={Clock} label="Missing Slots" value={stats.missingSlots} color={stats.missingSlots > 0 ? 'text-amber-400' : 'text-emerald-400'} sub="Overdue entries" />
        <StatCard icon={AlertTriangle} label="Open Deviations" value={stats.openDeviations} color={stats.openDeviations > 0 ? 'text-rose-400' : 'text-emerald-400'} sub="Unacknowledged" />
        <StatCard icon={FlaskConical} label="Pending Samples" value={stats.pendingSamples} color="text-purple-400" sub="Awaiting results" />
        <StatCard icon={Bell} label="Rejections Today" value={stats.rejections} color={stats.rejections > 0 ? 'text-rose-400' : 'text-emerald-400'} sub="QC decisions" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Process Entries */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-cyan-400" />
              Latest Process Readings
            </h2>
            <span className="text-[10px] text-slate-500 font-mono">RF-FR-004</span>
          </div>
          <div className="p-4">
            {recentEntries.length > 0 ? (
              <div className="space-y-2">
                {recentEntries.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30 border border-slate-800/40 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-cyan-400 font-bold w-10">{String(entry.slot_label)}</span>
                      <span className="text-slate-400">
                        T1: <span className="text-white font-mono">{String(entry.tray_1_temp_c ?? '—')}°C</span>
                      </span>
                      <span className="text-slate-400">
                        Vac: <span className="text-white font-mono">{String(entry.vacuum_torr ?? '—')} Torr</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.has_deviation ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> DEV
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">No entries recorded today</p>
            )}
          </div>
        </div>

        {/* Open Deviations */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Open Deviations
            </h2>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
              {stats.openDeviations} OPEN
            </span>
          </div>
          <div className="p-4">
            {recentDeviations.length > 0 ? (
              <div className="space-y-2">
                {recentDeviations.map((dev, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-amber-300">{String(dev.field_key).replace(/_/g, ' ')}</span>
                      <span className="text-slate-500 text-[10px] font-mono">
                        {new Date(String(dev.created_at)).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-400">
                      Observed: <span className="text-white font-mono font-bold">{String(dev.observed)}</span>
                      {dev.soft_min != null && dev.soft_max != null && (
                        <span className="ml-2 text-slate-500">
                          (Band: {String(dev.soft_min)} – {String(dev.soft_max)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-400/60 text-center py-6 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> All clear — no open deviations
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
