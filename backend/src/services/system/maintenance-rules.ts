/**
 * Core maintenance business rules.
 *
 * Everything in this file is PURE (no database, no I/O) so it can be unit tested
 * and read in isolation. Services and cron jobs call these functions; they should
 * not re-implement them.
 */
import type { MaintenanceModel, MaintenanceStatus } from '@/config/types/maintenance';

export type CycleStatus = 'OK' | 'ALERT' | 'DUE';

/** Fraction of a limit at which a component moves from OK to ALERT (mission / ticket flows). */
export const ALERT_RATIO = 0.8;

const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Hours are stored as HH.MM (1.30 = 1h30m), NOT decimal hours.
// ---------------------------------------------------------------------------

export function hhmmToMinutes(hhmm: number): number {
  const h = Math.floor(hhmm);
  const m = Math.round((hhmm - h) * 100);
  return h * 60 + m;
}

export function addHhmmHours(a: number, b: number): number {
  const totalMin = hhmmToMinutes(a) + hhmmToMinutes(b);
  return Math.floor(totalMin / 60) + (totalMin % 60) / 100;
}

export function subtractHhmmHours(a: number, b: number): number {
  const totalMin = Math.max(0, hhmmToMinutes(a) - hhmmToMinutes(b));
  return Math.floor(totalMin / 60) + (totalMin % 60) / 100;
}

// ---------------------------------------------------------------------------
// component_metadata helpers
// ---------------------------------------------------------------------------

/** component_metadata may arrive as an object, a JSON string or a double-encoded JSON string. */
export function parseComponentMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
      if (typeof value === 'string') value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getBatteryCycleRatio(meta: Record<string, unknown>): number {
  return typeof meta.battery_cycle_ratio === 'number' ? meta.battery_cycle_ratio : 1;
}

/** Detached or decommissioned components are no longer part of the system. */
export function isComponentPartOfSystem(meta: Record<string, unknown>): boolean {
  return meta.system_detached !== true && meta.component_status !== 'DECOMMISSIONED';
}

/**
 * Whether an EXPIRED component keeps its system Not Operational.
 *   - detached (moved to the warehouse) components are out of the system: never.
 *   - permanent expiry: always, until the component is removed from the system. Setting it to Decommissioned does not
 *     free the system.
 *   - renewable expiry: unless it was set to Decommissioned (it can also be renewed, which is no longer expired).
 */
export function blocksSystemWhenExpired(meta: Record<string, unknown>): boolean {
  if (meta.system_detached === true) return false;
  return isExpiryPermanent(meta) || meta.component_status !== 'DECOMMISSIONED';
}

/**
 * Expiry is permanent by default: an expired component reads as Decommissioned and cannot be renewed.
 * Only an explicit `expiry_permanent: false` selects the alternative flow (Not Operational + maintenance ticket,
 * renewable). A missing flag (every component created before this option existed) stays permanent.
 */
export function isExpiryPermanent(meta: Record<string, unknown> | null | undefined): boolean {
  return meta?.expiry_permanent !== false;
}

/** YYYY-MM-DD for a Date/string; null when empty or an Invalid Date (toISOString would throw RangeError). */
export function toDayString(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  return Number.isNaN(value.getTime()) ? null : value.toISOString().split('T')[0];
}

export interface ExpiryLimits {
  expiration_date: Date | string | null;
  expiry_type: string | null;
  expiration_flights: number | null;
  expiration_flight_hours: number | { toString(): string } | null;
  current_maintenance_flights: number | { toString(): string } | null;
  current_usage_hours: number | { toString(): string } | null;
}

/** True once a component has reached any of its expiry limits (date, flights or flight hours, per its expiry type). */
export function isComponentExpired(item: ExpiryLimits, today: string = new Date().toISOString().split('T')[0]): boolean {
  const expiryType: string = item.expiry_type || 'EXPIRATION_DATE';
  // Callers pass either a Date (Prisma rows) or a YYYY-MM-DD string; a Date compared with a string is never <=, so normalise first.
  const expiryDay = toDayString(item.expiration_date);
  const isDateExpired = !!expiryDay && expiryDay <= today;
  const isFlightExpired =
    item.expiration_flights != null &&
    Number(item.current_maintenance_flights) >= item.expiration_flights;
  const isFlightHoursExpired =
    item.expiration_flight_hours != null &&
    Number(item.current_usage_hours) >= Number(item.expiration_flight_hours);
  return expiryType === 'FLIGHTS'
    ? isFlightExpired
    : expiryType === 'FLIGHT_HOURS'
      ? isFlightHoursExpired
      : expiryType === 'MIXED'
        ? isDateExpired || isFlightExpired || isFlightHoursExpired
        : isDateExpired;
}

