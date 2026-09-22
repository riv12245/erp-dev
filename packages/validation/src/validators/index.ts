/**
 * Lightweight, dependency-free validation helpers for transport boundaries.
 * NOTE: these are transport/API validators, NOT domain entities.
 */

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export function isValidEmail(value: string): boolean {
  // eslint-disable-next-line no-useless-escape
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false;
  if (/[A-Z]/.test(value) === false) return false;
  if (/[a-z]/.test(value) === false) return false;
  if (/\d/.test(value) === false) return false;
  return true;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export interface FieldRule {
  readonly field: string;
  readonly validate: (value: unknown) => boolean;
  readonly message: string;
}

export function validateFields(rules: readonly FieldRule[], data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  for (const rule of rules) {
    if (!rule.validate(data[rule.field])) errors.push(rule.message);
  }
  return { ok: errors.length === 0, errors };
}