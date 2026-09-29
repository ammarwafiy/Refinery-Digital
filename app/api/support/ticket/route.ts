import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, sanitizeInputString } from '@/lib/security';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zgqtulfokenthxcnkafw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncXR1bGZva2VudGh4Y25rYWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4ODI4NjksImV4cCI6MjEwNTQ1ODg2OX0._rWSXBRHXBkMbYvYMj_zpFc9hf8F1MmT6uZuGlJonns';

const ADMIN_WHATSAPP_PHONE = process.env.WHATSAPP_ADMIN_PHONE || '+601161764934';
const CALLMEBOT_API_KEY = process.env.WHATSAPP_CALLMEBOT_API_KEY || '';
const GREEN_API_INSTANCE_ID = process.env.GREEN_API_INSTANCE_ID || process.env.WHATSAPP_GREEN_API_INSTANCE_ID || '710722748940';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN || process.env.WHATSAPP_GREEN_API_TOKEN || 'ac0b4947396a408f908828faf5b9ba6071a79587548e4ca9b1';
const GREEN_API_HOST = process.env.GREEN_API_HOST || 'https://api.green-api.com';

// Telegram Incident Alert Configuration (Lam Soon Refinery Digital)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8606874200:AAGVrgEukViDagP8OK0PPs9T_W3eV3IMqL4';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '721415727';

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

    // 2. Format Messages
    // A. Telegram HTML Message
    const telegramHtmlMessage = `🚨 <b>REFINERY PLANT INCIDENT REPORT</b>
━━━━━━━━━━━━━━━━━━━━━━
🎫 <b>Ticket ID:</b> <code>${escapeHtml(ticketId)}</code>
📂 <b>Category:</b> ${escapeHtml(categoryLabel)}
🏷️ <b>Subject:</b> ${escapeHtml(subject)}
👤 <b>Reporter:</b> ${escapeHtml(reporterName)} (<code>${escapeHtml(reporterId)}</code> - ${escapeHtml(reporterRole.toUpperCase())})
🕒 <b>Time:</b> ${escapeHtml(timestampMYT)} (MYT)

📝 <b>Incident Details:</b>
${escapeHtml(description)}
━━━━━━━━━━━━━━━━━━━━━━
🏭 <b>Facility:</b> Lam Soon Edible Oils Refinery
🌐 <b>System:</b> Refinery Digital Management`;

    // B. WhatsApp Markdown Alert Message
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

    // 3. Dispatch to Telegram Bot API (Primary automated channel)
    let telegramSent = false;
    let telegramMessageId: number | null = null;
    let telegramError: string | null = null;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN.trim()}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID.trim(),
            text: telegramHtmlMessage,
            parse_mode: 'HTML',
          }),
          signal: AbortSignal.timeout(10000),
        });

        const tgData = await tgRes.json().catch(() => ({}));
        if (tgRes.ok && tgData.ok) {
          telegramSent = true;
          telegramMessageId = tgData.result?.message_id || null;
        } else {
          telegramError = tgData.description || `Telegram error HTTP ${tgRes.status}`;
          console.warn('[Telegram Alert Warning]:', tgData);
        }
      } catch (err: any) {
        telegramError = `Telegram connection error: ${err.message || err}`;
        console.warn('[Telegram Alert Exception]:', err);
      }
    }

    // 4. Dispatch to WhatsApp API in background (Green-API private gateway or CallMeBot)
    let whatsappSent = false;
    let whatsappProvider: 'green-api' | 'callmebot' | 'none' = 'none';
    let whatsappError: string | null = null;
    let whatsappMessageId: string | null = null;

    // Green-API Gateway
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
          signal: AbortSignal.timeout(6000),
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

    // CallMeBot fallback
    if (!whatsappSent && CALLMEBOT_API_KEY && CALLMEBOT_API_KEY.trim() !== '') {
      try {
        const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(ADMIN_WHATSAPP_PHONE)}&text=${encodeURIComponent(rawWaMessage)}&apikey=${encodeURIComponent(CALLMEBOT_API_KEY.trim())}`;
        const cbRes = await fetch(callmebotUrl, { method: 'GET', signal: AbortSignal.timeout(6000) });
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

    // 5. Record to Supabase audit_log for immutable regulatory record
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const validProfiles = ['OPR001', 'SUP001', 'QCS001', 'MGR001', 'USR001', 'ADM001'];
      let actorEmp = reporterId;
      if (!validProfiles.includes(actorEmp)) {
        actorEmp = 'OPR001';
      }

      await supabaseAdmin.from('audit_log').insert({
        table_name: 'incident_tickets',
        record_id: crypto.randomUUID(),
        action: 'REPORT_INCIDENT',
        actor: actorEmp,
        occurred_at: new Date().toISOString(),
        new_row: {
          ticket_id: ticketId,
          subject,
          category,
          description,
          reporter_name: reporterName,
          reporter_id: reporterId,
          reporter_role: reporterRole,
          telegram_chat_id: TELEGRAM_CHAT_ID,
          telegram_sent: telegramSent,
          telegram_message_id: telegramMessageId,
          telegram_error: telegramError,
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
      telegramSent,
      telegramMessageId,
      telegramError,
      dispatchedPhone: ADMIN_WHATSAPP_PHONE,
      whatsappSent,
      whatsappProvider,
      whatsappMessageId,
      whatsappError,
      whatsappUrl,
      message: `Tiket insiden ${ticketId} berjaya didaftarkan${telegramSent ? ' dan notifikasi telah dihantar ke Telegram Pengurus Loji' : ''}.`,
    });
  } catch (error: any) {
    console.error('[/api/support/ticket Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit ticket.' },
      { status: 500 }
    );
  }
}
