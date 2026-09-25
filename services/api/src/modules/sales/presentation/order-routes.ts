import type { Request, Router } from 'express';
import { getConnection } from '../../../config/database.js';
import { requirePermission } from '../../../platform/iam/authorization.js';
import { requireCompanyAccess } from '../../../platform/tenancy/company-access.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { asyncHandler, ok } from '../../../shared/index.js';
import { SalesOrderService } from '../application/order-service.js';
async function context(req: Request) {
  if (!req.tenant || !req.authUser) throw AppError.unauthorized();
  const connection = getConnection(); if (!connection) throw AppError.internal('Database unavailable');
  const scope = await requireCompanyAccess(connection, req.tenant, req.authUser.userId, String(req.params.companyId));
  return { scope, service: new SalesOrderService(connection) };
}
export function registerOrderRoutes(router: Router): void {
  const path = '/companies/:companyId/sales/orders';
  router.get(path, requirePermission('sales.order.read'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req); ok(res, await service.list(scope, req.query));
  }));
  router.post(path, requirePermission('sales.order.write'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req); const order = await service.create(scope, req.body, req.correlationId); res.status(201); ok(res, order);
  }));
  router.get(`${path}/:orderId`, requirePermission('sales.order.read'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req); ok(res, await service.get(scope, String(req.params.orderId)));
  }));
  router.post(`${path}/:orderId/confirm`, requirePermission('sales.order.write'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req); ok(res, await service.confirm(scope, String(req.params.orderId), req.body, req.correlationId));
  }));
  router.post(`${path}/:orderId/cancel`, requirePermission('sales.order.write'), asyncHandler(async (req, res) => {
    const { scope, service } = await context(req); ok(res, await service.cancel(scope, String(req.params.orderId), req.body, req.correlationId));
  }));
}
