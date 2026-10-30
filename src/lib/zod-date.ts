import { z } from 'zod';

/** True for '' (treated as "no date" downstream) or any string `new Date()` can parse. */
export function isValidDateString(v: string): boolean {
  return v === '' || !Number.isNaN(new Date(v).getTime());
}

/**
 * Date sent as a string. Rejects unparseable values so they never reach `new Date(v)` and
 * become an Invalid Date that later throws in `toISOString()`. Chain `.optional()` / `.nullable()` as usual.
 */
export const zDateString = (message = 'Invalid date') => z.string().refine(isValidDateString, message);
