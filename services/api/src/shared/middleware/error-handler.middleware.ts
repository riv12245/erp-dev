import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../errors/domain-error.js';
import { AppError } from '../errors/app-error.js';

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  correlationId?: string;
}

/**
 * Central error handler. NEVER leaks internal errors (Mongo, stack traces)
 * to clients. Internal errors are sanitized to a generic message and logged.
 * Must be registered as a 4-arg middleware so Express routes errors to it.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = req.correlationId;
  const body: ErrorResponseBody = { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, correlationId };

  if (error instanceof AppError) {
    body.error = { code: error.code, message: error.message, details: error.details };
    res.status(error.statusCode).json(body);
    return;
  }
  if (error instanceof DomainError) {
    body.error = { code: error.code, message: error.message, details: error.details };
    res.status(400).json(body);
    return;
  }
  if (error instanceof Error) {
    console.error('[error-handler]', correlationId, error.name);
  } else {
    console.error('[error-handler]', correlationId, 'Unknown error');
  }
  res.status(500).json(body);
}