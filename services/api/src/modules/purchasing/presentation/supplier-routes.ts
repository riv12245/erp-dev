import type { Request, Router } from 'express';
import { getConnection } from '../../../config/database.js';
import { requirePermission } from '../../../platform/iam/authorization.js';
import { requireCompanyAccess } from '../../../platform/tenancy/company-access.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { asyncHandler, ok } from '../../../shared/index.js';
import { supplierQuery } from '../domain/supplier-domain.js';
import { SupplierService } from '../application/supplier-service.js';

async function context(req: Request) {
  if (!req.tenant || !req.authUser) throw AppError.unauthorized();
  const connection = getConnection();
  if (!connection) throw AppError.internal('Database unavailable');
  const scope = await requireCompanyAccess(connection, req.tenant, req.authUser.userId, String(req.params.companyId));
  return { scope, service: new SupplierService(connection) };
}
export function registerSupplierRoutes(router: Router): void {
  const path = '/companies/:companyId/purchasing/suppliers';
  router.get(path, requirePermission('purchasing.supplier.read'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    ok(res, await service.list(scope, supplierQuery(req.query)));
  }));
  router.post(path, requirePermission('purchasing.supplier.write'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    const supplier = await service.create(scope, req.body, req.correlationId);
    res.status(201); ok(res, supplier);
  }));
  router.get(`${path}/:supplierId`, requirePermission('purchasing.supplier.read'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    ok(res, await service.get(scope, String(req.params.supplierId)));
  }));
  router.patch(`${path}/:supplierId`, requirePermission('purchasing.supplier.write'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req);
    ok(res, await service.update(scope, String(req.params.supplierId), req.body, req.correlationId));
  }));
}
