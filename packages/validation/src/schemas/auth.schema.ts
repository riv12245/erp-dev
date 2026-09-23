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
      { field: 'password', validate: (v) => typeof v === 'string' && v.length > 0 && v.length <= 4096, message: 'password must contain 1 to 4096 characters' },
    ],
    data,
  );
}

export function validateRegister(input: unknown): { ok: boolean; errors: readonly string[] } {
  const data = (input ?? {}) as Record<string, unknown>;
  return validateFields(
    [
      { field: 'email', validate: (v) => typeof v === 'string' && isValidEmail(v), message: 'email must be a valid email address' },
      { field: 'password', validate: (v) => typeof v === 'string' && isStrongPassword(v), message: 'password must be 8 to 4096 chars with upper, lower and digit' },
      { field: 'firstName', validate: (v) => isNonEmptyString(v) && v.length <= 100, message: 'firstName must contain 1 to 100 characters' },
      { field: 'lastName', validate: (v) => isNonEmptyString(v) && v.length <= 100, message: 'lastName must contain 1 to 100 characters' },
    ],
    data,
  );
}
