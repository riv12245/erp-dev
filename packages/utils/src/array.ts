/**
 * Array utilities shared across applications.
 */

/** Groups an array of items by a key selector. */
export function groupBy<T>(items: readonly T[], keySelector: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keySelector(item);
    const bucket = result[key] ?? [];
    bucket.push(item);
    result[key] = bucket;
  }
  return result;
}

/** Chunks an array into arrays of at most `size` items. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

/** Returns an array with duplicate items removed based on the selector. */
export function uniqueBy<T>(items: readonly T[], selector: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = selector(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

/** Sorts items ascending by a numeric or string selector. */
export function sortBy<T>(items: readonly T[], selector: (item: T) => number | string, direction: 'asc' | 'desc' = 'asc'): T[] {
  const dir = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = selector(a);
    const bv = selector(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

/** Partitions an array into two arrays based on a predicate. */
export function partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const yes: T[] = [];
  const no: T[] = [];
  for (const item of items) {
    if (predicate(item)) yes.push(item);
    else no.push(item);
  }
  return [yes, no];
}