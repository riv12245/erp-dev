import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface Shipment {
  readonly shipmentId: string;
  readonly tenantId: string;
  readonly waybillNumber?: string;
  readonly status: 'PREPARED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION';
  readonly originWarehouseId: string;
  readonly destinationAddress?: string;
  readonly carrier?: string;
}

export const LogisticsModule = { id: 'logistics', displayName: 'Logistics' } as const;

export function registerLogisticsRoutes(router: Router): void {
  router.get('/logistics/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'logistics', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}