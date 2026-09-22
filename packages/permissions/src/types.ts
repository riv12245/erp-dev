/**
 * Permission and identity types for RBAC + Policies.
 */

/** A permission describes WHAT a principal can do. Format: resource.action.scope (e.g. sales.order.approve). */
export type PermissionName = string;

export interface Permission {
  readonly name: PermissionName;
  readonly description?: string;
}

export interface Role {
  readonly id?: string;
  readonly name: string;
  readonly tenantId?: string;
  readonly permissions: readonly PermissionName[];
  readonly isSystem?: boolean;
}

/** A resource that permissions apply to (with tenant scoping). */
export interface SubjectContext {
  readonly tenantId: string;
  readonly companyId?: string;
  readonly branchId?: string;
}

/** Compact identity used for permission evaluation. */
export interface PermissionPrincipal {
  readonly id: string;
  readonly tenantId: string;
  readonly roles: readonly Role[];
}

export interface PermissionGrant {
  readonly principalId: string;
  readonly tenantId: string;
  readonly roleName: string;
  readonly permissions: readonly PermissionName[];
}