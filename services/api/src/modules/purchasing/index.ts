import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';
import { registerSupplierRoutes } from './presentation/supplier-routes.js';
export { SupplierService } from './application/supplier-service.js';
export type { Supplier } from '@erp/contracts/shared';

export interface PurchaseOrder {
  readonly orderId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly supplierId: string;
  readonly status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  readonly expectedArrival?: Date;
}

export const PurchasingModule = { id: 'purchasing', displayName: 'Purchasing' } as const;

export function registerPurchasingRoutes(router: Router): void {
  registerSupplierRoutes(router);
  router.get('/purchasing/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'purchasing', status: 'active', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}
