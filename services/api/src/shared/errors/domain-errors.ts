import { DomainError } from './domain-error.js';

export class InsufficientStockError extends DomainError {
  constructor(details?: Record<string, unknown>) {
    super('INVENTORY_INSUFFICIENT_STOCK', 'Insufficient stock for the requested quantity', details);
  }
}

export class UnauthorizedTransitionError extends DomainError {
  constructor(message = 'Unallowed state transition', details?: Record<string, unknown>) {
    super('UNAUTHORIZED_TRANSITION', message, details);
  }
}

export class FiscalPeriodClosedError extends DomainError {
  constructor(details?: Record<string, unknown>) {
    super('FISCAL_PERIOD_CLOSED', 'The fiscal period is closed', details);
  }
}

export class ConcurrentModificationError extends DomainError {
  constructor(entityType?: string, details?: Record<string, unknown>) {
    super('CONCURRENT_MODIFICATION', `Optimistic concurrency conflict on ${entityType ?? 'entity'}`, details);
  }
}

export class IdempotencyConflictError extends DomainError {
  constructor(details?: Record<string, unknown>) {
    super('IDEMPOTENCY_CONFLICT', 'An operation with this idempotency key already produced a different outcome', details);
  }
}