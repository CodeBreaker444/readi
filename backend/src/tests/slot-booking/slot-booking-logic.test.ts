/**
 * Pure rules of Slot Booking v2: overlap, scheduled publishing, modification lock, merit score and slot weather.
 * No database involved.
 *
 * Run:  npm test -- slot-booking-logic
 */

jest.mock('@/lib/prisma', () => ({ prisma: {} }));

import { summariseSlotWeather } from '@/backend/services/slot-booking/slot-weather-service';
import type { HourWeather } from '@/lib/btf/scoring';
import {
  computeMerits,
  cycleWindow,
  flightLevel,
  intervalsOverlap,
  isPublished,
  isWeekend,
  MERIT_WEIGHTS,
  modificationLock,
  scheduleError,
  slotInterval,
  weatherLevel,
} from '@/lib/slot-booking-logic';

describe('slot overlap (collisions)', () => {
  it('detects the same window and partial overlaps', () => {
    const a = slotInterval('2026-06-01', '06:00', '14:00');
    expect(intervalsOverlap(a, slotInterval('2026-06-01', '06:00', '14:00'))).toBe(true);
    expect(intervalsOverlap(a, slotInterval('2026-06-01', '13:00', '15:00'))).toBe(true);
    expect(intervalsOverlap(a, slotInterval('2026-06-01', '08:00', '09:00'))).toBe(true);
  });

  it('treats back-to-back and different-day slots as free', () => {
    const a = slotInterval('2026-06-01', '06:00', '14:00');
    expect(intervalsOverlap(a, slotInterval('2026-06-01', '14:00', '22:00'))).toBe(false);
    expect(intervalsOverlap(a, slotInterval('2026-06-02', '06:00', '14:00'))).toBe(false);
  });

  it('handles the night shift that runs past midnight', () => {
    const night = slotInterval('2026-06-01', '22:00', '06:00');
    expect(new Date(night.to).toISOString()).toBe('2026-06-02T06:00:00.000Z');
    // Early morning of the next day overlaps the night shift of the previous date …
    expect(intervalsOverlap(night, slotInterval('2026-06-02', '05:00', '07:00'))).toBe(true);
    // … but the 06:00 shift starts exactly when it ends.
    expect(intervalsOverlap(night, slotInterval('2026-06-02', '06:00', '14:00'))).toBe(false);
    expect(intervalsOverlap(night, slotInterval('2026-06-01', '14:00', '22:00'))).toBe(false);
  });
});

describe('scheduled publishing', () => {
  const now = new Date('2026-06-01T12:00:00Z');

  it('is published when there is no publish time or it has passed', () => {
    expect(isPublished(null, now)).toBe(true);
    expect(isPublished(undefined, now)).toBe(true);
    expect(isPublished(new Date('2026-06-01T12:00:00Z'), now)).toBe(true);
    expect(isPublished(new Date('2026-06-01T11:59:59Z'), now)).toBe(true);
  });

  it('stays hidden until the publish time', () => {
    expect(isPublished(new Date('2026-06-01T12:00:01Z'), now)).toBe(false);
    expect(isPublished('2026-07-01T00:00:00Z', now)).toBe(false);
  });

  it('only accepts a publish time between one minute and a year ahead', () => {
    expect(scheduleError('not-a-date', now)).toMatch(/Invalid/);
    expect(scheduleError('2026-06-01T11:00:00Z', now)).toMatch(/future/);
    expect(scheduleError('2026-06-01T12:00:30Z', now)).toMatch(/future/);
    expect(scheduleError('2026-06-02T12:00:00Z', now)).toBeNull();
    expect(scheduleError('2028-01-01T00:00:00Z', now)).toMatch(/more than/);
  });
});

