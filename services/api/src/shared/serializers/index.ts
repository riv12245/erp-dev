import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';

/** Consistent success envelope: { data, meta, correlationId }. */
export function ok(res: Response, data: unknown, meta?: Record<string, unknown>): void {
  res.json({
    data,
    meta,
    correlationId: (res.req as Request).correlationId,
  });
}

/** Consistent error envelope: { error: { code, message, details }, correlationId }. */
export function fail(res: Response, error: AppError): void {
  res.status(error.statusCode).json({
    error: { code: error.code, message: error.message, details: error.details },
    correlationId: (res.req as Request).correlationId,
  });
}

/** Simple async wrapper converting rejected promises to next(error). */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}