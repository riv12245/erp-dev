import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../types/index.js';
import { TenantContextMissingError } from '../errors/tenant-error.js';
import { AppConfig } from '../../config/index.js';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Extracts tenant context from headers. Login and all protected routes MUST include this middleware.
 * Registration, health and status remain public.
 */
export function tenantContextMiddleware(config: AppConfig) {
  const headerName = config.tenantHeader.toLowerCase();
  return (req: Request, _res: Response, next: NextFunction): void => {
    const raw = req.headers[headerName];
    const tenantId = typeof raw === 'string' ? raw.trim() : undefined;
    if (!tenantId) {
      next(new TenantContextMissingError(undefined, { header: config.tenantHeader }));
      return;
    }
    req.tenant = {
      tenantId,
      companyId: headerValue(req.headers['x-company-id']),
      branchId: headerValue(req.headers['x-branch-id']),
      locale: headerValue(req.headers['accept-language']) ?? 'en',
      timezone: headerValue(req.headers['x-timezone']) ?? 'UTC',
    };
    next();
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
}