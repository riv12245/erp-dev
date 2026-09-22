import { validateFields, isValidEmail, isStrongPassword, isNonEmptyString } from '../validators/index.js';

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export function validateLogin(input: unknown): { ok: boolean; errors: readonly string[] } {
  const data = (input ?? {}) as Record<string, unknown>;
  return validateFields(
    [
      { field: 'email', validate: (v) => typeof v === 'string' && isValidEmail(v), message: 'email must be a valid email address' },
      { field: 'password', validate: (v) => typeof v === 'string' && v.length > 0, message: 'password is required' },
    ],
    data,
  );
}

export function validateRegister(input: unknown): { ok: boolean; errors: readonly string[] } {
  const data = (input ?? {}) as Record<string, unknown>;
  return validateFields(
    [
      { field: 'email', validate: (v) => typeof v === 'string' && isValidEmail(v), message: 'email must be a valid email address' },
      { field: 'password', validate: (v) => typeof v === 'string' && isStrongPassword(v), message: 'password must be 8+ chars with upper, lower and digit' },
      { field: 'firstName', validate: isNonEmptyString, message: 'firstName is required' },
      { field: 'lastName', validate: isNonEmptyString, message: 'lastName is required' },
    ],
    data,
  );
}