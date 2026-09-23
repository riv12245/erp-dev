export type CustomerStatus = 'active' | 'inactive' | 'blocked';
export interface CreateCustomerRequest {
  readonly type: 'company' | 'individual';
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly taxId?: string;
}
export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  readonly expectedVersion: number;
  readonly status?: CustomerStatus;
}
export interface Customer extends CreateCustomerRequest {
  readonly customerId: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly status: CustomerStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly updatedBy: string;
}
export interface CustomerListQuery {
  readonly search?: string;
  readonly status?: CustomerStatus;
  readonly page?: number;
  readonly limit?: number;
}
export interface CustomerListResult {
  readonly items: readonly Customer[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}
