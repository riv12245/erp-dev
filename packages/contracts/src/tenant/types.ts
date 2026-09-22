/**
 * Tenant contract types for multi-tenancy support.
 */

/** The top-level tenant entity */
export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: SubscriptionPlan;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise";

/** Company within a tenant */
export interface Company {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly taxId: string;
  readonly registrationNumber: string;
  readonly defaultCurrency: string;
  readonly defaultTimezone: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Business unit within a company */
export interface BusinessUnit {
  readonly id: string;
  readonly companyId: string;
  readonly name: string;
  readonly code: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Branch within a business unit */
export interface Branch {
  readonly id: string;
  readonly businessUnitId: string;
  readonly name: string;
  readonly address: Address;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Physical location */
export interface Location {
  readonly id: string;
  readonly branchId: string;
  readonly type: LocationType;
  readonly address: Address;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type LocationType = "warehouse" | "retail" | "office" | "manufacturing" | "distribution";

/** Physical address */
export interface Address {
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}
