import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GeoResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  /** [min_lat, max_lat, min_lon, max_lon] — only present for Nominatim results */
  boundingbox?: [string, string, string, string];
}

// ─── Photon (primary) ────────────────────────────────────────────────────────
// Returns OSM node coordinates — more intuitive than Nominatim polygon centroids.

async function searchPhoton(q: string, biasLat?: string, biasLon?: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({ q, limit: '8', lang: 'en' });
  if (biasLat && biasLon) {
    params.set('lat', biasLat);
    params.set('lon', biasLon);
  }
  const url = `https://photon.komoot.io/api/?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Readi-DroneManagement/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.features)) return [];
    return data.features
      .filter((f: any) => f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates))
      .map((f: any, i: number) => {
        // GeoJSON coordinate order is [longitude, latitude] — must swap
        const [lon, lat] = f.geometry.coordinates as [number, number];
        const p = f.properties ?? {};
        const street = p.housenumber
          ? `${p.street ?? ''} ${p.housenumber}`.trim()
          : (p.street ?? undefined);
        const raw = [p.name, street, p.city, p.state, p.country];
        const display_name = Array.from(new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0))).join(', ');
        return {
          place_id: p.osm_id ?? i,
          display_name: display_name || q,
          lat: String(lat),
          lon: String(lon),
        } satisfies GeoResult;
      });
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// ─── Nominatim (fallback) ─────────────────────────────────────────────────────

interface NominatimRaw {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
}

async function searchNominatim(q: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    format: 'json',
    q,
    limit: '8',
    addressdetails: '0',
    extratags: '0',
    namedetails: '0',
    dedupe: '1',
  });
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'Readi-DroneManagement/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const raw: NominatimRaw[] = (await res.json()) ?? [];
    return raw.map((r) => ({
      place_id: r.place_id,
      display_name: r.display_name,
      lat: r.lat,
      lon: r.lon,
      boundingbox: r.boundingbox,
    }));
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q');
  if (!q || q.trim().length < 3) return NextResponse.json([]);

  const query = q.trim();
  const biasLat = searchParams.get('lat') ?? undefined;
  const biasLon = searchParams.get('lon') ?? undefined;

  // Photon returns OSM node coordinates — more precise than Nominatim polygon centroids.
  const photon = await searchPhoton(query, biasLat, biasLon);
  if (photon.length > 0) return NextResponse.json(photon);

  // Nominatim fallback — also returns boundingbox for fitBounds in LocationPicker.
  const nominatim = await searchNominatim(query);
  return NextResponse.json(nominatim);
}
