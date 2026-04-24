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
  if (role === 'SUPERADMIN' || role === 'ADMIN') return true
  const perms = Array.isArray(entry) ? entry : [entry]
  return perms.some((p) => roleHasPermission(role, p))
}
