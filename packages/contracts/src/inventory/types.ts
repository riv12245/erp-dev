/**
 * Inventory contract types.
 */

/** Product definition */
export interface Product {
  readonly companyId: string;
  readonly version: number;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly sku: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly unitOfMeasure: UnitOfMeasure;
  readonly costPrice: number;
  readonly sellingPrice: number;
  readonly taxRate: number;
  readonly weight: number | null;
  readonly dimensions: Dimensions | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type UnitOfMeasure = "piece" | "kg" | "liter" | "meter" | "box" | "set";

export interface Dimensions {
  readonly length: number;
  readonly width: number;
  readonly height: number;
  readonly unit: string;
}

/** Stock Keeping Unit */
export interface SKU {
  readonly id: string;
  readonly productId: string;
  readonly code: string;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly reorderLevel: number;
  readonly maxStockLevel: number | null;
  readonly unitCost: number;
  readonly isTracked: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Warehouse definition */
export interface Warehouse {
  readonly companyId: string;
  readonly version: number;
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly location: string;
  readonly type: WarehouseType;
  readonly isActive: boolean;
  readonly capacity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type WarehouseType = "main" | "regional" | "local" | "dropship";

/** Inventory movement record */
export interface InventoryMovement {
  readonly companyId: string;
  readonly productId: string;
  readonly idempotencyKey: string;
  readonly id: string;
  readonly skuId: string;
  readonly warehouseId: string;
  readonly type: MovementType;
  readonly quantity: number;
  readonly reason: string;
  readonly referenceId: string | null;
  readonly createdAt: string;
}

export type MovementType = "inbound" | "outbound" | "transfer" | "adjustment" | "return" | "damage";

export type ProductCreateInput = Pick<Product, 'name' | 'sku' | 'unitOfMeasure'> & Partial<Omit<Product, 'id' | 'companyId' | 'version' | 'createdAt' | 'updatedAt' | 'name' | 'sku' | 'unitOfMeasure'>>;
export type ProductPatchInput = Partial<ProductCreateInput> & { readonly expectedVersion: number };
export type WarehouseCreateInput = Pick<Warehouse, 'name' | 'code'> & Partial<Pick<Warehouse, 'location' | 'type' | 'capacity' | 'isActive'>>;
export type WarehousePatchInput = Partial<WarehouseCreateInput> & { readonly expectedVersion: number };
export interface StockMovementInput {
  readonly productId: string;
  readonly warehouseId: string;
  readonly type: 'inbound' | 'outbound' | 'adjustment';
  readonly quantity: number;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly referenceId?: string | null;
}
export interface StockAvailability {
  readonly companyId: string;
  readonly productId: string;
  readonly warehouseId: string;
  readonly onHand: number;
  readonly available: number;
  readonly reserved: 0;
  readonly reservationsSupported: false;
}
