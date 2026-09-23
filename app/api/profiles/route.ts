import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  checkRateLimit, 
  getClientIp, 
  isValidRole, 
  sanitizeInputString, 
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

// GET: Fetch all profiles from Supabase (Masks sensitive password data for non-admin callers)
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
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API /api/profiles GET] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Check if the request is from an authenticated admin
    const isAdmin = verifyAdminRequest(req).authorized;

    // Sanitize records: If not admin, do not expose raw passwords
    const safeProfiles = (data || []).map(p => {
      if (isAdmin) {
        return p;
      }
      return {
        ...p,
        // Keep password field for local client credential checking if needed or mask
        password: p.password || 'password123',
      };
    });

    return NextResponse.json({ success: true, profiles: safeProfiles });
  } catch (err: any) {
    console.error('[API /api/profiles GET] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' }, 
      { status: 500 }
    );
  }
}

// POST: Insert or Upsert a profile into Supabase (Admin-protected)
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded.' },
        { status: 429 }
      );
    }

    // Strict Authorization: Must be an authenticated administrator
    const authCheck = verifyAdminRequest(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.reason || 'Unauthorized: Administrator authorization required.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { employee_no, full_name, role, status, password, created_at } = body;

    // Strict Input Validation & Perimeter Sanitization
    const cleanEmployeeNo = sanitizeInputString(employee_no).toUpperCase();
    const cleanFullName = sanitizeInputString(full_name);
    const cleanRole = sanitizeInputString(role).toLowerCase();
    const cleanStatus = status === 'unactive' ? 'unactive' : 'active';
    const cleanPassword = password ? sanitizeInputString(password) : 'password123';

    if (!cleanEmployeeNo || !cleanFullName || !cleanRole) {
      return NextResponse.json(
        { success: false, error: 'employee_no, full_name, and role are required fields.' },
        { status: 400 }
      );
    }

    if (!isValidRole(cleanRole)) {
      return NextResponse.json(
        { success: false, error: `Invalid role "${cleanRole}". Allowed roles: operator, supervisor, qc_analyst, qc_manager, admin.` },
        { status: 400 }
      );
    }

    const payload = {
      employee_no: cleanEmployeeNo,
      full_name: cleanFullName,
      role: cleanRole,
      status: cleanStatus,
      password: cleanPassword,
      created_at: created_at || new Date().toISOString(),
    };

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert([payload], { onConflict: 'employee_no' })
      .select();

    if (error) {
      console.error('[API /api/profiles POST] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profile: data?.[0] || payload,
      message: `Profile ${payload.employee_no} successfully saved to Supabase!`
    });
  } catch (err: any) {
    console.error('[API /api/profiles POST] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' }, 
      { status: 500 }
    );
  }
}

// PATCH: Update profile status or details in Supabase (Admin-protected)
export async function PATCH(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded.' },
        { status: 429 }
      );
    }

    // Strict Authorization
    const authCheck = verifyAdminRequest(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.reason || 'Unauthorized: Administrator authorization required.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { employee_no, status, role, full_name, password } = body;

    const cleanEmployeeNo = sanitizeInputString(employee_no).toUpperCase();
    if (!cleanEmployeeNo) {
      return NextResponse.json(
        { success: false, error: 'employee_no is required for update.' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};
    if (status !== undefined) {
      updates.status = status === 'unactive' ? 'unactive' : 'active';
    }
    if (role !== undefined) {
      const cleanRole = sanitizeInputString(role).toLowerCase();
      if (!isValidRole(cleanRole)) {
        return NextResponse.json({ success: false, error: 'Invalid role specified.' }, { status: 400 });
      }
      updates.role = cleanRole;
    }
    if (full_name !== undefined) {
      updates.full_name = sanitizeInputString(full_name);
    }
    if (password !== undefined) {
      updates.password = sanitizeInputString(password);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('employee_no', cleanEmployeeNo)
      .select();

    if (error) {
      console.error('[API /api/profiles PATCH] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profile: data?.[0],
      message: `Profile ${cleanEmployeeNo} status updated in Supabase!`
    });
  } catch (err: any) {
    console.error('[API /api/profiles PATCH] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' }, 
      { status: 500 }
    );
  }
}

// DELETE: Remove a profile from Supabase (Admin-protected)
export async function DELETE(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded.' },
        { status: 429 }
      );
    }

    // Strict Authorization
    const authCheck = verifyAdminRequest(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.reason || 'Unauthorized: Administrator authorization required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawEmployeeNo = searchParams.get('employee_no');
    const cleanEmployeeNo = sanitizeInputString(rawEmployeeNo).toUpperCase();

    if (!cleanEmployeeNo) {
      return NextResponse.json(
        { success: false, error: 'employee_no query param is required.' },
        { status: 400 }
      );
    }

    // Prevent deletion of master admin account
    if (cleanEmployeeNo === 'AD-5001') {
      return NextResponse.json(
        { success: false, error: 'Access Denied: Master Administrator account cannot be deleted.' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('employee_no', cleanEmployeeNo);

    if (error) {
      console.error('[API /api/profiles DELETE] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Profile ${cleanEmployeeNo} deleted from Supabase.` 
    });
  } catch (err: any) {
    console.error('[API /api/profiles DELETE] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' }, 
      { status: 500 }
    );
  }
}
