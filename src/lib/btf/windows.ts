export const hourKey = (day: string, hour: number) => `${day}T${String(hour).padStart(2, '0')}:00`

/**
 * A window can only be recommended if it has not started yet. `nowKey` is the current hour at the
 * site ("YYYY-MM-DDTHH:00", minutes dropped), so a window starting in the current hour counts as
 * started - at 11:45 neither 10:00-12:00 nor 11:00-13:00 can still be flown on time.
 */
export function windowHasStarted(day: string, startHour: number, nowKey: string): boolean {
  return nowKey !== '' && hourKey(day, startHour) <= nowKey
}

/**
 * Start hours of the grid rows. They cover the hours that have daylight somewhere in the forecast -
 * in the viewer's timezone, which can differ from the site's - aligned to multiples of the window
 * length. Falls back to 06:00-22:00 when there is no daylight at all (polar night).
 */
export function windowStarts(hours: Array<{ time: string; isDay: boolean }>, windowHours: number): number[] {
  let first = 24;
  let last = -1;
  for (const h of hours) {
    if (!h.isDay) continue;
    const hr = Number(h.time.slice(11, 13));
    if (hr < first) first = hr;
    if (hr > last) last = hr;
  }
  if (last < 0) {
    first = 6;
    last = 21;
  }
  const starts: number[] = [];
  for (let s = Math.floor(first / windowHours) * windowHours; s <= last && s + windowHours <= 24; s += windowHours) starts.push(s);
  return starts;
}
