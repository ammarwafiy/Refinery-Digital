import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, sanitizeInputString } from '@/lib/security';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgqtulfokenthxcnkafw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncXR1bGZva2VudGh4Y25rYWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODI4NjksImV4cCI6MjEwNTQ1ODg2OX0._rWSXBRHXBkMbYvYMj_zpFc9hf8F1MmT6uZuGlJonns';

const ADMIN_WHATSAPP_PHONE = process.env.WHATSAPP_ADMIN_PHONE || '+601161764934';
const CALLMEBOT_API_KEY = process.env.WHATSAPP_CALLMEBOT_API_KEY || '';
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || process.env.WHATSAPP_GREEN_API_INSTANCE_ID || '';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || process.env.WHATSAPP_GREEN_API_TOKEN || '';
const GREEN_API_HOST = process.env.GREEN_API_HOST || 'https://api.green-api.com';

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  process: 'Shift Operations & Hourly Log (RF-FR-004)',
  qc: 'QC Laboratory Testing & Sample Results (RF-FR-001)',
  scada: 'Physical Sensor / DCS Connectivity',
  security: 'User Authentication & Role Permissions',
  general: 'System Feature Enhancement Request',
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const subject = sanitizeInputString(body.subject || '');
    const category = sanitizeInputString(body.category || 'process');
    const description = sanitizeInputString(body.description || '');
    const reporterName = sanitizeInputString(body.reporterName || 'Plant Personnel');
    const reporterId = sanitizeInputString(body.reporterId || 'OPR001');
    const reporterRole = sanitizeInputString(body.reporterRole || 'operator');

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, error: 'Subject and description are required.' },
        { status: 400 }
      );
    }

    // 1. Generate unique Ticket ID
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const ticketId = `TCK-${dateStr}-${randNum}`;
    const timestampMYT = new Date().toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const categoryLabel = CATEGORY_LABELS[category] || category;

    // 2. Format WhatsApp Alert Message
    const rawWaMessage = `🚨 *REFINERY PLANT INCIDENT REPORT*
━━━━━━━━━━━━━━━━━━━━━━
🎫 *Ticket ID:* ${ticketId}
📂 *Category:* ${categoryLabel}
🏷️ *Subject:* ${subject}
👤 *Reporter:* ${reporterName} (${reporterId} - ${reporterRole.toUpperCase()})
🕒 *Time:* ${timestampMYT} (MYT)

📝 *Incident Details:*
${description}
━━━━━━━━━━━━━━━━━━━━━━
🏭 *Facility:* Lam Soon Edible Oils Refinery
🌐 *System:* Refinery Digital Management`;

    // Direct Click-to-Chat WhatsApp URL (wa.me)
    const cleanPhone = ADMIN_WHATSAPP_PHONE.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(rawWaMessage)}`;

    // 3. Dispatch to WhatsApp API in background (Green-API private gateway or CallMeBot)
    let whatsappSent = false;
    let whatsappProvider: 'green-api' | 'callmebot' | 'none' = 'none';
    let whatsappError: string | null = null;
    let whatsappMessageId: string | null = null;

    // A. Priority 1: Private Dedicated Green-API Gateway (No @lid issues, 100% private)
    if (GREEN_API_INSTANCE_ID && GREEN_API_TOKEN) {
      try {
        const host = GREEN_API_HOST.trim().replace(/\/+$/, '');
        const greenApiUrl = `${host}/waInstance${GREEN_API_INSTANCE_ID.trim()}/sendMessage/${GREEN_API_TOKEN.trim()}`;
        const greenApiChatId = `${cleanPhone}@c.us`;

        const greenRes = await fetch(greenApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: greenApiChatId,
            message: rawWaMessage,
          }),
          signal: AbortSignal.timeout(10000),
        });

        const greenData = await greenRes.json().catch(() => ({}));
        if (greenRes.ok && (greenData.idMessage || greenData.id)) {
          whatsappSent = true;
          whatsappProvider = 'green-api';
          whatsappMessageId = greenData.idMessage || greenData.id;
        } else {
          whatsappError = `Green-API error HTTP ${greenRes.status}: ${JSON.stringify(greenData)}`;
        }
      } catch (err: any) {
        whatsappError = `Green-API connection error: ${err.message || err}`;
        console.warn('[Green-API WhatsApp Alert Warning]:', err);
      }
    }

    // B. Priority 2: Fallback to CallMeBot if Green-API not configured or unsuccessful
    if (!whatsappSent && CALLMEBOT_API_KEY && CALLMEBOT_API_KEY.trim() !== '') {
      try {
        const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(ADMIN_WHATSAPP_PHONE)}&text=${encodeURIComponent(rawWaMessage)}&apikey=${encodeURIComponent(CALLMEBOT_API_KEY.trim())}`;
        const cbRes = await fetch(callmebotUrl, { method: 'GET', signal: AbortSignal.timeout(8000) });
        if (cbRes.ok) {
          whatsappSent = true;
          whatsappProvider = 'callmebot';
        } else {
          whatsappError = (whatsappError ? `${whatsappError} | ` : '') + `CallMeBot returned HTTP ${cbRes.status}`;
        }
      } catch (err: any) {
        whatsappError = (whatsappError ? `${whatsappError} | ` : '') + (err.message || 'CallMeBot network error');
        console.warn('[CallMeBot WhatsApp Alert Warning]:', err);
      }
    }

    // 4. Record to Supabase audit_log for immutable regulatory record
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.from('audit_log').insert({
        table_name: 'incident_tickets',
        record_id: crypto.randomUUID(),
        action: 'REPORT_INCIDENT',
        actor_name: `${reporterName} (${reporterId})`,
        new_row: {
          ticket_id: ticketId,
          subject,
          category,
          description,
          reporter_name: reporterName,
          reporter_id: reporterId,
          reporter_role: reporterRole,
          dispatched_whatsapp: ADMIN_WHATSAPP_PHONE,
          whatsapp_sent: whatsappSent,
          whatsapp_provider: whatsappProvider,
          whatsapp_message_id: whatsappMessageId,
          whatsapp_error: whatsappError,
          created_at: new Date().toISOString(),
        },
      });
    } catch (dbErr) {
      console.error('[Supabase Audit Log Error for Ticket]:', dbErr);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      dispatchedPhone: ADMIN_WHATSAPP_PHONE,
      whatsappSent,
      whatsappProvider,
      whatsappMessageId,
      whatsappError,
      callmebotSent: whatsappSent && whatsappProvider === 'callmebot',
      callmebotError: whatsappError,
      whatsappUrl,
      message: `Tiket insiden ${ticketId} berjaya didaftarkan${whatsappSent ? ` dan dihantar ke WhatsApp Pentadbir via ${whatsappProvider.toUpperCase()}` : ''}.`,
    });
  } catch (error: any) {
    console.error('[/api/support/ticket Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit ticket.' },
      { status: 500 }
    );
  }
}
