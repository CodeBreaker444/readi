/**
 * DB-backed cache for the hourly point forecast used by slot booking (calendar, day preview, assign dropdown).
 *
 * Like the Drone ATC weather tiles: pages read the stored forecast, and Open-Meteo is only called when a location
 * has no copy or the copy is stale, or by the cron that keeps recently-viewed ("hot") locations fresh. The copy is
 * shared by every server instance, unlike the in-memory cache inside fetchBtfForecast.
 */
import { fetchBtfForecast } from '@/backend/services/operation/btf-service';
import type { BtfForecast } from '@/lib/btf/types';
import { prisma } from '@/lib/prisma';
import { WEATHER_DAYS } from '@/lib/slot-booking-logic';
import type { Prisma } from '@prisma/client';

export const FORECAST_DAYS = WEATHER_DAYS;
export const FORECAST_TTL_MS = 30 * 60 * 1000;
/** A copy this old is still better than no weather when Open-Meteo is down. */
const STALE_OK_MS = 6 * 60 * 60 * 1000;
/** Locations nobody asked for within this window stop being refreshed by the cron. */
const HOT_WINDOW_MS = 6 * 60 * 60 * 1000;
/** ...and are deleted after this long. */
const PURGE_AFTER_MS = 24 * 60 * 60 * 1000;
/** Only bump last_requested_at this often, to avoid a write per read. */
const TOUCH_INTERVAL_MS = 60 * 1000;
const CRON_MAX_PER_RUN = 20;

/** ~1 km: nearby systems and base locations share one forecast. */
const keyOf = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

// Collapse concurrent refreshes of the same location into one upstream call.
const inflight = new Map<string, Promise<BtfForecast | null>>();

async function refresh(lat: number, lon: number): Promise<BtfForecast | null> {
  const key = keyOf(lat, lon);
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    const forecast = await fetchBtfForecast(lat, lon, FORECAST_DAYS);
    if (!forecast) return null;
    const now = new Date();
    const data = forecast as unknown as Prisma.InputJsonValue;
    await prisma.weather_forecast.upsert({
      where: { cache_key: key },
      create: { cache_key: key, latitude: lat, longitude: lon, data, fetched_at: now, last_requested_at: now },
      update: { data, fetched_at: now },
    });
    return forecast;
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

/** Stored forecast if fresh; otherwise refreshed from Open-Meteo, falling back to a recent stale copy. */
export async function getCachedForecast(lat: number, lon: number): Promise<BtfForecast | null> {
  const key = keyOf(lat, lon);
  let row: Awaited<ReturnType<typeof prisma.weather_forecast.findUnique>> = null;
  try {
    row = await prisma.weather_forecast.findUnique({ where: { cache_key: key } });
  } catch (err) {
    // e.g. the table has not been created yet: behave as if there is no cache.
    console.error('[weather-forecast] cache read failed:', err);
  }
  const now = Date.now();

  if (row && now - row.fetched_at.getTime() < FORECAST_TTL_MS) {
    if (now - row.last_requested_at.getTime() > TOUCH_INTERVAL_MS) {
      prisma.weather_forecast.update({ where: { forecast_id: row.forecast_id }, data: { last_requested_at: new Date() } }).catch(() => {});
    }
    return row.data as unknown as BtfForecast;
  }

  let fresh: BtfForecast | null = null;
  try {
    fresh = await refresh(lat, lon);
  } catch (err) {
    console.error('[weather-forecast] refresh failed:', err);
  }
  if (fresh) {
    // Mark as requested so the cron keeps it warm (upsert-update does not touch last_requested_at).
    if (row) prisma.weather_forecast.update({ where: { forecast_id: row.forecast_id }, data: { last_requested_at: new Date() } }).catch(() => {});
    return fresh;
  }
  if (row && now - row.fetched_at.getTime() < STALE_OK_MS) return row.data as unknown as BtfForecast;
  return null;
}

/** Cron: re-fetch recently-viewed locations whose copy is older than the TTL, then purge abandoned ones. */
export async function refreshHotForecasts() {
  const now = Date.now();
  const due = await prisma.weather_forecast.findMany({
    where: {
      last_requested_at: { gte: new Date(now - HOT_WINDOW_MS) },
      // Slack so a copy fetched ~30 min ago by the previous run is not skipped for a whole cycle.
      fetched_at: { lt: new Date(now - FORECAST_TTL_MS + 60_000) },
    },
    select: { latitude: true, longitude: true },
    orderBy: { fetched_at: 'asc' },
    take: CRON_MAX_PER_RUN,
  });

  let refreshed = 0;
  let failed = 0;
  for (const d of due) {
    if (await refresh(d.latitude, d.longitude)) refreshed++;
    else failed++;
  }

  const purged = await prisma.weather_forecast.deleteMany({ where: { last_requested_at: { lt: new Date(now - PURGE_AFTER_MS) } } });
  return { message: 'Weather forecast refresh completed', due: due.length, refreshed, failed, purged: purged.count };
}
