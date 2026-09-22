import { describe, expect, it } from 'vitest';
import { compactObject, pick, omit, isEmptyObject, withProp } from '../src/object.js';

describe('object utils', () => {
  it('drops nullish values', () => {
    expect(compactObject({ a: 1, b: null, c: undefined, d: '' })).toEqual({ a: 1, d: '' });
  });

  it('picks a subset of keys', () => {
    const src = { a: 1, b: 2, c: 3 };
    expect(pick(src, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(pick(src, ['b'])).toEqual({ b: 2 });
  });

  it('omits keys', () => {
    const src = { a: 1, b: 2, c: 3 };
    expect(omit(src, ['a', 'c'])).toEqual({ b: 2 });
  });

  it('detects empty objects', () => {
    expect(isEmptyObject({})).toBe(true);
    expect(isEmptyObject({ a: 1 })).toBe(false);
  });

  it('adds a property without mutating the source', () => {
    const src = { a: 1 };
    expect(withProp(src, 'b', 2)).toEqual({ a: 1, b: 2 });
    expect(src).toEqual({ a: 1 });
  });
});