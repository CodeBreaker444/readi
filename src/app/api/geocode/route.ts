import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 3) {
    return NextResponse.json([]);
  }

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json([]);

    const geojson = await res.json();

    // Transform GeoJSON FeatureCollection → NominatimResult shape
    const results = (geojson.features ?? []).map((f: any, i: number) => {
      const p = f.properties ?? {};
      const parts = [
        p.name,
        p.housenumber && p.street ? `${p.street} ${p.housenumber}` : p.street,
        p.city ?? p.county,
        p.state,
        p.country,
      ].filter(Boolean);
      return {
        place_id: p.osm_id ?? i,
        display_name: parts.join(', '),
        lat: String(f.geometry.coordinates[1]),
        lon: String(f.geometry.coordinates[0]),
      };
    });

    return NextResponse.json(results);
  } catch {
    clearTimeout(timeout);
    return NextResponse.json([]);
  }
}
