/**
 * DB-backed cache for OpenWeatherMap map tiles.
 *
 * Browsers never talk to OWM directly (that burned the 60 rpm free quota: one
 * request per tile per user). They hit our tile route, which serves the stored
 * PNG; OWM is only called when a tile is missing/stale, or by the cron that
 * keeps recently-viewed ("hot") tiles fresh.
 */
import { prisma } from '@/lib/prisma';

export const WEATHER_LAYERS = ['wind', 'temp', 'clouds', 'precipitation', 'pressure'] as const;
export type WeatherLayer = (typeof WEATHER_LAYERS)[number];

export const TILE_TTL_MS = 5 * 60 * 1000;
/** Tiles nobody has requested for this long stop being refreshed by the cron. */
const HOT_WINDOW_MS = 30 * 60 * 1000;
/** ...and are deleted after this long. */
const PURGE_AFTER_MS = 6 * 60 * 60 * 1000;
/** Only bump last_requested_at this often, to avoid a write per tile hit. */
const TOUCH_INTERVAL_MS = 60 * 1000;
/** Free plan = 60 rpm; stay well under it per instance. */
const UPSTREAM_MAX_PER_MINUTE = 45;
const CRON_MAX_TILES_PER_RUN = 40;
const CRON_CONCURRENCY = 5;

export function isWeatherLayer(v: string): v is WeatherLayer {
  return (WEATHER_LAYERS as readonly string[]).includes(v);
}

export function isValidTileCoord(z: number, x: number, y: number): boolean {
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 18 || x < 0 || y < 0) return false;
  const max = 2 ** z;
  return x < max && y < max;
}

// ---- upstream (OWM) with a per-instance rolling-minute budget ----
const upstreamCalls: number[] = [];
function takeUpstreamBudget(): boolean {
  const cutoff = Date.now() - 60_000;
  while (upstreamCalls.length && upstreamCalls[0] < cutoff) upstreamCalls.shift();
  if (upstreamCalls.length >= UPSTREAM_MAX_PER_MINUTE) return false;
  upstreamCalls.push(Date.now());
  return true;
}

async function fetchUpstream(layer: WeatherLayer, z: number, x: number, y: number): Promise<Buffer | null> {
  const key = process.env.NEXT_PUBLIC_OWM_API_KEY;
  if (!key || !takeUpstreamBudget()) return null;
  try {
    const res = await fetch(`https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${key}`, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[weather-tiles] OWM responded ${res.status} for ${layer}/${z}/${x}/${y}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error('[weather-tiles] OWM fetch failed:', err);
    return null;
  }
}

// Collapse concurrent refreshes of the same tile into one upstream call.
const inflight = new Map<string, Promise<Buffer | null>>();

async function refreshTile(layer: WeatherLayer, z: number, x: number, y: number): Promise<Buffer | null> {
  const k = `${layer}/${z}/${x}/${y}`;
  const existing = inflight.get(k);
  if (existing) return existing;

  const p = (async () => {
    const data = await fetchUpstream(layer, z, x, y);
    if (!data) return null;
    const now = new Date();
    await prisma.weather_tile.upsert({
      where: { layer_z_x_y: { layer, z, x, y } },
      create: { layer, z, x, y, data: new Uint8Array(data), fetched_at: now, last_requested_at: now },
      update: { data: new Uint8Array(data), fetched_at: now },
    });
    return data;
  })().finally(() => inflight.delete(k));

  inflight.set(k, p);
  return p;
}

export interface TileResult {
  data: Buffer;
  fetchedAt: Date;
  stale: boolean;
}

/** Serve from DB if fresh; otherwise refresh from OWM (falling back to stale data on failure). */
export async function getWeatherTile(layer: WeatherLayer, z: number, x: number, y: number): Promise<TileResult | null> {
  const row = await prisma.weather_tile.findUnique({ where: { layer_z_x_y: { layer, z, x, y } } });
  const now = Date.now();

  if (row && now - row.fetched_at.getTime() < TILE_TTL_MS) {
    if (now - row.last_requested_at.getTime() > TOUCH_INTERVAL_MS) {
      prisma.weather_tile
        .update({ where: { tile_id: row.tile_id }, data: { last_requested_at: new Date() } })
        .catch(() => {});
    }
    return { data: Buffer.from(row.data), fetchedAt: row.fetched_at, stale: false };
  }

  const fresh = await refreshTile(layer, z, x, y);
  if (fresh) {
    // Mark as requested so the cron keeps it warm (upsert-update doesn't touch last_requested_at).
    if (row) {
      prisma.weather_tile
        .update({ where: { tile_id: row.tile_id }, data: { last_requested_at: new Date() } })
        .catch(() => {});
    }
    return { data: fresh, fetchedAt: new Date(), stale: false };
  }
  if (row) return { data: Buffer.from(row.data), fetchedAt: row.fetched_at, stale: true };
  return null;
}

/** Timestamp of the most recent successful refresh, for the "last updated" label. */
export async function getLatestWeatherUpdate(): Promise<Date | null> {
  const row = await prisma.weather_tile.aggregate({ _max: { fetched_at: true } });
  return row._max.fetched_at;
}

/** Cron: re-fetch recently-viewed tiles whose copy is older than the TTL, then purge abandoned ones. */
export async function refreshHotWeatherTiles() {
  const now = Date.now();
  const due = await prisma.weather_tile.findMany({
    where: {
      last_requested_at: { gte: new Date(now - HOT_WINDOW_MS) },
      // 30s slack so a tile fetched ~5min ago by the previous run isn't skipped for a whole cycle.
      fetched_at: { lt: new Date(now - TILE_TTL_MS + 30_000) },
    },
    select: { layer: true, z: true, x: true, y: true },
    orderBy: { fetched_at: 'asc' },
    take: CRON_MAX_TILES_PER_RUN,
  });

  let refreshed = 0;
  let failed = 0;
  for (let i = 0; i < due.length; i += CRON_CONCURRENCY) {
    const results = await Promise.all(
      due.slice(i, i + CRON_CONCURRENCY).map((t) =>
        isWeatherLayer(t.layer) ? refreshTile(t.layer, t.z, t.x, t.y) : Promise.resolve(null)
      )
    );
    for (const r of results) {
      if (r) refreshed++;
      else failed++;
    }
  }

  const purged = await prisma.weather_tile.deleteMany({
    where: { last_requested_at: { lt: new Date(now - PURGE_AFTER_MS) } },
  });

  return { message: 'Weather tiles refresh completed', due: due.length, refreshed, failed, purged: purged.count };
}
