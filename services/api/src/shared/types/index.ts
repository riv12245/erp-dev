export type TenantId = string;
export type CompanyId = string;
export type BranchId = string;
export type EntityId = string;
export type UserId = string;

/** Tenant scope carried through the request pipeline. */
export interface TenantContext {
  readonly tenantId: TenantId;
  readonly companyId?: CompanyId;
  readonly branchId?: BranchId;
  readonly locale: string;
  readonly timezone: string;
}

/** Identity of the authenticated actor. */
export interface AuthUser {
  readonly userId: UserId;
  readonly sessionId?: string;
  readonly tenantId?: TenantId;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

/** Required base fields for every business entity. */
export interface TenantEntity {
  readonly tenantId: TenantId;
  readonly companyId?: CompanyId;
  readonly branchId?: BranchId;
  readonly createdAt: Date;
  readonly createdBy?: UserId;
  readonly updatedAt: Date;
  readonly updatedBy?: UserId;
  readonly version: number;
}

export interface Pagination {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

export type SortDirection = 'asc' | 'desc';

export interface QueryOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortDirection?: SortDirection;
}
