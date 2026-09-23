import type { Router, Request } from 'express';
import { getConnection } from '../../config/database.js';
import { AppError } from '../../shared/errors/app-error.js';
import { asyncHandler, ok } from '../../shared/index.js';
import { requirePermission } from '../iam/authorization.js';
import { CompanyService } from './company-service.js';

function service(req: Request): CompanyService {
  if (!req.tenant || !req.authUser) throw AppError.unauthorized();
  const connection = getConnection();
  if (!connection) throw AppError.internal('Database not connected');
  return new CompanyService(connection);
}

export function registerCompanyRoutes(router: Router): void {
  // All authenticated tenant members may discover only their explicitly authorized companies.
  router.get('/companies', asyncHandler(async (req, res) => {
    ok(res, await service(req).list(req.tenant!, req.authUser!.userId));
  }));
  router.post('/companies', requirePermission('tenancy.company.write'), asyncHandler(async (req, res) => {
    ok(res, await service(req).create(req.tenant!, req.authUser!.userId, req.body, req.correlationId));
  }));
  router.put('/companies/:companyId/memberships/:userId', requirePermission('tenancy.company.membership.write'), asyncHandler(async (req, res) => {
    ok(res, await service(req).setMembership(req.tenant!, req.authUser!.userId, req.params.companyId, req.params.userId, req.body, req.correlationId));
  }));
}
