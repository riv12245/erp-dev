import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface Account {
  readonly accountId: string;
  readonly tenantId: string;
  readonly chartOfAccountsId: string;
  readonly code: string;
  readonly name: string;
  readonly type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  readonly normalBalance: 'debit' | 'credit';
}

export interface JournalLine {
  readonly accountId: string;
  readonly debit: number;
  readonly credit: number;
}

/** Double-entry invariant: total debits MUST equal total credits. */
export function assertBalancedJournal(lines: readonly JournalLine[]): void {
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new Error(`Unbalanced journal entry: debits ${totalDebit} != credits ${totalCredit}`);
  }
}

import { registerFinanceRoutes as registerObligationRoutes } from './presentation/finance-routes.js';

export { FinanceService } from './application/finance-service.js';
export type { FinancialObligationDTO, FinancialPaymentDTO } from '@erp/contracts/finance';

export const FinanceModule = { id: 'finance', displayName: 'Finance' } as const;

export function registerFinanceRoutes(router: Router): void {
  registerObligationRoutes(router);
  router.get('/finance/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'finance', status: 'active', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}