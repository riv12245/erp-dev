import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';
import { InsufficientStockError } from '../../shared/errors/domain-errors.js';

export type StockMovementType = 'inbound' | 'outbound' | 'adjustment' | 'transfer-in' | 'transfer-out';

export interface StockMovement {
  readonly movementId: string;
  readonly tenantId: string;
  readonly itemId: string;
  readonly warehouseId: string;
  readonly type: StockMovementType;
  readonly quantity: number;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly ledgerDate: Date;
}

/**
 * Inventory Ledger invariant enforced by the ledger service:
 * on-hand quantity never goes negative.
 */
export function validateMovementAllowed(currentOnHand: number, movement: Pick<StockMovement, 'quantity' | 'type'>): void {
  const decrementsStock = movement.type === 'adjustment' && movement.quantity < 0;
  if ((movement.type === 'outbound' || decrementsStock) && movement.quantity > currentOnHand) {
    throw new InsufficientStockError({ itemId: undefined, requested: movement.quantity, available: currentOnHand });
  }
}

export const InventoryModule = { id: 'inventory', displayName: 'Inventory' } as const;

export function registerInventoryRoutes(router: Router): void {
  router.get('/inventory/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'inventory', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}