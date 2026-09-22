import { Router, Request, Response } from 'express';
import { getConnection } from '../../config/database.js';
import { getTenantModel } from './tenant-model.js';
import { asyncHandler, ok, fail } from '../../shared/index.js';
import { AppError } from '../../shared/errors/app-error.js';

export function registerTenantRoutes(router: Router): void {
  router.get(
    '/tenants/context',
    asyncHandler(async (req: Request, res: Response) => {
      const conn = getConnection();
      if (!conn) throw AppError.internal('Database not connected');
      ok(res, {
        tenantId: req.tenant?.tenantId,
        companyId: req.tenant?.companyId,
        branchId: req.tenant?.branchId,
        locale: req.tenant?.locale,
        timezone: req.tenant?.timezone,
      });
    }),
  );

  router.get(
    '/tenants/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const conn = getConnection();
      if (!conn) throw AppError.internal('Database not connected');
      if (req.params.id !== req.tenant?.tenantId) throw AppError.forbidden('Tenant mismatch');
      const Tenant = getTenantModel(conn);
      const doc = await Tenant.findOne({ tenantId: req.tenant.tenantId, status: 'active' }).exec();
      if (!doc) {
        fail(res, AppError.notFound('Tenant not found'));
        return;
      }
      ok(res, {
        tenantId: doc.tenantId,
        name: doc.name,
        slug: doc.slug,
        plan: doc.plan,
        isolationMode: doc.isolationMode,
      });
    }),
  );
}