import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface EshopProduct {
  readonly productId: string;
  readonly tenantId: string;
  readonly sku: string;
  readonly name: string;
  readonly price: number;
  readonly stockAvailable: number;
  readonly isPublished: boolean;
}

export const EshopModule = { id: 'eshop', displayName: 'Ecommerce' } as const;

export function registerEshopRoutes(router: Router): void {
  router.get('/eshop/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'eshop', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}