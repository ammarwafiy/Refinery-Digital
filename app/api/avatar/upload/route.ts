import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, checkRateLimit, sanitizeInputString } from '@/lib/security';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgqtulfokenthxcnkafw.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncXR1bGZva2VudGh4Y25rYWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4Mjg2OSwiZXhwIjoyMTA1NDU4ODY5fQ.xl6sdDO0IiKEWXSeg2VMSM13qvuuk9qlKQgFLf84dAY';

function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again shortly.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const employeeNoRaw = (formData.get('employee_no') as string | null) || '';
    const employeeNo = sanitizeInputString(employeeNoRaw).toUpperCase();

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded.' },
        { status: 400 }
      );
    }

    // Validate size limit (Max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum limit of 10MB.' },
        { status: 400 }
      );
    }

    // Determine extension & MIME type
    const mimeType = file.type || 'image/jpeg';
    let ext = 'jpg';
    if (mimeType.includes('gif') || file.name.toLowerCase().endsWith('.gif')) {
      ext = 'gif';
    } else if (mimeType.includes('png') || file.name.toLowerCase().endsWith('.png')) {
      ext = 'png';
    } else if (mimeType.includes('webp') || file.name.toLowerCase().endsWith('.webp')) {
      ext = 'webp';
    } else if (mimeType.includes('svg')) {
      ext = 'svg';
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeEmployeePrefix = employeeNo ? employeeNo.replace(/[^A-Z0-9_-]/gi, '') : 'USER';
    const filename = `${safeEmployeePrefix}-${Date.now()}.${ext}`;
    const storagePath = `${filename}`;

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Upload to Supabase Storage bucket 'avatars'
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(storagePath, buffer, {
        contentType: mimeType.includes('gif') ? 'image/gif' : mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[API /api/avatar/upload] Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 2. Get Public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // 3. If employee_no provided, update profiles table automatically
    if (employeeNo) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('employee_no', employeeNo);

      if (profileError) {
        console.warn('[API /api/avatar/upload] Profile avatar_url update warning:', profileError);
      }
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
      filename,
      message: 'Avatar uploaded and synchronized successfully!',
    });
  } catch (err: any) {
    console.error('[API /api/avatar/upload] Unexpected exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error occurred during avatar upload.' },
      { status: 500 }
    );
  }
}
