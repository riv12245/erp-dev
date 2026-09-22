import { describe, expect, it } from 'vitest';
import {
  validateLogin,
  validateRegister,
  validateTenantCreate,
  validateCompanyCreate,
} from '../src/index.js';

describe('auth schemas', () => {
  it('validates login input', () => {
    expect(validateLogin({ email: 'user@acme.io', password: 'x' }).ok).toBe(true);
    const bad = validateLogin({ email: 'nope', password: '' });
    expect(bad.ok).toBe(false);
    expect(bad.errors).toHaveLength(2);
    expect(validateLogin(null).ok).toBe(false);
  });

  it('validates registration input', () => {
    const good = validateRegister({ email: 'u@a.io', password: 'Str0ng123', firstName: 'Ada', lastName: 'Lovelace' });
    expect(good.ok).toBe(true);

    const weak = validateRegister({ email: 'u@a.io', password: 'weak', firstName: 'Ada', lastName: 'Lovelace' });
    expect(weak.ok).toBe(false);
    expect(weak.errors[0]).toMatch(/password/);

    const empty = validateRegister({ email: 'u@a.io', password: 'Str0ng1' });
    expect(empty.errors).toContain('firstName is required');
    expect(empty.errors).toContain('lastName is required');
  });
});

describe('tenant schemas', () => {
  it('validates tenant creation', () => {
    expect(validateTenantCreate({ name: 'Acme', slug: 'acme' }).ok).toBe(true);
    expect(validateTenantCreate({ name: 'Acme', slug: 'Acme!' }).ok).toBe(false);
    expect(validateTenantCreate({ name: 'Acme' }).errors).toEqual(['slug must be lowercase alphanumeric with dashes']);
  });

  it('validates company creation', () => {
    const good = validateCompanyCreate({ name: 'Acme Co', legalName: 'Acme Company Ltd' });
    expect(good.ok).toBe(true);
    const bad = validateCompanyCreate({ name: 'Acme Co' });
    expect(bad.errors).toContain('legalName is required');
  });
});