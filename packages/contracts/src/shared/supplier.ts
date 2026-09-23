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
