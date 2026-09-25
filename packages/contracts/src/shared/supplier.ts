export type SupplierStatus = 'active' | 'inactive';
export interface CreateSupplierRequest {
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
}
export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  readonly expectedVersion: number;
  readonly status?: SupplierStatus;
}
export interface Supplier extends CreateSupplierRequest {
  readonly supplierId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly status: SupplierStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly updatedBy: string;
}
export interface SupplierListQuery {
  readonly search?: string;
  readonly status?: SupplierStatus;
  readonly page?: number;
  readonly limit?: number;
}
export interface SupplierListResult {
  readonly items: readonly Supplier[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderLineInput {
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface CreatePurchaseOrderRequest {
  readonly supplierId: string;
  readonly warehouseId: string;
  readonly currency: string;
  readonly idempotencyKey: string;
  readonly lines: readonly PurchaseOrderLineInput[];
}

export interface PurchaseOrderLine extends PurchaseOrderLineInput {
  readonly lineId: string;
  readonly description: string;
  readonly subtotal: number;
}

export interface PurchaseOrderDTO {
  readonly orderId: string;
  readonly number: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly supplierId: string;
  readonly warehouseId: string;
  readonly currency: string;
  readonly status: PurchaseOrderStatus;
  readonly lines: readonly PurchaseOrderLine[];
  readonly subtotal: number;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly updatedBy: string;
}

export interface PurchaseOrderListResult {
  readonly items: readonly PurchaseOrderDTO[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}
