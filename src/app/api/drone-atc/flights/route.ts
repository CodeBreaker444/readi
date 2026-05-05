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

  const centerLat = (parseFloat(latMin) + parseFloat(latMax)) / 2;
  const centerLon = (parseFloat(lonMin) + parseFloat(lonMax)) / 2;
  const latRadiusNm = ((parseFloat(latMax) - parseFloat(latMin)) / 2) * 60;
  const lonRadiusNm =
    ((parseFloat(lonMax) - parseFloat(lonMin)) / 2) *
    60 *
    Math.cos((centerLat * Math.PI) / 180);
  const radiusNm = Math.min(Math.max(latRadiusNm, lonRadiusNm), 250);

  const url = `https://api.airplanes.live/v2/point/${centerLat.toFixed(4)}/${centerLon.toFixed(4)}/${Math.ceil(radiusNm)}`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: 10 },
      headers: { Accept: 'application/json' },
      signal: abort.signal,
    });
  } catch (err) {
    console.error('[drone-atc/flights] airplanes.live fetch error:', err);
    return NextResponse.json({ aircraft: [] });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.warn('[drone-atc/flights] airplanes.live non-OK:', res.status);
    return NextResponse.json({ aircraft: [] });
  }

  const data = await res.json();

  const states: AircraftState[] = (data.ac ?? [])
    .filter((a: Record<string, unknown>) => a.lat != null && a.lon != null)
    .map((a: Record<string, unknown>) => {
      const altBaro = a.alt_baro;
      const onGround = altBaro === 'ground';
      const altMeters =
        !onGround && altBaro != null ? Math.round(Number(altBaro) * 0.3048) : null;

      return {
        icao24: String(a.hex ?? '').toLowerCase(),
        callsign: String(a.flight ?? '').trim(),
        originCountry: String(a.r ?? ''),
        latitude: a.lat as number,
        longitude: a.lon as number,
        altitude: altMeters,
        onGround,
        velocity: a.gs != null ? Math.round(Number(a.gs) * 0.5144) : null,
        heading: (a.track as number | null) ?? null,
      };
    });

  return NextResponse.json({ aircraft: states, timestamp: data.now });
}
