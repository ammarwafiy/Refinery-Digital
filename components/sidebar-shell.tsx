'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import {
  Flame,
  LayoutDashboard,
  Layers,
  FlaskConical,
  ClipboardCheck,
  BarChart3,
  FileText,
  Users,
  Package,
  Database,
  Settings,
  Target,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wifi,
  Menu,
} from 'lucide-react'

type UserRole = 'operator' | 'supervisor' | 'qc_analyst' | 'qc_manager' | 'admin' | 'viewer'

interface Profile {
  employee_no: string
  full_name: string
  role: UserRole
  status?: 'active' | 'unactive'
  active?: boolean
  id?: string
  plant_id?: string | null
}

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Live Dashboard', icon: LayoutDashboard, badge: 'LIVE', roles: ['supervisor', 'qc_manager', 'admin', 'viewer'] },
  { href: '/process', label: 'Process Log', icon: Layers, badge: 'RF-FR-004', roles: ['operator', 'supervisor', 'admin', 'viewer'] },
  { href: '/samples', label: 'Sample Reports', icon: FlaskConical, badge: 'RF-FR-001', roles: ['operator', 'supervisor', 'qc_analyst', 'qc_manager', 'admin', 'viewer'] },
  { href: '/qc/queue', label: 'Lab Queue', icon: ClipboardCheck, roles: ['qc_analyst', 'qc_manager', 'supervisor'] },
  { href: '/qc/decisions', label: 'QC Decisions', icon: Target, roles: ['qc_analyst', 'qc_manager', 'supervisor', 'admin', 'viewer'] },
  { href: '/trends', label: 'Trends & Analytics', icon: BarChart3, roles: ['supervisor', 'qc_manager', 'admin', 'viewer'] },
  { href: '/export', label: 'Export & Import', icon: FileText, roles: ['operator', 'supervisor', 'qc_analyst', 'qc_manager', 'admin', 'viewer'] },
]

const adminItems: NavItem[] = [
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin'] },
  { href: '/admin/products', label: 'Products', icon: Package, roles: ['admin', 'qc_manager'] },
  { href: '/admin/tanks', label: 'Tanks', icon: Database, roles: ['admin', 'qc_manager'] },
  { href: '/admin/specs', label: 'Specifications', icon: Settings, roles: ['admin', 'qc_manager'] },
  { href: '/admin/limits', label: 'Process Limits', icon: AlertTriangle, roles: ['admin', 'qc_manager'] },
  { href: '/admin/reasons', label: 'Rejection Reasons', icon: ClipboardCheck, roles: ['admin', 'qc_manager'] },
]

const roleColors: Record<UserRole, string> = {
  operator: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/40',
  supervisor: 'text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/40',
  qc_analyst: 'text-[#009FE3] bg-[#009FE3]/15 border-[#009FE3]/40',
  qc_manager: 'text-purple-400 bg-purple-500/15 border-purple-500/40',
  admin: 'text-[#009FE3] bg-[#009FE3]/15 border-[#009FE3]/40',
  viewer: 'text-slate-400 bg-slate-800 border-slate-700',
}

const roleLabels: Record<UserRole, string> = {
  operator: 'Operator',
  supervisor: 'Supervisor',
  qc_analyst: 'QC Analyst',
  qc_manager: 'QC Manager',
  admin: 'Administrator',
  viewer: 'Viewer',
}

export function SidebarShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [timeString, setTimeString] = useState('')

  useEffect(() => {
    const update = () => {
      setTimeString(
        new Date().toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  const filteredNav = navItems.filter(item => item.roles.includes(profile.role))
  const filteredAdmin = adminItems.filter(item => item.roles.includes(profile.role))

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#101927]">
      {/* Logo */}
      <div className="p-4 border-b border-[#1F2E43]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0A1018] border border-[#1F2E43] flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-[#009FE3]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-100 truncate">Refinery System</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">NISSHIN DEOD PLANT</div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-[#1F2E43] flex items-center justify-between text-[10px] text-slate-400 bg-[#0A1018]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[#10B981] font-mono">ONLINE</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-slate-300">
            <Clock className="h-3 w-3 text-slate-500" />
            {timeString || '--:--:--'} MYT
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Workflows
          </div>
        )}
        {filteredNav.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-[#009FE3] text-white border border-[#009FE3] shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#172235] border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      active ? 'bg-black/25 text-white' : 'bg-[#0A1018] text-slate-400 border border-[#1F2E43]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}

        {filteredAdmin.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Administration
              </div>
            )}
            {collapsed && <div className="my-2 mx-3 border-t border-[#1F2E43]" />}
            {filteredAdmin.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-[#009FE3] text-white border border-[#009FE3]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#172235] border border-transparent'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User Profile + Collapse */}
      <div className="mt-auto border-t border-[#1F2E43] bg-[#0A1018]">
        {/* User Info */}
        <div className="p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[#101927] border border-[#1F2E43]">
              <div className="w-8 h-8 rounded-lg bg-[#009FE3]/15 border border-[#009FE3]/30 flex items-center justify-center text-sm font-bold text-[#009FE3] shrink-0 font-mono">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 truncate">{profile.full_name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium font-mono ${roleColors[profile.role]}`}>
                    {roleLabels[profile.role]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{profile.employee_no}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-[#009FE3]/15 border border-[#009FE3]/30 flex items-center justify-center text-sm font-bold text-[#009FE3] font-mono" title={profile.full_name}>
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Sign out + Collapse toggle */}
        <div className="px-3 pb-3 flex items-center gap-2">
          <form action={signOut} className="flex-1">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 border border-transparent hover:border-[#EF4444]/30 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </form>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#172235] transition-all cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#070B12]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#101927] border-r border-[#1F2E43] transform transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 bg-[#101927] border-r border-[#1F2E43] transition-all duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-12 shrink-0 border-b border-[#1F2E43] bg-[#0A1018] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Nisshin Deodorizer Plant — Lam Soon Edible Oils
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <Wifi className="h-3.5 w-3.5" />
              <span className="font-mono hidden sm:inline">Connected</span>
            </span>
            <span className="text-[#1F2E43] hidden sm:inline">|</span>
            <span className="font-mono text-slate-200 bg-[#101927] px-2 py-0.5 rounded border border-[#1F2E43]">
              {timeString || '--:--:--'} MYT
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-[#070B12]">
          {children}
        </main>
      </div>
    </div>
  )
}
