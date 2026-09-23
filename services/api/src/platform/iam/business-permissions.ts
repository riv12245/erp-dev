/** Permissions backed by implemented endpoints. Provision grants explicitly; names never imply authorization. */
export const BUSINESS_PERMISSIONS = [
  'tenancy.company.write', 'tenancy.company.membership.write',
  'crm.customer.read', 'crm.customer.write',
  'inventory.product.read', 'inventory.product.write',
  'inventory.warehouse.read', 'inventory.warehouse.write',
  'inventory.stock.read', 'inventory.stock.write',
] as const;
