import type { Router, Request } from 'express';
import { asyncHandler, ok } from '../../../shared/index.js';
import { getConnection } from '../../../config/database.js';
import { requirePermission } from '../../../platform/iam/authorization.js';
import { requireCompanyAccess } from '../../../platform/tenancy/company-access.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { InventoryService } from '../application/inventory-service.js';
async function context(req: Request) {
    if (!req.tenant || !req.authUser)
        throw AppError.unauthorized();
    const connection = getConnection();
    if (!connection)
        throw AppError.internal('Database unavailable');
    const scope = await requireCompanyAccess(connection, req.tenant, req.authUser.userId, String(req.params.companyId));
    return { service: new InventoryService(connection), scope };
}
export function registerInventoryRoutes(router: Router): void {
    const base = '/companies/:companyId/inventory';
    router.get('/inventory/health', asyncHandler(async (_req, res) => {
        ok(res, { module: 'inventory', status: 'ready', db: getConnection()?.readyState === 1 ? 'up' : 'down' });
    }));
    for (const [path, kind, permission] of [['products', 'product', 'product'], ['warehouses', 'warehouse', 'warehouse'], ['stock', 'stock', 'stock'], ['movements', 'movement', 'stock']] as const) {
        router.get(`${base}/${path}`, requirePermission(`inventory.${permission}.read`), asyncHandler(async (req, res) => {
            const { service, scope } = await context(req);
            ok(res, await service.list(scope, kind, req.query));
        }));
    }
    router.post(`${base}/products`, requirePermission('inventory.product.write'), asyncHandler(async (req, res) => {
        const { service, scope } = await context(req);
        ok(res, await service.createProduct(scope, req.body, req.correlationId));
    }));
    router.get(`${base}/products/:id`, requirePermission('inventory.product.read'), asyncHandler(async (req, res) => {
        const { service, scope } = await context(req);
        ok(res, await service.getProduct(scope, String(req.params.id)));
    }));
    router.patch(`${base}/products/:id`, requirePermission('inventory.product.write'), asyncHandler(async (req, res) => {
        const { service, scope } = await context(req);
        ok(res, await service.patchProduct(scope, String(req.params.id), req.body, req.correlationId));
    }));
    router.post(`${base}/warehouses`, requirePermission('inventory.warehouse.write'), asyncHandler(async (req, res) => {
        const { service, scope } = await context(req);
        ok(res, await service.createWarehouse(scope, req.body, req.correlationId));
    }));
    router.get(`${base}/warehouses/:id`, requirePermission('inventory.warehouse.read'), asyncHandler(async (req, res) => {
        const { service, scope } = await context(req);
        ok(res, await service.getWarehouse(scope, String(req.params.id)));
    }));
    router.patch(`${base}/warehouses/:id`, requirePermission('inventory.warehouse.write'), asyncHandler(async (req, res) => {
        const { service, scope } = await context(req);
        ok(res, await service.patchWarehouse(scope, String(req.params.id), req.body, req.correlationId));
    }));
    router.post(`${base}/movements`, requirePermission('inventory.stock.write'), asyncHandler(async (req, res) => {
        const { service, scope } = await context(req);
        ok(res, await service.recordMovement(scope, req.body, req.correlationId));
    }));
}
