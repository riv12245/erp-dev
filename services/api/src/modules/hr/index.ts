import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface Employee {
  readonly employeeId: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly department: string;
  readonly jobTitle: string;
  readonly salaryCurrency: string;
  readonly hireDate: Date;
}

export const HrModule = { id: 'hr', displayName: 'HR' } as const;

export function registerHrRoutes(router: Router): void {
  router.get('/hr/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'hr', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}