import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export type SalesOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'FULFILLING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'INVOICED'
  | 'CANCELLED'
  | 'REJECTED';

export interface SalesOrderLine {
  readonly lineId: string;
  readonly itemId: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly discountPercent?: number;
  readonly taxRate: number;
}

export interface SalesOrder {
  readonly orderId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly branchId?: string;
  readonly customerId: string;
  readonly number: string;
  readonly status: SalesOrderStatus;
  readonly lines: readonly SalesOrderLine[];
  readonly expectedDeliveryDate?: Date;
  readonly createdAt: Date;
}

export const SalesModule = { id: 'sales', displayName: 'Sales' } as const;

export function registerSalesRoutes(router: Router): void {
  router.get('/sales/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'sales', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}