// ---------------------------------------------------------------------------
// Status evaluation
// ---------------------------------------------------------------------------

/**
 * Status of one component against its own limits (used by the mission flow and
 * the operation board). ALERT at >= 80%, DUE at >= 100%. A limit of 0 is ignored.
 */
export function computeComponentStatus(
  currentHours: number,
  currentFlights: number,
  currentDays: number,
  limits: { hour: number; flight: number; day: number }
): { status: CycleStatus; trigger: string[] } {
  const trigger: string[] = [];
  let status: CycleStatus = 'OK';

  const checks = [
    ...(limits.hour > 0 ? [{ current: currentHours, limit: limits.hour, name: 'hours' }] : []),
    ...(limits.flight > 0 ? [{ current: currentFlights, limit: limits.flight, name: 'flights' }] : []),
    ...(limits.day > 0 ? [{ current: currentDays, limit: limits.day, name: 'days' }] : []),
  ];

  for (const c of checks) {
    const ratio = c.current / c.limit;
    if (ratio >= 1) {
      status = 'DUE';
      trigger.push(`${c.name} exceeded (${c.current}/${c.limit})`);
    } else if (ratio >= ALERT_RATIO && status !== 'DUE') {
      status = 'ALERT';
      trigger.push(`${c.name} approaching (${c.current}/${c.limit})`);
    }
  }

  return { status, trigger };
}

/**
 * Status used by the maintenance dashboard (and therefore by the alert cron).
 * `threshold` is a percentage (e.g. 80). Returns trigger slots [HOUR, FLIGHT, DAY].
 */
export function computeDashboardStatus(
  currentHours: number,
  currentFlights: number,
  currentDays: number,
  model: MaintenanceModel,
  threshold: number
): { status: MaintenanceStatus; trigger: (string | null)[] } {
  const triggers: (string | null)[] = [null, null, null];
  let worst = 'OK' as MaintenanceStatus;

  if (model.maintenance_cycle_hour > 0) {
    const pct = (currentHours / model.maintenance_cycle_hour) * 100;
    if (pct >= 100) { triggers[0] = 'HOUR'; worst = 'DUE'; }
    else if (pct >= threshold && worst !== 'DUE') { triggers[0] = 'HOUR'; worst = 'ALERT'; }
  }

  if (model.maintenance_cycle_flight > 0) {
    const pct = (currentFlights / model.maintenance_cycle_flight) * 100;
    if (pct >= 100) { triggers[1] = 'FLIGHT'; worst = 'DUE'; }
    else if (pct >= threshold && worst !== 'DUE') { triggers[1] = 'FLIGHT'; worst = 'ALERT'; }
  }

  if (model.maintenance_cycle_day > 0) {
    const pct = (currentDays / model.maintenance_cycle_day) * 100;
    if (pct >= 100) { triggers[2] = 'DAY'; worst = 'DUE'; }
    else if (pct >= threshold && worst !== 'DUE') { triggers[2] = 'DAY'; worst = 'ALERT'; }
  }

  return { status: worst, trigger: triggers };
}

// ---------------------------------------------------------------------------
// Day counter
// ---------------------------------------------------------------------------

export interface DayCounterComponent {
  component_id: number;
  maintenance_cycle_day: unknown;
  current_maintenance_days: unknown;
  last_maintenance_date: Date | null;
  installation_date: Date | null;
}

/**
 * Works out which components need their current_maintenance_days changed.
 * days = whole UTC days since last maintenance (or installation), capped at the limit.
 * Components already at their limit, with no reference date, or unchanged are skipped.
 */
export function computeMaintenanceDayUpdates(
  components: DayCounterComponent[],
  now: Date
): { id: number; days: number }[] {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const updates: { id: number; days: number }[] = [];

  for (const comp of components) {
    const limit = Number(comp.maintenance_cycle_day);
    const current = Number(comp.current_maintenance_days ?? 0);

    if (current >= limit) continue;

    const refDate = comp.last_maintenance_date ?? comp.installation_date;
    if (!refDate) continue;

    const lastStamp = new Date(refDate);
    lastStamp.setUTCHours(0, 0, 0, 0);

    const daysPassed = Math.floor((today.getTime() - lastStamp.getTime()) / MS_PER_DAY);

    if (daysPassed <= 0) continue;

    const newValue = Math.min(daysPassed, limit);
    if (newValue === current) continue;

    updates.push({ id: comp.component_id, days: newValue });
  }

  return updates;
}
