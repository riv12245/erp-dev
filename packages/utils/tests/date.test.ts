import { describe, expect, it } from 'vitest';
import {
  toIsoString,
  parseIsoString,
  isIsoDateString,
  startOfToday,
  addDays,
  addMonths,
  daysBetween,
} from '../src/date.js';

describe('date utils', () => {
  it('serializes and parses ISO strings', () => {
    const date = new Date('2026-01-15T12:00:00.000Z');
    expect(toIsoString(date)).toBe('2026-01-15T12:00:00.000Z');
    expect(parseIsoString('2026-01-15T12:00:00.000Z')).toEqual(date);
    expect(isIsoDateString('2026-01-15T12:00:00.000Z')).toBe(true);
    expect(isIsoDateString('not-a-date')).toBe(false);
    expect(() => parseIsoString('nope')).toThrow();
  });

  it('adds calendar days and months', () => {
    const jan15 = new Date(2026, 0, 15);
    expect(addDays(jan15, 2).getDate()).toBe(17);
    expect(addMonths(jan15, 1).getDate()).toBe(15);
    expect(addMonths(jan15, 1).getMonth()).toBe(1);
  });

  it('computes whole days between dates', () => {
    const a = new Date(2026, 0, 1);
    const b = new Date(2026, 0, 5);
    expect(daysBetween(a, b)).toBe(4);
  });

  it('returns start of today in local time', () => {
    const today = startOfToday();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getMilliseconds()).toBe(0);
  });
});