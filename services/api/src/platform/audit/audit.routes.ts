import { Router, Request, Response } from 'express';
import { getConnection } from '../../config/database.js';
import { requirePermission } from '../iam/authorization.js';
import { AuditService } from './audit-service.js';
import { asyncHandler, ok, fail } from '../../shared/index.js';
import { AppError } from '../../shared/errors/app-error.js';

/** Read-only audit endpoints. There is no write route by design (append-only). */
export function registerAuditRoutes(router: Router): void {
  router.get(
    '/audit',
    requirePermission('audit.read'),
    asyncHandler(async (req: Request, res: Response) => {
      const conn = getConnection();
      if (!conn) throw AppError.internal('Database not connected');
      if (!req.tenant) {
        fail(res, AppError.unauthorized('Tenant context required'));
        return;
      }
      const { entityType, actorId, limit: rawLimit, offset: rawOffset } = req.query as Record<string, string | undefined>;
      const service = new AuditService(conn);
      const entries = await service.list(req.tenant.tenantId, {
        entityType,
        actorId,
        limit: rawLimit ? Number(rawLimit) : 50,
        offset: rawOffset ? Number(rawOffset) : 0,
      });
      ok(res, entries);
    }),
  );
}