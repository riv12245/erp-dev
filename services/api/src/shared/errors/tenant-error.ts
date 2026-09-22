import { DomainError } from './domain-error.js';
import { AppError } from './app-error.js';

/** Raised when a tenant is missing, malformed, or when a principal lacks rights over a tenant. */
export class TenantAccessDeniedError extends DomainError {
  constructor(message = 'Tenant access denied', details?: Record<string, unknown>) {
    super('TENANT_ACCESS_DENIED', message, details);
  }
}

/**
 * Raised when required tenant context is absent from a request.
 * Maps to 401 because a missing tenant header is an authentication problem.
 */
export class TenantContextMissingError extends AppError {
  constructor(message = 'Tenant context is required', details?: Record<string, unknown>) {
    super(401, 'TENANT_CONTEXT_MISSING', message, details);
  }
}