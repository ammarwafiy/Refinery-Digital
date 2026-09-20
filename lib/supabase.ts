// ==============================================================================
// REFINERY PROCESS MANAGEMENT SYSTEM (PRD-REF-001)
// Supabase Client Setup with Graceful Fallback (Zero Build/Deploy Error Guarantee)
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.info(
    '[Refinery System] Operating in Industrial Offline/Embedded Simulation Mode. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to link to live Supabase Postgres.'
  );
}
