import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Role, RoutePermissionEntry, roleHasPermission } from "./auth/roles";

export const DEFAULT_TIMEZONE = 'Europe/Berlin';

const TIMEZONE_ABBR_MAP: Record<string, string> = {
  IST: 'Asia/Kolkata',
  CET: 'Europe/Berlin',
  CEST: 'Europe/Berlin',
  EST: 'America/New_York',
  EDT: 'America/New_York',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  GMT: 'Europe/London',
  BST: 'Europe/London',
  JST: 'Asia/Tokyo',
  AST: 'Asia/Dubai',
  UTC: 'UTC',
};

export function resolveIanaTimezone(tz?: string | null): string {
  if (!tz) return DEFAULT_TIMEZONE;
  if (tz.includes('/') || tz === 'UTC') return tz;
  return TIMEZONE_ABBR_MAP[tz.toUpperCase()] ?? DEFAULT_TIMEZONE;
}

/**
 * Formats a UTC date string (or Date object) into the given timezone.
 *
 * @param date   ISO string or Date object (always treated as UTC).
 * @param tz     IANA timezone id (e.g. 'Europe/Berlin') or legacy abbreviation.
 * @param opts   Intl.DateTimeFormatOptions – defaults to date + time.
 * @returns      Localised string in the target timezone.
 */
export function formatInTz(
  date: string | Date | null | undefined,
  tz: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
): string {
  if (!date) return '—';
  try {
    const resolved = resolveIanaTimezone(tz);
    return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: resolved }).format(
      typeof date === 'string' ? new Date(date) : date,
    );
  } catch {
    return String(date);
  }
}

/**
 * Date-only shorthand — shows day, month name, year in the user's timezone.
 */
export function formatDateInTz(
  date: string | Date | null | undefined,
  tz: string | null | undefined,
): string {
  return formatInTz(date, tz, { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Date + HH:mm shorthand in the user's timezone.
 */
export function formatDateTimeInTz(
  date: string | Date | null | undefined,
  tz: string | null | undefined,
): string {
  return formatInTz(date, tz, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Time-only shorthand (HH:mm) in the user's timezone.
 */
export function formatTimeInTz(
  date: string | Date | null | undefined,
  tz: string | null | undefined,
): string {
  return formatInTz(date, tz, { hour: '2-digit', minute: '2-digit', hour12: false });
}

 
export function nowAsLocalInput(tz: string | null | undefined, offsetHours = 0): string {
  const d = new Date(Date.now() + offsetHours * 3600_000);
  const resolved = resolveIanaTimezone(tz);
  return new Intl.DateTimeFormat('sv', {
    timeZone: resolved,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d).slice(0, 16).replace(' ', 'T');
}

/**
 * Converts a calendar date (as picked in the user's local timezone) to the UTC
 * instant of that date's midnight (or 23:59:59.999) boundary, so a DB range
 * filter on UTC-naive timestamps lines up with the user's local day.
 *
 * @param dateStr    'YYYY-MM-DD' as selected in the UI.
 * @param tz         IANA timezone id or legacy abbreviation.
 * @param endOfDay   false = 00:00:00.000 boundary, true = 23:59:59.999 boundary.
 */
export function localDayBoundaryToUtc(dateStr: string, tz: string | null | undefined, endOfDay: boolean): Date {
  const resolved = resolveIanaTimezone(tz);
  const [y, m, d] = dateStr.split('-').map(Number);
  const h = endOfDay ? 23 : 0;
  const min = endOfDay ? 59 : 0;
  const s = endOfDay ? 59 : 0;
  const ms = endOfDay ? 999 : 0;

  // First guess: treat the desired wall-clock time as if it were already UTC.
  const guess = new Date(Date.UTC(y, m - 1, d, h, min, s, ms));

  // See what wall-clock time that instant actually renders as in `resolved`,
  // then shift the guess by the difference to land on the correct UTC instant.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(guess).map((p) => [p.type, p.value]),
  );
  const renderedAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second), ms,
  );
  const offsetMs = renderedAsUtc - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decode the payload of a JWT without verifying the signature.
 * Used only for permission checks in middleware (UX layer).
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return payload.exp < Math.floor(Date.now() / 1000)
}

export function decodeJwtRole(token: string): Role | null {
  const payload = decodeJwtPayload(token)
  return (payload?.role as Role) ?? null
}

export function hasRoutePermission(role: Role, entry: RoutePermissionEntry): boolean {
  if (role === 'SUPERADMIN') return true
  const perms = Array.isArray(entry) ? entry : [entry]
  return perms.some((p) => roleHasPermission(role, p))
}
