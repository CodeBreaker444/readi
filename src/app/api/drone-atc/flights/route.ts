import { env } from '@/backend/config/env';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export interface AircraftState {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  altitude: number | null;
  onGround: boolean;
  velocity: number | null;
  heading: number | null;
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const latMin = searchParams.get('latMin');
  const lonMin = searchParams.get('lonMin');
  const latMax = searchParams.get('latMax');
  const lonMax = searchParams.get('lonMax');

  if (!latMin || !lonMin || !latMax || !lonMax) {
    return NextResponse.json({ error: 'Bounding box params required' }, { status: 400 });
  }

  const url = new URL('https://opensky-network.org/api/states/all');
  url.searchParams.set('lamin', latMin);
  url.searchParams.set('lomin', lonMin);
  url.searchParams.set('lamax', latMax);
  url.searchParams.set('lomax', lonMax);

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (env.OPENSKY_USERNAME && env.OPENSKY_PASSWORD) {
    const credentials = Buffer.from(`${env.OPENSKY_USERNAME}:${env.OPENSKY_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      next: { revalidate: 10 },
      headers,
    });
  } catch (err) {
    console.error('[drone-atc/flights] OpenSky fetch error:', err);
    return NextResponse.json({ aircraft: [] });
  }

  if (!res.ok) {
    console.warn('[drone-atc/flights] OpenSky non-OK:', res.status);
    return NextResponse.json({ aircraft: [] });
  }

  const data = await res.json();
  const states: AircraftState[] = (data.states ?? [])
    .filter((s: unknown[]) => s[5] != null && s[6] != null)
    .map((s: unknown[]) => ({
      icao24: s[0] as string,
      callsign: ((s[1] as string) ?? '').trim(),
      originCountry: s[2] as string,
      longitude: s[5] as number,
      latitude: s[6] as number,
      altitude: s[7] as number | null,
      onGround: s[8] as boolean,
      velocity: s[9] as number | null,
      heading: s[10] as number | null,
    }));

  return NextResponse.json({ aircraft: states, timestamp: data.time });
}
