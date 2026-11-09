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
export function nextApprovalDay(approvalDays: number[], from = new Date()): { date: string; label: string } | null {
  if (!approvalDays.length) return null;
  const start = from.toISOString().slice(0, 10);
  for (let i = 0; i < 7; i++) {
    const d = addDaysIso(start, i);
    if (approvalDays.includes(weekdayOf(d))) return { date: d, label: i === 0 ? 'Today' : WEEKDAYS_LONG[weekdayOf(d)] };
  }
  return null;
}
