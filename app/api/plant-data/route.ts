import { NextResponse } from 'next/server';

import initialSheetsSeed from '@/lib/initial-sheets.json';
import initialSamplesSeed from '@/lib/initial-samples.json';

export const dynamic = 'force-dynamic';

// In-memory cache for ultra-fast serving across all clients
let cachedSnapshot: any = {
  plant: 'Lam Soon Edible Oils Sdn. Bhd.',
  unit: 'Nisshin Deodorizer Plant (PRD-REF-001)',
  timestamp: '2026-09-30T17:00:00+08:00',
  sheets: initialSheetsSeed,
  samples: initialSamplesSeed,
  audit_logs: [],
  profiles_count: 6,
};

function getSnapshot(): any {
  return cachedSnapshot;
}

// GET: Deliver master plant dataset (10 process sheets, 54 sample reports, audit logs) to any client
export async function GET() {
  try {
    const snapshot = getSnapshot();

    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: 'Master plant snapshot file not found on server.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plant: snapshot.plant || 'Lam Soon Edible Oils Sdn. Bhd.',
      unit: snapshot.unit || 'Nisshin Deodorizer Plant (PRD-REF-001)',
      timestamp: snapshot.timestamp || new Date().toISOString(),
      sheets: snapshot.sheets || {},
      samples: snapshot.samples || [],
      audit_logs: snapshot.audit_logs || [],
      profiles_count: snapshot.profiles_count || 6,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      }
    });
  } catch (err: any) {
    console.error('[API /api/plant-data GET] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Merge updates or receive new sheet / report updates from plant workstations
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const snap = getSnapshot();
    if (snap) {
      if (body.sheets && typeof body.sheets === 'object') {
        cachedSnapshot.sheets = { ...cachedSnapshot.sheets, ...body.sheets };
      }
      if (Array.isArray(body.samples)) {
        const existingSampleMap = new Map((cachedSnapshot.samples || []).map((s: any) => [s.id || s.report_no, s]));
        body.samples.forEach((s: any) => {
          existingSampleMap.set(s.id || s.report_no, s);
        });
        cachedSnapshot.samples = Array.from(existingSampleMap.values());
      }
      if (Array.isArray(body.audit_logs)) {
        cachedSnapshot.audit_logs = [...(body.audit_logs || []), ...(cachedSnapshot.audit_logs || [])].slice(0, 500);
      }
    }

    return NextResponse.json({ success: true, message: 'Plant data synchronized on server memory' });
  } catch (err: any) {
    console.error('[API /api/plant-data POST] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
