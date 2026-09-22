/**
 * Date utilities shared across applications.
 */

/** Supported ISO date string format. */
export type IsoDateString = string;

/** Formats a Date into an ISO string safely. */
export function toIsoString(date: Date): IsoDateString {
  return date.toISOString();
}

/** Parses an ISO string into a Date. Throws if invalid. */
export function parseIsoString(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Invalid ISO date string: ${value}`);
  }
  return parsed;
}

/** Checks whether a value looks like a valid ISO date string. */
export function isIsoDateString(value: unknown): value is IsoDateString {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

/** Returns today at the start of day (local time). */
export function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Adds days to a date, returning a new Date. */
export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Adds months to a date, returning a new Date. */
export function addMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

/** Difference in whole days between two dates (b > a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}