/**
 * Numeric utilities shared across applications.
 */

/** Formats a number with the given fractional digits using the default locale. */
export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Rounds to a fixed number of decimal places (avoids floating point drift). */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Clamps a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parses a numeric string; returns fallback when invalid. */
export function parseNumber(value: string | null | undefined, fallback = 0): number {
  if (value == null || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Formats an amount using ISO 4217 currency code ordering (amount, currency, locale). */
export function formatCurrency(amount: number, currency: string, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}