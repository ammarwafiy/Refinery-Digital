import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  checkRateLimit, 
  getClientIp, 
  isValidIsoDate, 
  verifyAdminRequest 
} from '@/lib/security';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgqtulfokenthxcnkafw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseKey) {
    throw new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not defined.');
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// GET: Fetch storage health and row counts (with rate limiting)
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again shortly.' },
        { status: 429 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
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
    console.error('[API /api/archive GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' }, 
      { status: 500 }
    );
  }
}

// POST: Execute secure prune on Supabase tables older than cutoffDate (Admin-only)
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 10, 60000); // Strict rate limit for destructive ops
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before retrying prune operation.' },
        { status: 429 }
      );
    }

    // Strict Authorization Check: Only authorized administrator requests allowed
    const authCheck = verifyAdminRequest(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { 
          success: false, 
          error: authCheck.reason || 'Unauthorized: Administrator authorization required to prune data.' 
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { cutoffDate } = body;

    // Strict ISO Date Validation
    if (!cutoffDate || !isValidIsoDate(cutoffDate)) {
      return NextResponse.json(
        { success: false, error: 'A valid ISO cutoff date (YYYY-MM-DD) is required.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

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

    if (repErr || devErr) {
      console.warn('[API /api/archive POST] Prune partial notice:', repErr || devErr);
    }

    return NextResponse.json({
      success: true,
      message: `Supabase database pruned successfully for records before ${cutoffDate}`,
      repError: repErr?.message,
      devError: devErr?.message,
    });
  } catch (err: any) {
    console.error('[API /api/archive POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' }, 
      { status: 500 }
    );
  }
}
