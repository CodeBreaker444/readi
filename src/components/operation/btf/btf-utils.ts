export const dayOf = (time: string) => time.slice(0, 10)
export const hourOf = (time: string) => Number(time.slice(11, 13))
export const pad2 = (n: number) => String(n).padStart(2, '0')
export const hhmm = (hour: number) => `${pad2(hour)}:00`

/** Current local time at the forecast location, as "YYYY-MM-DDTHH:00". */
export function currentHourKey(timeZone: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:00`
  } catch {
    return ''
  }
}

/** Short zone name at the forecast location, e.g. "CEST". */
export function timeZoneAbbr(timeZone: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  } catch {
    return timeZone
  }
}

/** Date labels are built from the date string only, so the viewer's timezone never shifts them. */
export function dayLabel(day: string, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { ...opts, timeZone: 'UTC' })
}

/** How long ago something was, as a translation key under operations.calendar.btf plus a count. */
export function relativeAge(ageMs: number): { key: 'justNow' | 'minAgo' | 'hourAgo' | 'dayAgo'; count: number } {
  const min = Math.floor(Math.max(0, ageMs) / 60_000)
  if (min < 1) return { key: 'justNow', count: 0 }
  if (min < 60) return { key: 'minAgo', count: min }
  const hours = Math.floor(min / 60)
  if (hours < 24) return { key: 'hourAgo', count: hours }
  return { key: 'dayAgo', count: Math.floor(hours / 24) }
}
