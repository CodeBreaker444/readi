import { env } from '@/backend/config/env';
import { fetchFromOpenAIP, filterByBounds, ITALY_BOUNDS } from '@/lib/airspace-classification';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

 
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const south = parseFloat(searchParams.get('south') || String(ITALY_BOUNDS.latMin));
  const west  = parseFloat(searchParams.get('west')  || String(ITALY_BOUNDS.lonMin));
  const north = parseFloat(searchParams.get('north') || String(ITALY_BOUNDS.latMax));
  const east  = parseFloat(searchParams.get('east')  || String(ITALY_BOUNDS.lonMax));

  const qS = Math.max(south, ITALY_BOUNDS.latMin);
  const qW = Math.max(west,  ITALY_BOUNDS.lonMin);
  const qN = Math.min(north, ITALY_BOUNDS.latMax);
  const qE = Math.min(east,  ITALY_BOUNDS.lonMax);

  if (qS >= qN || qW >= qE) {
    return NextResponse.json({ airspace: [], timestamp: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  try {
    const allZones = await fetchFromOpenAIP();
    if(!allZones) {
      console.warn('[drone-atc/airspace] No OpenAIP data, returning empty set');
      return NextResponse.json(
        { airspace: [], timestamp: new Date().toISOString(), source: 'none' },
        { headers: { 'Cache-Control': 'public, max-age=3600' } },
      );
    }
    const filtered = filterByBounds(allZones, qS, qW, qN, qE);

    return NextResponse.json(
      { airspace: filtered, timestamp: new Date().toISOString(), source: env.OPENAIP_API_KEY ? 'openaip' : 'static' },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  } catch (err) {
    console.error('[drone-atc/airspace] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch airspace data', airspace: [] },
      { status: 500 },
    );
  }
}
