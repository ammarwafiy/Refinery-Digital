import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// In-memory cache for ultra-fast serving across all clients
let cachedSnapshot: any = null;

function loadSnapshotFromDisk(): any {
  if (cachedSnapshot) return cachedSnapshot;

  const candidatePaths = [
    path.join(process.cwd(), 'public', 'plant-snapshot.json'),
    path.join(process.cwd(), 'Refinery_Plant_Snapshot_2026-09-30.json'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        cachedSnapshot = JSON.parse(raw);
        console.info(`[API /api/plant-data] Successfully loaded master snapshot from ${p}`);
        return cachedSnapshot;
      } catch (err) {
        console.warn(`[API /api/plant-data] Failed to parse ${p}:`, err);
      }
    }
  }

  return null;
}

// GET: Deliver master plant dataset (10 process sheets, 54 sample reports, audit logs) to any client
export async function GET() {
  try {
    const snapshot = loadSnapshotFromDisk();

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

    if (!cachedSnapshot) {
      loadSnapshotFromDisk();
    }

    if (cachedSnapshot) {
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
