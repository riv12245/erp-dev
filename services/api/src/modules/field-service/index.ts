import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface FieldServiceJob {
  readonly jobId: string;
  readonly tenantId: string;
  readonly technicianUserId?: string;
  readonly scheduledAt?: Date;
  readonly status: 'UNASSIGNED' | 'ASSIGNED' | 'IN_TRANSIT' | 'ON_SITE' | 'COMPLETED' | 'CANCELLED';
  readonly customerAddress?: string;
}

export interface FieldServiceModuleDefinition {
  readonly id: 'field-service';
  readonly displayName: 'Field Service';
}

export const FieldServiceModule: FieldServiceModuleDefinition = { id: 'field-service', displayName: 'Field Service' } as const;

export function registerFieldServiceRoutes(router: Router): void {
  router.get('/field-service/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'field-service', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}