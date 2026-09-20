import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'

export default async function DashboardRoot() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const empNo = user.user_metadata?.employee_no || user.email?.split('@')[0] || ''
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('employee_no', empNo)
    .maybeSingle()

  const role = profile?.role || 'viewer'

  // Redirect to the default page for each role
  switch (role) {
    case 'operator':
      redirect('/process')
    case 'supervisor':
      redirect('/dashboard')
    case 'qc_analyst':
      redirect('/qc/queue')
    case 'qc_manager':
      redirect('/qc/queue')
    case 'admin':
      redirect('/admin/users')
    default:
      redirect('/dashboard')
  }
}
