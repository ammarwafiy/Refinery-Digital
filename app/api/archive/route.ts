import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DEFAULT_SUPABASE_URL = 'https://zgqtulfokenthxcnkafw.supabase.co';
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncXR1bGZva2VudGh4Y25rYWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4Mjg2OSwiZXhwIjoyMTA1NDU4ODY5fQ.xl6sdDO0IiKEWXSeg2VMSM13qvuuk9qlKQgFLf84dAY';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// GET: Fetch storage health and row counts
export async function GET() {
  try {
    const counts: Record<string, number> = {};
    const tables = ['sample_reports', 'process_entries', 'deviations', 'audit_log', 'profiles'];

    for (const t of tables) {
      try {
        const { count, error } = await supabaseAdmin
          .from(t)
          .select('*', { count: 'exact', head: true });
        counts[t] = error ? 0 : (count || 0);
      } catch {
        counts[t] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      counts,
      supabaseLimitMB: 500,
      estimatedDatabaseSizeMB: 28.5,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// POST: Execute prune on Supabase tables older than cutoffDate
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cutoffDate } = body;

    if (!cutoffDate) {
      return NextResponse.json({ success: false, error: 'Cutoff date is required' }, { status: 400 });
    }

    // Prune sample reports decided before cutoffDate
    const { error: repErr } = await supabaseAdmin
      .from('sample_reports')
      .delete()
      .lt('sample_date', cutoffDate)
      .eq('status', 'decided');

    // Prune deviations created before cutoffDate
    const { error: devErr } = await supabaseAdmin
      .from('deviations')
      .delete()
      .lt('created_at', cutoffDate);

    return NextResponse.json({
      success: true,
      message: `Supabase database pruned successfully for records before ${cutoffDate}`,
      repError: repErr?.message,
      devError: devErr?.message,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
