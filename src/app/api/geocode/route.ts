import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 3) {
    return NextResponse.json([]);
  }

  // lang=en is required — lang=it silently returns empty features for many queries.
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=5&lang=en`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('[geocode] Photon error:', res.status);
      return NextResponse.json([]);
    }

    const geojson = await res.json();
    console.log('[geocode] query:', q.trim(), '— features:', geojson.features?.length ?? 0);

    const results = (geojson.features ?? []).map((f: any, i: number) => {
      const p   = f.properties ?? {};
      const lon = f.geometry.coordinates[0]; // GeoJSON is always [lon, lat]
      const lat = f.geometry.coordinates[1];

      const parts = [
        p.name,
        p.street,
        p.village ?? p.town ?? p.city ?? p.county,
        p.state,
        p.country,
      ].filter(Boolean);

      return {
        place_id:     p.osm_id ?? i,
        display_name: parts.length > 0 ? parts.join(', ') : `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        lat: String(lat),
        lon: String(lon),
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    clearTimeout(timeout);
    console.error('[geocode] fetch error:', err);
    return NextResponse.json([]);
  }
}
