/**
 * Shared/common types used across all ERP packages.
 */

/** Base entity with common fields */
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Tenant context for multi-tenancy */
export interface TenantContext {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly tenantPlan: string;
  readonly userId: string | null;
  readonly userRole: string | null;
  readonly isSystemOperation: boolean;
}

/** Pagination parameters */
export interface PaginationParams {
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: string | null;
  readonly sortDirection: "asc" | "desc";
}

/** Paginated result */
export interface PaginatedResult<T> {
  readonly items: T[];
  readonly totalItems: number;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

/** API response wrapper */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error: string | null;
  readonly timestamp: string;
  readonly requestId: string;
}

/** Simple key-value pair */
export interface KeyValuePair {
  readonly key: string;
  readonly value: string;
}

/** Soft delete marker */
export interface SoftDelete {
  readonly isDeleted: boolean;
  readonly deletedAt: string | null;
  readonly deletedBy: string | null;
}
