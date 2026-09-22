/**
 * Object utilities shared across applications.
 */

/** Removes keys whose value is null or undefined (shallow). */
export function compactObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value != null) result[key] = value;
  }
  return result as Partial<T>;
}

/** Picks a subset of keys from an object. */
export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/** Omits a subset of keys from an object. */
export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of keys) delete result[key as string];
  return result as Omit<T, K>;
}

/** Returns true when the object has no own enumerable keys. */
export function isEmptyObject(value: Record<string, unknown>): boolean {
  return Object.keys(value).length === 0;
}

/** Deep-freezes an object/tree in non-production builds is intentionally NOT provided to avoid perf surprises. */

/** Produces a shallow clone with an extra property. */
export function withProp<T extends Record<string, unknown>, K extends string, V>(obj: T, key: K, value: V): T & Record<K, V> {
  return { ...obj, [key]: value };
}