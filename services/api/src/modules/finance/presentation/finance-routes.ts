import type { Request, Router } from 'express';
import { getConnection } from '../../../config/database.js';
import { requirePermission } from '../../../platform/iam/authorization.js';
import { requireCompanyAccess } from '../../../platform/tenancy/company-access.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { asyncHandler, ok } from '../../../shared/index.js';
import { FinanceService } from '../application/finance-service.js';

async function context(req: Request) {
  if (!req.tenant || !req.authUser) throw AppError.unauthorized();
  const connection = getConnection();
  if (!connection) throw AppError.internal('Database unavailable');
  const scope = await requireCompanyAccess(
    connection,
    req.tenant,
    req.authUser.userId,
    String(req.params.companyId)
  );
  return { scope, service: new FinanceService(connection) };
}

export function registerFinanceRoutes(router: Router): void {
  const path = '/companies/:companyId/finance/obligations';

  router.get(
    path,
    requirePermission('finance.read'),
    asyncHandler(async (req, res) => {
      const { scope, service } = await context(req);
      ok(res, await service.listObligations(scope, req.query));
    })
  );

  router.post(
    path,
    requirePermission('finance.write'),
    asyncHandler(async (req, res) => {
      const { scope, service } = await context(req);
      const obligation = await service.createObligation(scope, req.body, req.correlationId);
      res.status(201);
      ok(res, obligation);
    })
  );

  router.get(
    `${path}/:obligationId`,
    requirePermission('finance.read'),
    asyncHandler(async (req, res) => {
      const { scope, service } = await context(req);
      ok(res, await service.getObligation(scope, String(req.params.obligationId)));
    })
  );

  router.post(
    `${path}/:obligationId/payments`,
    requirePermission('finance.write'),
    asyncHandler(async (req, res) => {
      const { scope, service } = await context(req);
      ok(
        res,
        await service.recordPayment(
          scope,
          String(req.params.obligationId),
          req.body,
          req.correlationId
        )
      );
    })
  );
}
