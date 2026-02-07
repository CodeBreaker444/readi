import moment from 'moment-timezone';

/**
 * Convert UTC timestamp to local timezone
 */
export function dateConversionUtcToLocal(
  utcTimestamp: string | Date,
  timezone: string
): string {
  if (!utcTimestamp) return '';

  try {
    return moment.utc(utcTimestamp).tz(timezone).format('YYYY-MM-DD HH:mm');
  } catch (error) {
    console.error('Date conversion error:', error);
    return '';
  }
}

/**
 * Convert local timezone to UTC
 */
export function dateConversionLocalToUtc(
  localTimestamp: string | Date,
  timezone: string
): string {
  if (!localTimestamp) return '';

  try {
    return moment.tz(localTimestamp, timezone).utc().format('YYYY-MM-DD HH:mm:ss');
  } catch (error) {
    console.error('Date conversion error:', error);
    return '';
  }
}

/**
 * Get current year
 */
export function getCurrentYear(): number {
  return moment().year();
}

/**
 * Format duration in minutes to hours and minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}