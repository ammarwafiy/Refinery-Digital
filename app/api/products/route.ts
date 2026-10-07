import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, sanitizeInputString } from '@/lib/security';
import { INITIAL_PRODUCTS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgqtulfokenthxcnkafw.supabase.co';
const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncXR1bGZva2VudGh4Y25rYWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTg4Mjg2OSwiZXhwIjoyMTA1NDU4ODY5fQ.xl6sdDO0IiKEWXSeg2VMSM13qvuuk9qlKQgFLf84dAY';

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// GET: Fetch all products from Supabase
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
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[API /api/products GET] Supabase error:', error);
      return NextResponse.json({ success: true, products: INITIAL_PRODUCTS, fallback: true });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, products: INITIAL_PRODUCTS, fallback: true });
    }

    return NextResponse.json({ success: true, products: data });
  } catch (err: any) {
    console.error('[API /api/products GET] Exception:', err);
    return NextResponse.json({ success: true, products: INITIAL_PRODUCTS, fallback: true });
  }
}

// POST: Insert or Upsert a product into Supabase
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

    const body = await req.json().catch(() => ({}));
    const { id, name, code, category, sort_order, active } = body;

    const cleanName = sanitizeInputString(name || '').trim();
    if (!cleanName) {
      return NextResponse.json(
        { success: false, error: 'Product name is required.' },
        { status: 400 }
      );
    }

    const cleanCode = (
      code ? sanitizeInputString(code).trim() : cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_')
    ).toUpperCase();

    const cleanCategory = sanitizeInputString(category || 'specialty').toLowerCase();

    const newProduct = {
      id: id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
      name: cleanName,
      code: cleanCode,
      category: cleanCategory,
      sort_order: typeof sort_order === 'number' ? sort_order : 999,
      active: active !== false,
      created_at: new Date().toISOString(),
    };

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('products')
      .upsert(newProduct)
      .select();

    if (error) {
      console.error('[API /api/products POST] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      product: data && data.length > 0 ? data[0] : newProduct 
    });
  } catch (err: any) {
    console.error('[API /api/products POST] Exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