describe('modification lock (24h / 48h before the approval day)', () => {
  // Monday 2026-06-01 10:00 UTC; approval days Thursday (4) -> Thursday 2026-06-04 00:00 is 62h away.
  const monday = new Date('2026-06-01T10:00:00Z');

  it('is open when the approval day is further away than the window', () => {
    expect(modificationLock([4], 24, monday).locked).toBe(false);
    expect(modificationLock([4], 48, monday).locked).toBe(false);
  });

  it('locks inside the window: 48h locks from Tuesday 00:00, 24h from Wednesday 00:00', () => {
    expect(modificationLock([4], 48, new Date('2026-06-02T01:00:00Z')).locked).toBe(true);
    expect(modificationLock([4], 24, new Date('2026-06-02T01:00:00Z')).locked).toBe(false);
    expect(modificationLock([4], 24, new Date('2026-06-03T01:00:00Z')).locked).toBe(true);
    expect(modificationLock([4], 48, new Date('2026-05-31T23:00:00Z')).locked).toBe(false);
  });

  it('is locked all day on the approval day itself', () => {
    expect(modificationLock([1, 4], 24, monday).locked).toBe(true);
    expect(modificationLock([1, 4], 24, monday).approvalAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('never locks with 0 hours or when the group has no approval day', () => {
    expect(modificationLock([1], 0, monday).locked).toBe(false);
    expect(modificationLock([], 48, monday)).toEqual({ locked: false, approvalAt: null });
  });
});

describe('pilot merit score', () => {
  it('gives the best pilot in every measure 100 and nobody flying nothing 0', () => {
    const r = computeMerits([
      { userId: 1, requests: 10, weekendRequests: 4, hours: 20 },
      { userId: 2, requests: 0, weekendRequests: 0, hours: 0 },
    ]);
    expect(r.find((x) => x.userId === 1)).toMatchObject({ score: 100, rank: 1 });
    expect(r.find((x) => x.userId === 2)).toMatchObject({ score: 0, rank: 2 });
  });

  it('weights weekend availability (40%) above overall availability and hours (30% each)', () => {
    expect(MERIT_WEIGHTS.weekend).toBeGreaterThan(MERIT_WEIGHTS.availability);
    expect(MERIT_WEIGHTS.weekend + MERIT_WEIGHTS.availability + MERIT_WEIGHTS.hours).toBeCloseTo(1);
    const r = computeMerits([
      { userId: 1, requests: 10, weekendRequests: 10, hours: 0 }, // weekend + availability
      { userId: 2, requests: 10, weekendRequests: 0, hours: 10 }, // availability + hours
      { userId: 3, requests: 0, weekendRequests: 0, hours: 10 },
    ]);
    const score = (id: number) => r.find((x) => x.userId === id)!.score;
    expect(score(1)).toBe(70); // 0.4 + 0.3
    expect(score(2)).toBe(60); // 0.3 + 0.3
    expect(score(3)).toBe(30);
    expect(score(1)).toBeGreaterThan(score(2));
  });

  it('shares a rank between equal scores and copes with an empty list / all-zero data', () => {
    const r = computeMerits([
      { userId: 1, requests: 5, weekendRequests: 5, hours: 5 },
      { userId: 2, requests: 5, weekendRequests: 5, hours: 5 },
      { userId: 3, requests: 1, weekendRequests: 0, hours: 0 },
    ]);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);
    expect(computeMerits([])).toEqual([]);
    expect(computeMerits([{ userId: 9, requests: 0, weekendRequests: 0, hours: 0 }])[0].score).toBe(0);
  });

  it('knows which dates are weekends', () => {
    expect(isWeekend('2026-06-06')).toBe(true); // Saturday
    expect(isWeekend('2026-06-07')).toBe(true); // Sunday
    expect(isWeekend('2026-06-08')).toBe(false); // Monday
  });
});

describe('slot weather', () => {
  const hour = (time: string, over: Partial<HourWeather> = {}): HourWeather => ({
    time,
    windMs: 3,
    gustMs: 5,
    precipMmH: 0,
    precipProb: 0,
    visibilityM: 20000,
    tempC: 15,
    weatherCode: 0,
    cloudCoverPct: 20,
    windDir: 90,
    isDay: true,
    ...over,
  });
  const day = (date: string, over: (h: number) => Partial<HourWeather> = () => ({})) =>
    Array.from({ length: 24 }, (_, h) => hour(`${date}T${String(h).padStart(2, '0')}:00`, over(h)));
  const slot = { id: 1, date: '2026-06-01', start: '06:00', end: '14:00' };

  it('maps the Go / Marginal / No-go verdict onto calm / moderate / tough', () => {
    expect(weatherLevel('go')).toBe('calm');
    expect(weatherLevel('marginal')).toBe('moderate');
    expect(weatherLevel('nogo')).toBe('tough');
  });

  it('calls a quiet day calm and a gale tough', () => {
    expect(summariseSlotWeather(day('2026-06-01'), slot)?.level).toBe('calm');
    const gale = summariseSlotWeather(day('2026-06-01', () => ({ windMs: 20, gustMs: 28 })), slot);
    expect(gale?.level).toBe('tough');
    expect(gale?.maxGustMs).toBe(28);
  });

  it('only looks at the hours inside the slot', () => {
    // Storm only at 20:00 – the 06:00-14:00 slot is unaffected.
    const evening = day('2026-06-01', (h) => (h === 20 ? { windMs: 25, gustMs: 30 } : {}));
    expect(summariseSlotWeather(evening, slot)?.level).toBe('calm');
    expect(summariseSlotWeather(evening, { ...slot, start: '14:00', end: '22:00' })?.level).toBe('tough');
  });

  it('does not treat darkness as bad weather, and follows a night shift past midnight', () => {
    const dark = day('2026-06-01', () => ({ isDay: false })).concat(day('2026-06-02', () => ({ isDay: false })));
    expect(summariseSlotWeather(dark, { id: 2, date: '2026-06-01', start: '22:00', end: '06:00' })?.level).toBe('calm');
    const windyMorning = day('2026-06-01').concat(day('2026-06-02', (h) => (h === 3 ? { windMs: 25, gustMs: 30 } : {})));
    expect(summariseSlotWeather(windyMorning, { id: 2, date: '2026-06-01', start: '22:00', end: '06:00' })?.level).toBe('tough');
  });

  it('has no forecast for a slot the data does not cover', () => {
    expect(summariseSlotWeather(day('2026-06-01'), { ...slot, date: '2026-06-20' })).toBeNull();
  });
});

describe('flying-hours cycle', () => {
  it('starts on day 1 by default and covers the calendar month', () => {
    expect(cycleWindow(1, '2026-11-13')).toEqual({ start: '2026-11-01', end: '2026-12-01' });
  });

  it('uses the previous month when today is before the cycle day', () => {
    expect(cycleWindow(10, '2026-11-05')).toEqual({ start: '2026-10-10', end: '2026-11-10' });
  });

  it('starts today on the cycle day itself', () => {
    expect(cycleWindow(10, '2026-11-10')).toEqual({ start: '2026-11-10', end: '2026-12-10' });
  });

  it('rolls over the year in both directions', () => {
    expect(cycleWindow(15, '2026-01-03')).toEqual({ start: '2025-12-15', end: '2026-01-15' });
    expect(cycleWindow(15, '2026-12-20')).toEqual({ start: '2026-12-15', end: '2027-01-15' });
  });

  it('clamps an invalid day into 1–28', () => {
    expect(cycleWindow(31, '2026-11-30').start).toBe('2026-11-28');
    expect(cycleWindow(0, '2026-11-30').start).toBe('2026-11-01');
  });
});

describe('flight limit level', () => {
  it('is grey without a limit', () => {
    expect(flightLevel(120, null)).toBe('none');
    expect(flightLevel(5, 0)).toBe('none');
  });

  it('is green below 90%', () => {
    expect(flightLevel(35.9, 40)).toBe('ok');
  });

  it('turns yellow from 90% up to the limit', () => {
    expect(flightLevel(36, 40)).toBe('warn');
    expect(flightLevel(39.9, 40)).toBe('warn');
  });

  it('turns red at 100% and above', () => {
    expect(flightLevel(40, 40)).toBe('over');
    expect(flightLevel(55, 40)).toBe('over');
  });
});
