/**
 * String utilities shared across applications.
 */

/** Trims and collapses multiple whitespace characters. */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Produces a stable lowercase, dash-separated slug from text. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Pads a number with leading zeros up to the given width. */
export function padLeft(value: number | string, width: number, char = '0'): string {
  const str = String(value);
  return str.length >= width ? str : char.repeat(width - str.length) + str;
}

/** Capitalizes the first letter of a string. */
export function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Checks whether a string is empty or only whitespace. */
export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

/** Returns a safe non-null string. */
export function orEmpty(value: string | null | undefined): string {
  return value ?? '';
}