import { Request, Response, NextFunction } from 'express';
import { RbacEngine } from '@erp/permissions';
import { AppError } from '../../shared/errors/app-error.js';

const engine = new RbacEngine();
/** Shared authorization boundary. Effective permissions come from server-side IAM. */
export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user || !req.tenant || !user.tenantId) { next(AppError.unauthorized()); return; }
    const result = engine.evaluate({
      principal: { id: user.userId, tenantId: user.tenantId, roles: [{ name: 'effective', permissions: user.permissions }] },
      subject: req.tenant, permission,
    });
    next(result.allowed ? undefined : AppError.forbidden());
  };
}
