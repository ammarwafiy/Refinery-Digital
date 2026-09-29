import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8606874200:AAGVrgEukViDagP8OK0PPs9T_W3eV3IMqL4';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '721415727';

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, type = 'info', metadata } = body;

    let icon = 'ℹ️';
    if (type === 'qc_reject') icon = '🚨';
    else if (type === 'qc_accept') icon = '✅';
    else if (type === 'qc_concession') icon = '⚠️';
    else if (type === 'incident') icon = '🚨';

    const nowStr = new Date().toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    let extraInfo = '';
    if (metadata && typeof metadata === 'object') {
      extraInfo = Object.entries(metadata)
        .map(([k, v]) => `• <b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}`)
        .join('\n');
    }

    const htmlText = `${icon} <b>${escapeHtml(title || 'REFINERY SYSTEM ALERT')}</b>
━━━━━━━━━━━━━━━━━━━━━━
${escapeHtml(message || '')}
${extraInfo ? `\n${extraInfo}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━
🕒 <b>Waktu:</b> ${escapeHtml(nowStr)} (MYT)
🏭 <b>Kilang:</b> Lam Soon Refinery Digital`;

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID.trim(),
        text: htmlText,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || !data.ok) {
      return NextResponse.json({
        success: false,
        error: data.description || `Telegram error ${tgRes.status}`,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: data.result?.message_id,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Failed to dispatch Telegram alert',
    }, { status: 500 });
  }
}
