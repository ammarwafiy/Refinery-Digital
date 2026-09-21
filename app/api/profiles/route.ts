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

// GET: Fetch all profiles from Supabase
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API /api/profiles GET] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profiles: data || [] });
  } catch (err: any) {
    console.error('[API /api/profiles GET] Exception:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// POST: Insert or Upsert a profile into Supabase
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employee_no, full_name, role, status, password, created_at } = body;

    if (!employee_no || !full_name || !role) {
      return NextResponse.json(
        { success: false, error: 'employee_no, full_name, and role are required fields.' },
        { status: 400 }
      );
    }

    const payload = {
      employee_no: String(employee_no).trim().toUpperCase(),
      full_name: String(full_name).trim(),
      role: String(role).trim(),
      status: status || 'active',
      password: password ? String(password).trim() : 'password123',
      created_at: created_at || new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert([payload], { onConflict: 'employee_no' })
      .select();

    if (error) {
      console.error('[API /api/profiles POST] Supabase insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profile: data?.[0] || payload,
      message: `Profile ${payload.employee_no} successfully saved to Supabase!`
    });
  } catch (err: any) {
    console.error('[API /api/profiles POST] Exception:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// PATCH: Update profile status or details in Supabase
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { employee_no, status, role, full_name, password } = body;

    if (!employee_no) {
      return NextResponse.json(
        { success: false, error: 'employee_no is required for update.' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (role !== undefined) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;
    if (password !== undefined) updates.password = password;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('employee_no', String(employee_no).trim().toUpperCase())
      .select();

    if (error) {
      console.error('[API /api/profiles PATCH] Supabase update error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profile: data?.[0],
      message: `Profile ${employee_no} status updated in Supabase!`
    });
  } catch (err: any) {
    console.error('[API /api/profiles PATCH] Exception:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Remove a profile from Supabase
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employee_no = searchParams.get('employee_no');

    if (!employee_no) {
      return NextResponse.json(
        { success: false, error: 'employee_no query param is required.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('employee_no', employee_no.trim().toUpperCase());

    if (error) {
      console.error('[API /api/profiles DELETE] Supabase delete error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Profile ${employee_no} deleted from Supabase.` });
  } catch (err: any) {
    console.error('[API /api/profiles DELETE] Exception:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
