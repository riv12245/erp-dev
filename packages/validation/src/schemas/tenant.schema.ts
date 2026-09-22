import { validateFields, isNonEmptyString } from '../validators/index.js';

export function validateTenantCreate(input: unknown): { ok: boolean; errors: readonly string[] } {
  const data = (input ?? {}) as Record<string, unknown>;
  return validateFields(
    [
      { field: 'name', validate: isNonEmptyString, message: 'name is required' },
      { field: 'slug', validate: (v) => typeof v === 'string' && /^[a-z0-9-]+$/.test(v), message: 'slug must be lowercase alphanumeric with dashes' },
    ],
    data,
  );
}

export function validateCompanyCreate(input: unknown): { ok: boolean; errors: readonly string[] } {
  const data = (input ?? {}) as Record<string, unknown>;
  return validateFields(
    [
      { field: 'name', validate: isNonEmptyString, message: 'name is required' },
      { field: 'legalName', validate: isNonEmptyString, message: 'legalName is required' },
    ],
    data,
  );
}