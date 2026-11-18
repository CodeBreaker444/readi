/**
 * Renewal of an expired component whose expiry is NOT permanent (component_metadata.expiry_permanent === false).
 *
 * Such a component cannot be renewed by editing its expiry. It is renewed when a maintenance ticket that covers it
 * is closed, by a fixed amount per expiry type (below). The close dialog shows the new values beforehand, and the
 * user can change them afterwards in Edit Component, once the component is no longer expired.
 *
 * Pure (no database, no I/O): shared by the server (applies it) and the tests.
 */

/** Fixed renewal amounts. */
export const EXPIRY_RENEWAL = {
  /** Expiry date: this many months after the later of the old expiry date and today. */
  months: 1,
  /** Flight limit: added to the old limit. */
  flights: 10,
  /** Flight-hour limit: added to the later of the old limit and the hours flown so far. */
  flightHours: 10,
} as const;

export interface RenewalInput {
  expiry_type: string | null;
  /** YYYY-MM-DD */
  expiration_date: string | null;
  expiration_flights: number | null;
  expiration_flight_hours: number | null;
  current_maintenance_flights: number;
  current_usage_hours: number;
}

export interface ExpiryRenewal {
  expiration_date?: { from: string; to: string };
  expiration_flights?: { from: number; to: number };
  expiration_flight_hours?: { from: number; to: number };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD plus whole months. The day is clamped to the end of a shorter month (31 Jan + 1 month = 28/29 Feb). */
export function addMonthsIso(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = m - 1 + months;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad(month + 1)}-${pad(Math.min(d, lastDay))}`;
}

/**
 * The new limits for a component that has reached them, or null when none was reached.
 * Only the limits that were reached are renewed (a MIXED component keeps the ones still in range), and
 * the new value is always beyond the current state, so the component is not expired right after renewal.
 */
export function computeExpiryRenewal(input: RenewalInput, today: string = new Date().toISOString().slice(0, 10)): ExpiryRenewal | null {
  const type = input.expiry_type || 'EXPIRATION_DATE';
  const renewal: ExpiryRenewal = {};

  if ((type === 'EXPIRATION_DATE' || type === 'MIXED') && input.expiration_date && input.expiration_date <= today) {
    const base = input.expiration_date > today ? input.expiration_date : today;
    renewal.expiration_date = { from: input.expiration_date, to: addMonthsIso(base, EXPIRY_RENEWAL.months) };
  }

  if (
    (type === 'FLIGHTS' || type === 'MIXED') &&
    input.expiration_flights != null &&
    input.current_maintenance_flights >= input.expiration_flights
  ) {
    renewal.expiration_flights = { from: input.expiration_flights, to: input.expiration_flights + EXPIRY_RENEWAL.flights };
  }

  if (
    (type === 'FLIGHT_HOURS' || type === 'MIXED') &&
    input.expiration_flight_hours != null &&
    input.current_usage_hours >= input.expiration_flight_hours
  ) {
    const base = Math.max(input.expiration_flight_hours, input.current_usage_hours);
    renewal.expiration_flight_hours = {
      from: input.expiration_flight_hours,
      to: Math.round((base + EXPIRY_RENEWAL.flightHours) * 100) / 100,
    };
  }

  return Object.keys(renewal).length ? renewal : null;
}

/** e.g. "expiry date 2026-11-10 → 2026-12-18, flight limit 100 → 110". Used in the ticket timeline. */
export function describeRenewal(renewal: ExpiryRenewal): string {
  const parts: string[] = [];
  if (renewal.expiration_date) parts.push(`expiry date ${renewal.expiration_date.from} → ${renewal.expiration_date.to}`);
  if (renewal.expiration_flights) parts.push(`flight limit ${renewal.expiration_flights.from} → ${renewal.expiration_flights.to}`);
  if (renewal.expiration_flight_hours) parts.push(`flight-hour limit ${renewal.expiration_flight_hours.from} → ${renewal.expiration_flight_hours.to}`);
  return parts.join(', ');
}
