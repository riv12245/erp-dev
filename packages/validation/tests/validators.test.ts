import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidUuid,
  isStrongPassword,
  isNonEmptyString,
  validateFields,
} from '../src/validators/index.js';

describe('validators', () => {
  it('validates emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('first.last+tag@sub.domain-io.org')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('@nobody.com')).toBe(false);
  });

  it('validates UUIDs', () => {
    expect(isValidUuid('01234567-89ab-4def-8abc-0123456789ab')).toBe(true);
    expect(isValidUuid('01234567-89ab-6def-8abc-0123456789ab')).toBe(false); // version byte 6 not supported
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });

  it('enforces password strength', () => {
    expect(isStrongPassword('Str0ngPass')).toBe(true);
    expect(isStrongPassword('short1A')).toBe(false);
    expect(isStrongPassword('lowercaseand more1')).toBe(false);
    expect(isStrongPassword('NOUPPERCASE1')).toBe(false);
    expect(isStrongPassword('NoDigitsHere!')).toBe(false);
    expect(isStrongPassword('12345678Aa')).toBe(true);
  });

  it('checks non-empty strings', () => {
    expect(isNonEmptyString('  x  ')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });

  it('collects field rule errors', () => {
    const result = validateFields(
      [
        { field: 'email', validate: (v) => typeof v === 'string' && isValidEmail(v), message: 'bad email' },
        { field: 'name', validate: isNonEmptyString, message: 'name required' },
      ],
      { email: 'oops', name: 'ok' },
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(['bad email']);
  });
});