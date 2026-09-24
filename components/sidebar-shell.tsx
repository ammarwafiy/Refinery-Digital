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
  X,
  Upload,
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
  operator: 'text-green-700 bg-green-50 border-green-200',
  supervisor: 'text-amber-700 bg-amber-50 border-amber-200',
  qc_analyst: 'text-blue-700 bg-blue-50 border-blue-200',
  qc_manager: 'text-purple-700 bg-purple-50 border-purple-200',
  admin: 'text-blue-700 bg-blue-50 border-blue-200',
  viewer: 'text-slate-600 bg-slate-100 border-slate-300',
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-blue-600" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">Refinery System</div>
              <div className="text-[10px] text-slate-500 truncate">NISSHIN DEOD PLANT</div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-green-600 font-mono">ONLINE</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-slate-600">
            <Clock className="h-3 w-3" />
            {timeString || '--:--:--'} MYT
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
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
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
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
              <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Administration
              </div>
            )}
            {collapsed && <div className="my-2 mx-3 border-t border-slate-200" />}
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
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User Profile + Collapse */}
      <div className="mt-auto border-t border-slate-200">
        {/* User Info */}
        <div className="p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800 truncate">{profile.full_name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${roleColors[profile.role]}`}>
                    {roleLabels[profile.role]}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{profile.employee_no}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-sm font-bold text-blue-700" title={profile.full_name}>
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
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all`}
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </form>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-slate-200 transition-all duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-12 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Nisshin Deodorizer Plant — Lam Soon Edible Oils
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-green-600">
              <Wifi className="h-3.5 w-3.5" />
              <span className="font-mono hidden sm:inline">Connected</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {timeString || '--:--:--'} MYT
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
