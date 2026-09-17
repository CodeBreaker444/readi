import { env } from '@/backend/config/env';
import { COVERAGE_BOUNDS, fetchFromOpenAIP, filterByBounds } from '@/lib/airspace-classification';
import { requireAuth } from '@/lib/auth/api-auth';
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// persist across Vercel lambda invocations — in-memory cache dies on cold starts
const getCachedAirspaces = unstable_cache(
  () => fetchFromOpenAIP(),
  ['openaip-airspace-zones'],
  { revalidate: 86400 },
);

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const south = parseFloat(searchParams.get('south') || String(COVERAGE_BOUNDS.latMin));
  const west  = parseFloat(searchParams.get('west')  || String(COVERAGE_BOUNDS.lonMin));
  const north = parseFloat(searchParams.get('north') || String(COVERAGE_BOUNDS.latMax));
  const east  = parseFloat(searchParams.get('east')  || String(COVERAGE_BOUNDS.lonMax));

  const qS = Math.max(south, COVERAGE_BOUNDS.latMin);
  const qW = Math.max(west,  COVERAGE_BOUNDS.lonMin);
  const qN = Math.min(north, COVERAGE_BOUNDS.latMax);
  const qE = Math.min(east,  COVERAGE_BOUNDS.lonMax);

  if (qS >= qN || qW >= qE) {
    return NextResponse.json({ airspace: [], timestamp: new Date().toISOString() }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  try {
    const allZones = await getCachedAirspaces();
    if(!allZones) {
      return NextResponse.json(
        {
          airspace: [],
          timestamp: new Date().toISOString(),
          source: 'none',
          debug: {
            hasApiKey: !!env.OPENAIP_API_KEY,
            apiKeyPrefix: env.OPENAIP_API_KEY?.slice(0, 6) ?? null,
            hasBaseUrl: !!env.OPENAIP_BASE,
            baseUrl: env.OPENAIP_BASE ?? null,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } },
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
