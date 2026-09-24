import type { Request, Router } from 'express';
import { getConnection } from '../../../config/database.js';
import { requirePermission } from '../../../platform/iam/authorization.js';
import { requireCompanyAccess } from '../../../platform/tenancy/company-access.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { asyncHandler, ok } from '../../../shared/index.js';
import { customerQuery } from '../domain/customer-domain.js';
import { CustomerService } from '../application/customer-service.js';

async function context(req: Request) {
  if (!req.tenant || !req.authUser) throw AppError.unauthorized();
  const connection = getConnection();
  if (!connection) throw AppError.internal('Database unavailable');
  const scope = await requireCompanyAccess(connection, req.tenant, req.authUser.userId, String(req.params.companyId));
  return { scope, service: new CustomerService(connection) };
}
export function registerCustomerRoutes(router: Router): void {
  const path = '/companies/:companyId/crm/customers';
  router.get(path, requirePermission('crm.customer.read'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    ok(res, await service.list(scope, customerQuery(req.query)));
  }));
  router.post(path, requirePermission('crm.customer.write'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    const customer = await service.create(scope, req.body, req.correlationId);
    res.status(201); ok(res, customer);
  }));
  router.get(`${path}/:customerId`, requirePermission('crm.customer.read'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    ok(res, await service.get(scope, String(req.params.customerId)));
  }));
  router.patch(`${path}/:customerId`, requirePermission('crm.customer.write'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    ok(res, await service.update(scope, String(req.params.customerId), req.body, req.correlationId));
  }));
}
