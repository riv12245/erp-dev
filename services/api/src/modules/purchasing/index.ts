import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';
import { registerSupplierRoutes } from './presentation/supplier-routes.js';
import { registerPurchaseOrderRoutes } from './presentation/purchase-order-routes.js';
export { SupplierService } from './application/supplier-service.js';
export { PurchaseOrderService } from './application/purchase-order-service.js';
export type { Supplier, PurchaseOrderDTO } from '@erp/contracts/shared';

export const PurchasingModule = { id: 'purchasing', displayName: 'Purchasing' } as const;

export function registerPurchasingRoutes(router: Router): void {
  registerSupplierRoutes(router);
  registerPurchaseOrderRoutes(router);
  router.get('/purchasing/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'purchasing', status: 'active', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}
