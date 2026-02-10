import moment from 'moment-timezone';

/**
 * Convert UTC timestamp to local timezone
 */
export function dateConversionUtcToLocal(utcDate: string | Date, timezone: string = 'UTC'): string {
  try {
    const date = new Date(utcDate);
    
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error converting date:', error);
    return new Date(utcDate).toISOString();
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
  return new Date().getFullYear();
}

/**
 * Format duration in minutes to hours and minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}