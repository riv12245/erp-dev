import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      requestId?: string;
    }
  }
}

export interface RequestContext {
  readonly correlationId: string;
  readonly requestId: string;
  readonly startedAt: number;
}

/**
 * Assigns a correlationId (honoring an inbound x-correlation-id) and a
 * requestId to every request. The correlationId propagates to logs, audit
 * and outbox events.
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const inbound = req.headers['x-correlation-id'];
  req.correlationId = typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID();
  req.requestId = randomUUID();
  (req as Request & { requestContext: RequestContext }).requestContext = {
    correlationId: req.correlationId,
    requestId: req.requestId,
    startedAt: Date.now(),
  };
  next();
}

export function readRequestContext(req: Request): RequestContext {
  return (req as Request & { requestContext: RequestContext }).requestContext ?? {
    correlationId: req.correlationId ?? randomUUID(),
    requestId: req.requestId ?? randomUUID(),
    startedAt: Date.now(),
  };
}