import { addDaysIso, nextApprovalDay, weekdayOf } from './slot-booking-utils';

/**
 * Pure rules of Slot Booking v2, shared by the API and the UI and unit-tested without a database.
 * Slot dates/times are wall-clock values; they are all placed on one UTC timeline, so comparing them is timezone-safe.
 */

// ───────────────────────── Overlap / collisions ─────────────────────────

export interface Interval {
  from: number;
  to: number;
}

/** [from, to) of a slot in epoch ms. An end at or before the start means the slot runs past midnight (22:00–06:00). */
export function slotInterval(date: string, start: string, end: string): Interval {
  const from = Date.parse(`${date}T${start}:00.000Z`);
  const endDate = end <= start ? addDaysIso(date, 1) : date;
  return { from, to: Date.parse(`${endDate}T${end}:00.000Z`) };
}

/** Back-to-back slots (14:00 end / 14:00 start) do not overlap. */
export const intervalsOverlap = (a: Interval, b: Interval) => a.from < b.to && b.from < a.to;

// ───────────────────────── Scheduled publishing ─────────────────────────

/** A group is visible to pilots once its publish time has passed (no publish time = immediately). */
export const isPublished = (publishAt: Date | string | null | undefined, now = new Date()) =>
  !publishAt || new Date(publishAt).getTime() <= now.getTime();

export const MAX_SCHEDULE_DAYS = 365;
export const MIN_SCHEDULE_LEAD_MS = 60_000;

/** null when fine, otherwise the reason a requested publish time is not acceptable. */
export function scheduleError(publishAt: string, now = new Date()): string | null {
  const t = Date.parse(publishAt);
  if (Number.isNaN(t)) return 'Invalid publish time';
  if (t < now.getTime() + MIN_SCHEDULE_LEAD_MS) return 'The publish time must be in the future';
  if (t > now.getTime() + MAX_SCHEDULE_DAYS * 86_400_000) return `The publish time cannot be more than ${MAX_SCHEDULE_DAYS} days ahead`;
  return null;
}

// ───────────────────────── Modification lock ─────────────────────────

export type LockHours = 0 | 24 | 48;
export const LOCK_HOUR_OPTIONS: LockHours[] = [0, 24, 48];

export interface ModificationLock {
  locked: boolean;
  /** Start of the approval day the lock counts down to (ISO), null when the group has no approval day. */
  approvalAt: string | null;
}

/**
 * Pilots may not cancel or move a request during the last `lockHours` before the group's next approval day
 * (the day counts from 00:00 UTC; on the approval day itself the request is locked). 0 disables the lock.
 */
export function modificationLock(approvalDays: number[], lockHours: number, now = new Date()): ModificationLock {
  const next = nextApprovalDay(approvalDays, now);
  if (!next) return { locked: false, approvalAt: null };
  const at = Date.parse(`${next.date}T00:00:00.000Z`);
  const locked = lockHours > 0 && at - now.getTime() < lockHours * 3_600_000;
  return { locked, approvalAt: new Date(at).toISOString() };
}

// ───────────────────────── Pilot merit score ─────────────────────────

/** Lookback window for availability and hours. */
export const MERIT_WINDOW_DAYS = 90;

/** Weekend availability is the biggest part of the score, as requested. */
export const MERIT_WEIGHTS = { weekend: 0.4, availability: 0.3, hours: 0.3 } as const;

export interface MeritInput {
  userId: number;
  /** Slot requests made in the window (any status): the pilot offering to fly. */
  requests: number;
  /** Of those, slots on a Saturday or Sunday. */
  weekendRequests: number;
  /** Hours flown in the window. */
  hours: number;
}

export interface MeritScore {
  userId: number;
  score: number;
  rank: number;
}

export const isWeekend = (date: string) => [0, 6].includes(weekdayOf(date));

/**
 * 0–100, relative to the best pilot of the company in each measure:
 *   40% weekend availability + 30% overall availability + 30% hours flown.
 * Ranks are shared by equal scores (1, 1, 3 …).
 */
export function computeMerits(rows: MeritInput[]): MeritScore[] {
  const max = {
    weekend: Math.max(0, ...rows.map((r) => r.weekendRequests)),
    availability: Math.max(0, ...rows.map((r) => r.requests)),
    hours: Math.max(0, ...rows.map((r) => r.hours)),
  };
  const part = (v: number, m: number) => (m > 0 ? v / m : 0);
  const scored = rows.map((r) => ({
    userId: r.userId,
    score: Math.round(
      100 *
        (MERIT_WEIGHTS.weekend * part(r.weekendRequests, max.weekend) +
          MERIT_WEIGHTS.availability * part(r.requests, max.availability) +
          MERIT_WEIGHTS.hours * part(r.hours, max.hours)),
    ),
  }));
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  return scored.map((s) => ({ ...s, rank: sorted.findIndex((x) => x.score === s.score) + 1 }));
}

// ───────────────────────── Weather difficulty ─────────────────────────

export type WeatherLevel = 'calm' | 'moderate' | 'tough';

/** Maps the Go/Marginal/No-go verdict of the flight-weather scoring onto what the OPM cares about. */
export const weatherLevel = (status: 'go' | 'marginal' | 'nogo'): WeatherLevel =>
  status === 'go' ? 'calm' : status === 'marginal' ? 'moderate' : 'tough';

/** Forecast covers today plus the next six days. */
export const WEATHER_DAYS = 7;
