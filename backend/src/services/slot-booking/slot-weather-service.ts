import 'server-only';

import type { SlotWeather } from '@/config/types/slot-booking';
import { GENERIC_LIMITS, scoreHour, summariseWindow, type HourWeather } from '@/lib/btf/scoring';
import { readToolLocation } from '@/lib/btf/location';
import { prisma } from '@/lib/prisma';
import { WEATHER_DAYS, weatherLevel } from '@/lib/slot-booking-logic';
import { addDaysIso, todayIso } from '@/lib/slot-booking-utils';
import { getCachedForecast } from '../weather/forecast-cache';

export type WeatherNote = 'no_location' | 'unavailable' | null;

export interface WeatherSlot {
  id: number;
  /** Slot group of the slot; its system decides where the forecast is taken. */
  groupId: number;
  date: string;
  start: string;
  end: string;
}

/** Slots on today..today+6 get a forecast; anything else has none. */
export function isInForecastRange(date: string, today = todayIso()) {
  return date >= today && date <= addDaysIso(today, WEATHER_DAYS - 1);
}

/** Coordinates of the system chosen for each slot group; groups without a system or a usable location are left out. */
async function getGroupLocations(ownerId: number, groupIds: number[]): Promise<Map<number, { lat: number; lon: number }>> {
  const out = new Map<number, { lat: number; lon: number }>();
  if (!groupIds.length) return out;
  const groups = await prisma.slot_group.findMany({
    where: { slot_group_id: { in: groupIds }, fk_owner_id: ownerId, fk_tool_id: { not: null } },
    select: { slot_group_id: true, fk_tool_id: true },
  });
  const toolIds = [...new Set(groups.map((g) => g.fk_tool_id).filter((v): v is number => v != null))];
  if (!toolIds.length) return out;
  const tools = await prisma.tool.findMany({
    where: { tool_id: { in: toolIds }, fk_owner_id: ownerId },
    select: { tool_id: true, tool_metadata: true, location: true },
  });
  const byTool = new Map<number, { lat: number; lon: number }>();
  for (const t of tools) {
    const site = readToolLocation(t.tool_metadata, t.location);
    if (site) byTool.set(t.tool_id, { lat: site.latitude, lon: site.longitude });
  }
  for (const g of groups) {
    const where = g.fk_tool_id != null ? byTool.get(g.fk_tool_id) : undefined;
    if (where) out.set(g.slot_group_id, where);
  }
  return out;
}

/** Hours of the forecast that fall inside the slot (local wall-clock strings compare chronologically). */
function hoursOfSlot(hours: HourWeather[], slot: Omit<WeatherSlot, 'groupId'>): HourWeather[] {
  const from = `${slot.date}T${slot.start}`;
  const to = `${slot.end <= slot.start ? addDaysIso(slot.date, 1) : slot.date}T${slot.end}`;
  return hours.filter((h) => h.time >= from && h.time < to);
}

/**
 * Weather per slot, judged with the generic drone limits. Daylight is ignored on purpose: the OPM wants to know
 * how rough the weather is, not whether it is dark (night shifts are real slots).
 */
export function summariseSlotWeather(hours: HourWeather[], slot: Omit<WeatherSlot, 'groupId'>): SlotWeather | null {
  const window = hoursOfSlot(hours, slot).map((h) => ({ ...h, isDay: true }));
  if (!window.length) return null;
  const w = summariseWindow(window, window.map((h) => scoreHour(h, GENERIC_LIMITS)));
  return {
    level: weatherLevel(w.status),
    limiting: w.limiting,
    avgWindMs: Math.round(w.avgWindMs * 10) / 10,
    maxGustMs: Math.round(w.maxGustMs * 10) / 10,
    rainMm: Math.round(w.rainMm * 10) / 10,
    tempC: w.avgTempC === null ? null : Math.round(w.avgTempC),
    weatherCode: w.weatherCode,
  };
}

/**
 * Never throws: a weather outage must not break slot booking.
 * Each slot is forecast at the system of its slot group. Slots of groups without a system (or whose system has no
 * location) get no weather; the note is "no_location" when that leaves every slot in range without one.
 */
export async function getWeatherForSlots(
  ownerId: number,
  slots: WeatherSlot[],
): Promise<{ weather: Record<number, SlotWeather>; note: WeatherNote; fetchedAt?: string | null }> {
  const inRange = slots.filter((s) => isInForecastRange(s.date));
  if (!inRange.length) return { weather: {}, note: null };
  try {
    const locations = await getGroupLocations(ownerId, [...new Set(inRange.map((s) => s.groupId))]);
    const located = inRange.filter((s) => locations.has(s.groupId));
    if (!located.length) return { weather: {}, note: 'no_location' };

    // One forecast per place (nearby systems share a cached forecast).
    const places = new Map<string, { lat: number; lon: number }>();
    for (const s of located) {
      const w = locations.get(s.groupId)!;
      places.set(`${w.lat},${w.lon}`, w);
    }
    const forecasts = new Map<string, Awaited<ReturnType<typeof getCachedForecast>>>();
    await Promise.all([...places].map(async ([key, w]) => forecasts.set(key, await getCachedForecast(w.lat, w.lon))));

    const weather: Record<number, SlotWeather> = {};
    let fetched = 0;
    for (const s of located) {
      const w = locations.get(s.groupId)!;
      const forecast = forecasts.get(`${w.lat},${w.lon}`);
      if (!forecast) continue;
      fetched = Math.max(fetched, new Date(forecast.retrievedAt).getTime());
      const sw = summariseSlotWeather(forecast.hours, s);
      if (sw) weather[s.id] = sw;
    }
    if (!fetched) return { weather: {}, note: 'unavailable' };
    return { weather, note: null, fetchedAt: new Date(fetched).toISOString() };
  } catch (err) {
    console.error('[slot-booking] weather lookup failed', err);
    return { weather: {}, note: 'unavailable' };
  }
}
