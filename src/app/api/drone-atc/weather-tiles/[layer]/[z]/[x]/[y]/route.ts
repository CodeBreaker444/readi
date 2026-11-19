import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { getWeatherTile, isValidTileCoord, isWeatherLayer } from '@/backend/services/weather/weather-tile-cache';

type Params = { params: Promise<{ layer: string; z: string; x: string; y: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requireAuth();
  if (error) return error;

  const p = await params;
  const z = Number(p.z);
  const x = Number(p.x);
  const y = Number(p.y);
  if (!isWeatherLayer(p.layer) || !isValidTileCoord(z, x, y)) {
    return NextResponse.json({ error: 'Invalid tile' }, { status: 400 });
  }

  const tile = await getWeatherTile(p.layer, z, x, y);
  if (!tile) return new NextResponse(null, { status: 503 });

  return new NextResponse(new Uint8Array(tile.data), {
    headers: {
      'Content-Type': 'image/png',
      // Browser may reuse for 1 min; the DB copy is the 5-min source of truth.
      'Cache-Control': 'private, max-age=60',
      'X-Weather-Updated': tile.fetchedAt.toISOString(),
    },
  });
}
