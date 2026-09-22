import { DomainError } from './domain-error.js';

export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** HTTP-aware application error that maps to a status code. */
export class AppError extends DomainError {
  readonly statusCode: number;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.statusCode = statusCode;
  }

  static unauthorized(message = 'Unauthorized', details?: Record<string, unknown>): AppError {
    return new AppError(401, ErrorCode.UNAUTHORIZED, message, details);
  }

  static forbidden(message = 'Forbidden', details?: Record<string, unknown>): AppError {
    return new AppError(403, ErrorCode.FORBIDDEN, message, details);
  }

  static notFound(message = 'Resource not found', details?: Record<string, unknown>): AppError {
    return new AppError(404, ErrorCode.NOT_FOUND, message, details);
  }

  static validation(message = 'Validation error', details?: Record<string, unknown>): AppError {
    return new AppError(400, ErrorCode.VALIDATION, message, details);
  }

  static conflict(message = 'Conflict', details?: Record<string, unknown>): AppError {
    return new AppError(409, ErrorCode.CONFLICT, message, details);
  }

  static internal(message = 'Internal server error', details?: Record<string, unknown>): AppError {
    return new AppError(500, ErrorCode.INTERNAL, message, details);
  }
}