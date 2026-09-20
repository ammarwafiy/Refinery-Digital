import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarShell } from '@/components/sidebar-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const empNo = user.user_metadata?.employee_no || user.email?.split('@')[0] || ''
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('employee_no', empNo)
    .maybeSingle()

  // Fallback profile if profiles table isn't set up yet or user doesn't have a profile row
  const userProfile = profile || {
    id: user.id,
    employee_no: empNo || 'N/A',
    full_name: user.email || 'Unknown User',
    role: 'viewer' as const,
    status: 'active' as const,
    active: true,
    created_at: new Date().toISOString(),
  }

  return <SidebarShell profile={userProfile}>{children}</SidebarShell>
}
