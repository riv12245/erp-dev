import type { StockAvailability } from '../inventory/index.js';
export interface DraftSalesOrderLineInput { readonly itemId: string; readonly quantity: number; readonly unitPrice: number }
export interface CreateDraftSalesOrderRequest {
  readonly customerId: string; readonly warehouseId: string; readonly currency: string;
  readonly idempotencyKey: string; readonly lines: readonly DraftSalesOrderLineInput[];
}
export interface DraftSalesOrderLine extends DraftSalesOrderLineInput { readonly lineId: string; readonly description: string; readonly subtotal: number }
export interface DraftSalesOrderDTO {
  readonly orderId: string; readonly number: string; readonly tenantId: string; readonly companyId: string;
  readonly customerId: string; readonly warehouseId: string; readonly currency: string;
  readonly status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'; readonly lines: readonly DraftSalesOrderLine[];
  readonly subtotal: number; readonly total: null; readonly taxAmount: null;
  readonly pricingStatus: 'tax-policy-required'; readonly version: number;
  readonly createdAt: string; readonly updatedAt: string; readonly createdBy: string; readonly updatedBy: string;
}
export interface DraftSalesOrderAvailability { readonly itemId: string; readonly availability: StockAvailability | null; readonly availabilityStatus: 'available' | 'reference-inactive-or-missing' }
export interface DraftSalesOrderDetail extends DraftSalesOrderDTO { readonly availability: readonly DraftSalesOrderAvailability[] }
export interface DraftSalesOrderList { readonly items: readonly DraftSalesOrderDTO[]; readonly total: number; readonly page: number; readonly limit: number; readonly totalPages: number }
