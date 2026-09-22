/**
 * Inventory contract types.
 */

/** Product definition */
export interface Product {
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
