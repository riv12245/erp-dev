import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';
import { registerOrderRoutes } from './presentation/order-routes.js';
export { SalesOrderService } from './application/order-service.js';
export type { DraftSalesOrderDTO as SalesOrder, DraftSalesOrderLine as SalesOrderLine } from '@erp/contracts/sales';

export type SalesOrderStatus = 'DRAFT' | 'CANCELLED';


export const SalesModule = { id: 'sales', displayName: 'Sales' } as const;

export function registerSalesRoutes(router: Router): void {
  registerOrderRoutes(router);
  router.get('/sales/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'sales', status: 'draft-orders', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}
