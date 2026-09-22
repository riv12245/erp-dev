import { describe, expect, it } from 'vitest';
import { formatNumber, round, clamp, parseNumber, formatCurrency } from '../src/number.js';

describe('number utils', () => {
  it('formats numbers with fixed decimals', () => {
    expect(formatNumber(1234.5)).toBe(formatNumber.toString ? '1,234.50' : '1,234.50');
    expect(formatNumber(1, 0)).toBe('1');
  });

  it('rounds without floating point drift', () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(2.5)).toBe(2.5);
    expect(round(3.14159, 3)).toBe(3.142);
  });

  it('clamps into an inclusive range', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('parses numeric strings with a fallback', () => {
    expect(parseNumber('12.5')).toBe(12.5);
    expect(parseNumber('abc', -1)).toBe(-1);
    expect(parseNumber('', -1)).toBe(-1);
    expect(parseNumber(null)).toBe(0);
  });

  it('formats currency using the given locale', () => {
    expect(formatCurrency(1234.56, 'USD', 'en-US')).toBe('$1,234.56');
    const eur = formatCurrency(1234.56, 'EUR', 'es-ES');
    expect(eur).toContain('1234,56');
    expect(eur).toContain('€');
  });
});