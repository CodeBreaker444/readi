import { env } from "@/backend/config/env";

interface AirspaceZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  class: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  type: 'CTR' | 'TMA' | 'AIRPORT' | 'RESTRICTED' | 'DANGER' | 'PROHIBITED' | 'ATZ' | 'FIR' | 'OTHER';
  lowerFt: number;
  upperFt: number;
}

export const ITALY_BOUNDS = { latMin: 35.5, lonMin: 6.5, latMax: 47.1, lonMax: 18.6 } as const;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let _cache: AirspaceZone[] | null = null;
let _cacheAt = 0;

const OPENAIP_TYPE_MAP: Record<number, AirspaceZone['type']> = {
  1: 'RESTRICTED',
  2: 'DANGER',
  3: 'PROHIBITED',
  4: 'CTR',
  5: 'TMA',
  6: 'TMA',
  7: 'TMA',
  8: 'TMA',
  9: 'FIR',
  10: 'FIR',
  12: 'ATZ',
  13: 'ATZ',
  14: 'OTHER',
  16: 'DANGER',
  17: 'DANGER',
  18: 'RESTRICTED',
  25: 'TMA',
  26: 'FIR',
};

function toFeet(value: number, unit: number): number {
  if (unit === 0) return Math.round(value * 3.28084);  
  if (unit === 6) return value * 100;                  
  return value;                                      
}

function centroidAndRadius(coords: [number, number][]): { lat: number; lon: number; radiusM: number } {
  const n = coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / n;
  const lon = coords.reduce((s, c) => s + c[0], 0) / n;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const radiusM = Math.max(
    ...coords.map(c => {
      const dy = (c[1] - lat) * 111320;
      const dx = (c[0] - lon) * 111320 * cosLat;
      return Math.sqrt(dx * dx + dy * dy);
    }),
  );
  return { lat, lon, radiusM: Math.round(radiusM) };
}

const CLASS_NUMBER_MAP: Record<number, AirspaceZone['class']> = {
  0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G',
};

const EXCLUDED_TYPES = new Set([5, 6, 7, 8, 9, 10, 25, 26]);
// Zones larger than 80 km radius render as country-wide blobs; skip them.
const MAX_RADIUS_M = 80_000;

function mapOpenAIPItem(item: Record<string, unknown>): AirspaceZone | null {
  try {
    const typeNum = item.type as number;
    if (EXCLUDED_TYPES.has(typeNum)) return null;

    const raw = item.icaoClass ?? item.airspaceClass;
    const cls: AirspaceZone['class'] | undefined =
      typeof raw === 'number'
        ? CLASS_NUMBER_MAP[raw]
        : (['A', 'B', 'C', 'D', 'E', 'F', 'G'] as string[]).includes(raw as string)
          ? (raw as AirspaceZone['class'])
          : undefined;
    if (!cls) return null;

    const type: AirspaceZone['type'] = OPENAIP_TYPE_MAP[typeNum] ?? 'OTHER';

    const geom = item.geometry as { coordinates?: [number, number][][] } | undefined;
    const ring = geom?.coordinates?.[0];
    if (!ring || ring.length < 3) return null;

    const { lat, lon, radiusM } = centroidAndRadius(ring);

    if (radiusM > MAX_RADIUS_M) return null;

    if (lat < ITALY_BOUNDS.latMin || lat > ITALY_BOUNDS.latMax ||
        lon < ITALY_BOUNDS.lonMin || lon > ITALY_BOUNDS.lonMax) return null;

    const lower = item.lowerLimit as { value?: number; unit?: number } | undefined;
    const upper = item.upperLimit as { value?: number; unit?: number } | undefined;

    return {
      id: String(item._id ?? item.id ?? `oaip_${lat.toFixed(4)}_${lon.toFixed(4)}`),
      name: String(item.name ?? ''),
      lat,
      lon,
      radiusM,
      class: cls,
      type,
      lowerFt: toFeet(lower?.value ?? 0, lower?.unit ?? 1),
      upperFt: toFeet(upper?.value ?? 0, upper?.unit ?? 1),
    };
  } catch {
    return null;
  }
}

export async function fetchFromOpenAIP(): Promise<AirspaceZone[] | null> {
  const apiKey = env.OPENAIP_API_KEY;
  const baseUrl = env.OPENAIP_BASE;

  console.log('[openAIP] apiKey present:', !!apiKey, '| baseUrl:', baseUrl);

  if (!apiKey) {
    console.error('[openAIP] OPENAIP_API_KEY is missing — check .env');
    return null;
  }
  if (!baseUrl) {
    console.error('[openAIP] OPENAIP_BASE is missing — check .env');
    return null;
  }

  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) {
    console.log('[openAIP] returning cached zones:', _cache.length);
    return _cache;
  }

  const zones: AirspaceZone[] = [];
  let page = 1;

  try {
    while (true) {
      const url = `${baseUrl}/airspaces?country=IT&page=${page}&limit=100`;
      console.log('[openAIP] fetching page', page, url);

      const res = await fetch(url, {
        headers: { 'x-openaip-api-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });

      console.log('[openAIP] page', page, 'status:', res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error('[openAIP] error body:', text.slice(0, 300));
        break;
      }

      const raw = await res.text();
      console.log('[openAIP] raw body sample:', raw.slice(0, 400));

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(raw);
      } catch {
        console.error('[openAIP] failed to parse JSON');
        break;
      }

      const items: Record<string, unknown>[] =
        (body.items as Record<string, unknown>[] | undefined) ??
        (body.data  as Record<string, unknown>[] | undefined) ??
        (Array.isArray(body) ? (body as Record<string, unknown>[]) : []);

      console.log('[openAIP] page', page, 'items received:', items.length);

      let parsed = 0;
      for (const item of items) {
        const z = mapOpenAIPItem(item);
        if (z) { zones.push(z); parsed++; }
      }
      console.log('[openAIP] page', page, 'zones parsed:', parsed, '/', items.length);

      if (items.length < 100) break;
      page++;
    }
  } catch (err) {
    console.error('[openAIP] fetch threw:', err);
    return null;
  }

  console.log('[openAIP] total zones after all pages:', zones.length);
  if (zones.length === 0) return null;

  _cache = zones;
  _cacheAt = Date.now();
  return zones;
}

export function filterByBounds(zones: AirspaceZone[], s: number, w: number, n: number, e: number) {
  return zones.filter(zone => {
    const latDeg = zone.radiusM / 111320;
    const lonDeg = zone.radiusM / (111320 * Math.cos((zone.lat * Math.PI) / 180));
    return (
      zone.lat - latDeg < n &&
      zone.lat + latDeg > s &&
      zone.lon - lonDeg < e &&
      zone.lon + lonDeg > w
    );
  });
}