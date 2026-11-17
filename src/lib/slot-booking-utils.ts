import type { RangeMode, SlotMode } from '@/config/types/slot-booking';

/** Pure helpers shared by the Slot Booking API and UI. Dates are yyyy-MM-dd strings handled in UTC (timezone-safe). */

export const SHIFT_BLOCKS: Array<[string, string]> = [
  ['06:00', '14:00'],
  ['14:00', '22:00'],
  ['22:00', '06:00'],
];

export const RANGE_DAYS: Record<RangeMode, number> = { DAY: 1, WEEK: 7, TWO_WEEKS: 14 };
export const RANGE_LABEL: Record<RangeMode, string> = { DAY: 'Single day', WEEK: 'Full week', TWO_WEEKS: 'Two weeks' };

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const SLOT_MANAGER_ROLES = ['OPM', 'ADMIN', 'SUPERADMIN'] as const;
export const SLOT_BOOKER_ROLES = ['PIC'] as const;

export const SLOT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const SLOT_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

// ───────────────────────── Slot time zone ─────────────────────────
// Slot dates/times are wall-clock values at the site where the slots are flown. Each slot group stores the IANA zone
// of that site, so "today", "has the slot started" and the approval day mean the same for the OPM and every pilot,
// wherever they are.

/** Used for groups created before slot groups had a zone. */
export const DEFAULT_SLOT_TIMEZONE = 'UTC';

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Users store zones like "IST" as well as IANA names; returns a valid IANA name, or null. */
export function normalizeTimeZone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (v.toUpperCase() === 'IST') return 'Asia/Kolkata';
  return isValidTimeZone(v) ? v : null;
}

/** The wall-clock time in `timeZone`, as epoch ms on the UTC timeline `slotInterval` uses. */
export function wallClockNow(timeZone: string, now = new Date()): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(now).map((x) => [x.type, x.value]),
  );
  return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00.000Z`);
}

/** Today's date (yyyy-MM-dd) in `timeZone`. */
export const todayInZone = (timeZone: string, now = new Date()) => new Date(wallClockNow(timeZone, now)).toISOString().slice(0, 10);

/** The real instant (epoch ms) at which `date` starts (00:00) in `timeZone`. */
export function zonedMidnight(date: string, timeZone: string): number {
  const wall = Date.parse(`${date}T00:00:00.000Z`);
  let instant = wall - (wallClockNow(timeZone, new Date(wall)) - wall);
  instant = wall - (wallClockNow(timeZone, new Date(instant)) - instant); // settles DST transitions
  return instant;
}

export function groupDates(startDate: string, rangeMode: RangeMode): string[] {
  return Array.from({ length: RANGE_DAYS[rangeMode] }, (_, i) => addDaysIso(startDate, i));
}

export function timeBlocks(mode: SlotMode, hourStart: number, hourEnd: number): Array<[string, string]> {
  if (mode === 'SHIFT') return SHIFT_BLOCKS;
  const out: Array<[string, string]> = [];
  for (let h = hourStart; h < hourEnd; h++) out.push([hh(h), hh(h + 1)]);
  return out;
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export function prettyDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const slotLabel = (s: { start: string; end: string }) => `${s.start}–${s.end}`;
export const shortSlotLabel = (s: { start: string; end: string }) => `${parseInt(s.start, 10)}-${parseInt(s.end, 10)}`;

export const approvalDaysLabel = (days: number[]) =>
  days.length ? [...days].sort().map((d) => WEEKDAYS_LONG[d]).join(', ') : 'Not set';

/** Next weekday (today included) on which the OPM reviews. */
export function nextApprovalDay(approvalDays: number[], from = new Date(), timeZone = DEFAULT_SLOT_TIMEZONE): { date: string; label: string } | null {
  if (!approvalDays.length) return null;
  const start = todayInZone(timeZone, from);
  for (let i = 0; i < 7; i++) {
    const d = addDaysIso(start, i);
    if (approvalDays.includes(weekdayOf(d))) return { date: d, label: i === 0 ? 'Today' : WEEKDAYS_LONG[weekdayOf(d)] };
  }
  return null;
}
