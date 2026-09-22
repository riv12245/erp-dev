import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface Customer {
  readonly customerId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly type: 'company' | 'individual';
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly taxId?: string;
  readonly status: 'active' | 'inactive' | 'blocked';
}

export interface DealStage {
  readonly stageId: string;
  readonly name: string;
  readonly probability: number;
  readonly orderIndex: number;
}

export interface Deal {
  readonly dealId: string;
  readonly tenantId: string;
  readonly customerId: string;
  readonly amount: number;
  readonly stageId: string;
  readonly ownerUserId?: string;
  readonly closedAt?: Date;
}

export const CrmModule = { id: 'crm', displayName: 'CRM' } as const;

export function registerCrmRoutes(router: Router): void {
  router.get('/crm/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'crm', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}