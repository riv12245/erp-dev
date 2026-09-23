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
  const parseError = error as { type?: unknown } | null;
  if (parseError?.type === 'entity.parse.failed' || parseError?.type === 'entity.too.large') {
    body.error = { code: 'VALIDATION_ERROR', message: parseError.type === 'entity.too.large' ? 'Request body too large' : 'Malformed JSON body' };
    res.status(parseError.type === 'entity.too.large' ? 413 : 400).json(body);
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode === 401 || error.statusCode === 403) console.warn('[access-denied]', { correlationId, code: error.code });
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
