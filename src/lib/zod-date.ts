import { z } from 'zod';

/**
 * True for '' (treated as "no date" downstream) or a string `new Date()` parses to a plausible year.
 * `<input type="date">` lets users type 5+ digit years ("20226-10-30"), which is an Invalid Date in JS.
 */
export function isValidDateString(v: string): boolean {
  if (v === '') return true;
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return false;
  const year = new Date(t).getUTCFullYear();
  return year >= 1900 && year <= 2200;
}

/**
 * Date sent as a string. Rejects unparseable values so they never reach `new Date(v)` and
 * become an Invalid Date that later throws in `toISOString()`. Chain `.optional()` / `.nullable()` as usual.
 */
export const zDateString = (message = 'Invalid date') => z.string().refine(isValidDateString, message);
