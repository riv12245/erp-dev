import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export type ProductionOrderStatus = 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export interface ProductionOrder {
  readonly orderId: string;
  readonly tenantId: string;
  readonly productId: string;
  readonly workCenterId: string;
  readonly plannedQuantity: number;
  readonly completedQuantity: number;
  readonly status: ProductionOrderStatus;
  readonly startedAt?: Date;
}

export const ProductionModule = { id: 'production', displayName: 'Production' } as const;

export function registerProductionRoutes(router: Router): void {
  router.get('/production/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'production', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}