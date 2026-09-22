import { describe, expect, it } from 'vitest';
import {
  normalizeWhitespace,
  slugify,
  padLeft,
  capitalize,
  isBlank,
  orEmpty,
} from '../src/string.js';

describe('string utils', () => {
  it('normalizes whitespace', () => {
    expect(normalizeWhitespace('  hello   world  ')).toBe('hello world');
  });

  it('slugifies text', () => {
    expect(slugify('Sales Orders 2026')).toBe('sales-orders-2026');
    expect(slugify('  --Acme Co--  ')).toBe('acme-co');
  });

  it('left-pads with a character', () => {
    expect(padLeft(42, 5)).toBe('00042');
    expect(padLeft('ABC', 2)).toBe('ABC');
    expect(padLeft(7, 4, '-')).toBe('---7');
  });

  it('capitalizes the first letter', () => {
    expect(capitalize('invoice')).toBe('Invoice');
    expect(capitalize('')).toBe('');
  });

  it('detects blank strings', () => {
    expect(isBlank('   ')).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank('x')).toBe(false);
  });

  it('falls back to an empty string', () => {
    expect(orEmpty(null)).toBe('');
    expect(orEmpty('x')).toBe('x');
  });
});