import 'server-only';

import type { SlotWeather } from '@/config/types/slot-booking';
import { GENERIC_LIMITS, scoreHour, summariseWindow, type HourWeather } from '@/lib/btf/scoring';
import { readToolLocation } from '@/lib/btf/location';
import { prisma } from '@/lib/prisma';
import { WEATHER_DAYS, weatherLevel } from '@/lib/slot-booking-logic';
import { addDaysIso, todayIso } from '@/lib/slot-booking-utils';
import { fetchBtfForecast } from '../operation/btf-service';

export type WeatherNote = 'no_location' | 'unavailable' | null;

export interface WeatherSlot {
  id: number;
  date: string;
  start: string;
  end: string;
}

/** Slots on today..today+6 get a forecast; anything else has none. */
export function isInForecastRange(date: string, today = todayIso()) {
  return date >= today && date <= addDaysIso(today, WEATHER_DAYS - 1);
}

/**
 * Where to forecast: the base location the OPM saved in Slot Settings, otherwise the first system of the
 * company that has a location. Null when neither exists.
 */
export async function getBaseLocation(ownerId: number): Promise<{ lat: number; lon: number } | null> {
  const settings = await prisma.slot_settings.findUnique({
    where: { fk_owner_id: ownerId },
    select: { base_latitude: true, base_longitude: true },
  });
  if (settings?.base_latitude != null && settings.base_longitude != null) {
    return { lat: settings.base_latitude, lon: settings.base_longitude };
  }
  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId, tool_active: 'Y' },
    select: { tool_metadata: true, location: true },
    take: 50,
  });
  for (const t of tools) {
    const site = readToolLocation(t.tool_metadata, t.location);
    if (site) return { lat: site.latitude, lon: site.longitude };
  }
  return null;
}

/** Hours of the forecast that fall inside the slot (local wall-clock strings compare chronologically). */
function hoursOfSlot(hours: HourWeather[], slot: WeatherSlot): HourWeather[] {
  const from = `${slot.date}T${slot.start}`;
  const to = `${slot.end <= slot.start ? addDaysIso(slot.date, 1) : slot.date}T${slot.end}`;
  return hours.filter((h) => h.time >= from && h.time < to);
}

/**
 * Weather per slot, judged with the generic drone limits. Daylight is ignored on purpose: the OPM wants to know
 * how rough the weather is, not whether it is dark (night shifts are real slots).
 */
export function summariseSlotWeather(hours: HourWeather[], slot: WeatherSlot): SlotWeather | null {
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

/** Never throws: a weather outage must not break slot booking. */
export async function getWeatherForSlots(
  ownerId: number,
  slots: WeatherSlot[],
): Promise<{ weather: Record<number, SlotWeather>; note: WeatherNote }> {
  const inRange = slots.filter((s) => isInForecastRange(s.date));
  if (!inRange.length) return { weather: {}, note: null };
  try {
    const where = await getBaseLocation(ownerId);
    if (!where) return { weather: {}, note: 'no_location' };
    const forecast = await fetchBtfForecast(where.lat, where.lon, WEATHER_DAYS);
    if (!forecast) return { weather: {}, note: 'unavailable' };
    const weather: Record<number, SlotWeather> = {};
    for (const s of inRange) {
      const w = summariseSlotWeather(forecast.hours, s);
      if (w) weather[s.id] = w;
    }
    return { weather, note: null };
  } catch (err) {
    console.error('[slot-booking] weather lookup failed', err);
    return { weather: {}, note: 'unavailable' };
  }
}
