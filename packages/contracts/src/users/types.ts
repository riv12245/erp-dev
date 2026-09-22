/**
 * User management contract types.
 */

/** A user profile in the system */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly profile: UserProfile;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** User profile details */
export interface UserProfile {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly bio: string;
  readonly dateOfBirth: string | null;
  readonly language: string;
  readonly timezone: string;
}

/** User membership in a tenant */
export interface Membership {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** User role definition */
export interface Role {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: Permission[];
  readonly isSystem: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Permission definition */
export interface Permission {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
  readonly scope: string;
  readonly isSystem: boolean;
  readonly createdAt: string;
}

export type UserStatus = "active" | "inactive" | "suspended" | "pending";
export type RoleLevel = "super_admin" | "admin" | "manager" | "member" | "viewer";
