import { env } from "@/backend/config/env";

interface AirspaceZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  class: 'A' | 'B' | 'C' | 'D';
  type: 'CTR' | 'TMA' | 'AIRPORT' | 'RESTRICTED';
  lowerFt: number;
  upperFt: number;
}

export const ITALY_BOUNDS = { latMin: 35.5, lonMin: 6.5, latMax: 47.1, lonMax: 18.6 } as const;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let _cache: AirspaceZone[] | null = null;
let _cacheAt = 0;

const OPENAIP_TYPE_MAP: Record<number, AirspaceZone['type']> = {
  1: 'RESTRICTED',
  4: 'CTR',
  5: 'TMA',
  25: 'TMA',   
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

function mapOpenAIPItem(item: Record<string, unknown>): AirspaceZone | null {
  try {
    const cls = item.airspaceClass as string;
    if (!['A', 'C', 'D'].includes(cls)) return null;

    const type = OPENAIP_TYPE_MAP[item.type as number];
    if (!type) return null;

    const geom = item.geometry as { coordinates?: [number, number][][] } | undefined;
    const ring = geom?.coordinates?.[0];
    if (!ring || ring.length < 3) return null;

    const { lat, lon, radiusM } = centroidAndRadius(ring);

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
      class: cls as AirspaceZone['class'],
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
  if (!apiKey) return null;

  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) return _cache;

  const zones: AirspaceZone[] = [];
  let page = 1;

  try {
    while (true) {
      const res = await fetch(
        `${env.OPENAIP_BASE}/airspaces?country=IT&page=${page}&limit=100`,
        {
          headers: { 'x-openaip-api-key': apiKey, Accept: 'application/json' },
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!res.ok) {
        console.error('[drone-atc/airspace] OpenAIP error:', res.status);
        break;
      }

      const body = await res.json() as { items?: Record<string, unknown>[]; totalCount?: number };
      const items = body.items ?? [];

      for (const item of items) {
        const z = mapOpenAIPItem(item);
        if (z) zones.push(z);
      }

      if (items.length < 100) break;
      page++;
    }
  } catch (err) {
    console.error('[drone-atc/airspace] OpenAIP fetch failed:', err);
    return null;
  }

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