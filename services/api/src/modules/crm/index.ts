import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';
import { registerCustomerRoutes } from './presentation/customer-routes.js';
export { CustomerService } from './application/customer-service.js';
export type { Customer } from '@erp/contracts/shared';


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
  registerCustomerRoutes(router);
  router.get('/crm/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'crm', status: 'active', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}
