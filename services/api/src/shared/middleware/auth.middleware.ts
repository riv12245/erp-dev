import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { TenantContextMissingError } from '../errors/tenant-error.js';
import { AuthUser } from '../types/index.js';
import { AppConfig } from '../../config/index.js';
import { AuthDomainService } from '../../platform/auth/auth-service.js';

declare global {
  namespace Express { interface Request { authUser?: AuthUser; } }
}
export type IdentityResolver = (userId: string, tenantId: string) => Promise<AuthUser>;

/** Each app captures its own verifier and resolver; no mutable global decoder. */
export function requireAuth(config: AppConfig, resolveIdentity: IdentityResolver) {
  const domain = new AuthDomainService(config.jwtSecret);
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authenticate = async () => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
      const payload = await domain.verify(header.slice(7));
      if (!payload?.userId || !payload.tenantId) throw AppError.unauthorized('Invalid or expired token');
      if (!req.tenant) throw new TenantContextMissingError();
      if (payload.tenantId !== req.tenant.tenantId) throw AppError.forbidden('Tenant mismatch');
      req.authUser = await resolveIdentity(payload.userId, payload.tenantId);
    };
    authenticate().then(() => next()).catch(next);
  };
}
