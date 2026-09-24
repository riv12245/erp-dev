export { InventoryService } from './application/inventory-service.js';
export type { MovementInput } from './application/inventory-service.js';
export { validateMovementAllowed, nextStockBalance } from './domain/inventory.js';
export type { StockMovement, StockMovementType } from './domain/inventory.js';
export { registerInventoryRoutes } from './presentation/inventory.routes.js';
export const InventoryModule = { id: 'inventory', displayName: 'Inventory' } as const;
