import type { ApiClient } from './client.js';
import { ApiClientError, createCorrelationId } from './errors.js';

export interface BusinessCompany { readonly id: string; readonly name: string; readonly defaultCurrency: string; }
export interface BusinessRecord { readonly [key: string]: unknown; readonly id?: string; readonly customerId?: string; readonly supplierId?: string; readonly orderId?: string; readonly obligationId?: string; readonly version?: number; }
export interface BusinessPage { readonly items: readonly BusinessRecord[]; readonly total: number; readonly page: number; readonly limit: number; readonly totalPages: number; }
export type BusinessResource = 'customers' | 'products' | 'warehouses' | 'stock' | 'movements' | 'orders' | 'suppliers' | 'obligations';
export interface BusinessField { readonly key: string; readonly label: string; readonly required?: boolean; readonly numeric?: boolean; readonly choices?: readonly string[]; readonly initial?: string; readonly lookup?: 'products' | 'warehouses' | 'customers'; }
export interface BusinessDefinition { readonly title: string; readonly path: string; readonly permission: string; readonly fields: readonly BusinessField[]; readonly search?: string; readonly editable?: boolean; readonly creatable?: boolean; }
export const companyFields: readonly BusinessField[] = [
  { key: 'name', label: 'Company name', required: true }, { key: 'taxId', label: 'Tax ID', required: true },
  { key: 'registrationNumber', label: 'Registration number', required: true },
  { key: 'defaultCurrency', label: 'Currency (ISO code)', required: true, initial: 'MXN' },
  { key: 'defaultTimezone', label: 'Timezone', required: true, initial: 'America/Mexico_City' },
];
export const businessDefinitions: Readonly<Record<BusinessResource, BusinessDefinition>> = {
  suppliers: { title: 'Suppliers', path: 'purchasing/suppliers', permission: 'purchasing.supplier', search: 'search', editable: true, creatable: true, fields: [
    { key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
  ] },
  orders: { title: 'Sales drafts', path: 'sales/orders', permission: 'sales.order', creatable: true, editable: true, fields: [
    { key: 'customerId', label: 'Customer', required: true, lookup: 'customers' }, { key: 'warehouseId', label: 'Warehouse', required: true, lookup: 'warehouses' },
    { key: 'currency', label: 'Currency (ISO code)', required: true, initial: 'MXN' },
  ] },
  customers: { title: 'Customers', path: 'crm/customers', permission: 'crm.customer', search: 'search', editable: true, creatable: true, fields: [
    { key: 'type', label: 'Customer type', required: true, choices: ['company', 'individual'], initial: 'company' },
    { key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'taxId', label: 'Tax ID' },
  ] },
  products: { title: 'Products', path: 'inventory/products', permission: 'inventory.product', search: 'q', editable: true, creatable: true, fields: [
    { key: 'name', label: 'Name', required: true }, { key: 'sku', label: 'SKU', required: true },
    { key: 'unitOfMeasure', label: 'Unit', required: true, choices: ['piece', 'kg', 'liter', 'meter', 'box', 'set'], initial: 'piece' },
    { key: 'description', label: 'Description' }, { key: 'category', label: 'Category' },
    { key: 'costPrice', label: 'Cost price', numeric: true, initial: '0' }, { key: 'sellingPrice', label: 'Selling price', numeric: true, initial: '0' },
    { key: 'taxRate', label: 'Tax rate', numeric: true, initial: '0' },
  ] },
  warehouses: { title: 'Warehouses', path: 'inventory/warehouses', permission: 'inventory.warehouse', search: 'q', editable: true, creatable: true, fields: [
    { key: 'name', label: 'Name', required: true }, { key: 'code', label: 'Code', required: true }, { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type', choices: ['main', 'regional', 'local', 'dropship'], initial: 'main' }, { key: 'capacity', label: 'Capacity', numeric: true, initial: '0' },
  ] },
  stock: { title: 'Stock availability', path: 'inventory/stock', permission: 'inventory.stock', fields: [] },
  movements: { title: 'Stock movements', path: 'inventory/movements', permission: 'inventory.stock', creatable: true, fields: [
    { key: 'productId', label: 'Product', required: true, lookup: 'products' }, { key: 'warehouseId', label: 'Warehouse', required: true, lookup: 'warehouses' },
    { key: 'type', label: 'Movement type', choices: ['inbound', 'outbound', 'adjustment'], initial: 'inbound', required: true },
    { key: 'quantity', label: 'Quantity (signed for adjustment)', numeric: true, required: true }, { key: 'reason', label: 'Reason', required: true },
    { key: 'referenceId', label: 'Reference' },
  ] },
  obligations: { title: 'Financial obligations', path: 'finance/obligations', permission: 'finance', creatable: true, fields: [
    { key: 'type', label: 'Type', choices: ['receivable', 'payable'], initial: 'receivable', required: true },
    { key: 'partyId', label: 'Party ID', required: true },
    { key: 'referenceId', label: 'Reference ID', required: true },
    { key: 'currency', label: 'Currency', required: true, initial: 'MXN' },
    { key: 'amount', label: 'Amount', numeric: true, required: true },
    { key: 'description', label: 'Description', required: true },
  ] },
};
export function businessRecordId(record: BusinessRecord): string { return record.obligationId ?? record.orderId ?? record.supplierId ?? record.customerId ?? record.id ?? `${String(record.productId)}:${String(record.warehouseId)}`; }
export function businessRecordLabel(record: BusinessRecord): string { return String(record.name ?? record.number ?? record.sku ?? record.code ?? record.type ?? record.productId ?? businessRecordId(record)); }
export function businessFormValues(fields: readonly BusinessField[], record?: BusinessRecord): Record<string, string> {
  return Object.fromEntries(fields.map(field => [field.key, record ? String(record[field.key] ?? '') : field.initial ?? '']));
}
/** Shared conversion for both platforms. Server remains authoritative for domain validation. */
export function businessFormBody(fields: readonly BusinessField[], values: Readonly<Record<string, string>>): Record<string, string | number> {
  const body: Record<string, string | number> = {};
  for (const field of fields) {
    const value = (values[field.key] ?? '').trim();
    if (!value && field.required) throw new Error(`${field.label} is required.`);
    if (!value) continue;
    if (field.choices && !field.choices.includes(value)) throw new Error(`Select a valid ${field.label.toLowerCase()}.`);
    if (field.numeric && !Number.isFinite(Number(value))) throw new Error(`${field.label} must be a finite number.`);
    body[field.key] = field.numeric ? Number(value) : value;
  }
  return body;
}
export function businessError(error: unknown): string {
  if (error instanceof ApiClientError && error.status === 409) return 'This record changed or conflicts with an existing record. Reload its details before trying again.';
  if (error instanceof ApiClientError && error.status === 403) return 'Your account does not have permission for this action in this company.';
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}
/** Ignore late reads after a company switch/unmount, even if a transport ignores abort. */
export async function applyBusinessResult<T>(request: Promise<T>, signal: AbortSignal, apply: (value: T) => void): Promise<void> {
  const value = await request;
  if (!signal.aborted) apply(value);
}
export interface BusinessIdentity { readonly requesterId: string; readonly tenantId: string; readonly permissions: readonly string[]; }
export function businessSessionKey(epoch: number, tenantId: string | null, userId: string | undefined): string { return `${epoch}:${tenantId}:${userId}`; }
/** Permissions come from the authenticated server, never decoded token claims. */
export async function hydrateBusinessIdentity(client: ApiClient, options: { signal: AbortSignal; epoch: number; getEpoch: () => number; apply: (identity: BusinessIdentity) => void }): Promise<void> {
  await applyBusinessResult(client.get<BusinessIdentity>('/api/v1/auth/me', { signal: options.signal }), options.signal, identity => {
    if (options.epoch === options.getEpoch()) options.apply(identity);
  });
}
export interface SalesDraftLineInput { readonly itemId: string; readonly quantity: string; readonly unitPrice: string; }
export function salesDraftLines(lines: readonly SalesDraftLineInput[], currency = 'MXN'): readonly { itemId: string; quantity: number; unitPrice: number }[] {
  if (lines.length < 1 || lines.length > 100) throw new Error('A draft requires 1 to 100 lines.');
  const priceDecimals = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  return lines.map((line, index) => {
    const quantity = Number(line.quantity), unitPrice = Number(line.unitPrice);
    if (!line.itemId) throw new Error(`Select a product for line ${index + 1}.`);
    if (!line.quantity.trim() || !Number.isFinite(quantity) || quantity < 0.001 || quantity > 1_000_000 || Math.abs(Math.round(quantity * 1000) / 1000 - quantity) > Number.EPSILON * Math.max(1, quantity)) throw new Error(`Line ${index + 1}: quantity must be positive, at most 1,000,000, with at most 3 decimal places.`);
    if (!line.unitPrice.trim() || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000_000 || Number(unitPrice.toFixed(priceDecimals)) !== unitPrice) throw new Error(`Line ${index + 1}: price must be nonnegative, at most 1,000,000,000, with at most ${priceDecimals} decimal places for ${currency}.`);
    return { itemId: line.itemId, quantity, unitPrice };
  });
}
export function createBusinessClient(client: ApiClient) {
  const path = (companyId: string, resource: BusinessResource) => `/api/v1/companies/${encodeURIComponent(companyId)}/${businessDefinitions[resource].path}`;
  return {
    companies: (signal?: AbortSignal) => client.get<readonly BusinessCompany[]>('/api/v1/companies', { signal }),
    createCompany: (body: Readonly<Record<string, unknown>>, signal?: AbortSignal) => client.post<BusinessCompany>('/api/v1/companies', body, { signal }),
    list: (companyId: string, resource: BusinessResource, query: Readonly<Record<string, string | number | undefined>>, signal?: AbortSignal) => client.get<BusinessPage>(path(companyId, resource), { query, signal }),
    detail: (companyId: string, resource: BusinessResource, id: string, signal?: AbortSignal) => client.get<BusinessRecord>(`${path(companyId, resource)}/${encodeURIComponent(id)}`, { signal }),
    create: (companyId: string, resource: BusinessResource, body: Readonly<Record<string, unknown>>, signal?: AbortSignal) => {
      const key = (resource === 'movements' || resource === 'orders') && typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined;
      return client.post<BusinessRecord>(path(companyId, resource), body, { signal, idempotencyKey: key, idempotencyGuaranteed: !!key });
    },
    update: (companyId: string, resource: BusinessResource, id: string, body: Readonly<Record<string, unknown>>, signal?: AbortSignal) => client.patch<BusinessRecord>(`${path(companyId, resource)}/${encodeURIComponent(id)}`, body, { signal }),
    confirmOrder: (companyId: string, id: string, expectedVersion: number, signal?: AbortSignal) => client.post<BusinessRecord>(`${path(companyId, 'orders')}/${encodeURIComponent(id)}/confirm`, { expectedVersion }, { signal }),
    cancelOrder: (companyId: string, id: string, expectedVersion: number, signal?: AbortSignal) => client.post<BusinessRecord>(`${path(companyId, 'orders')}/${encodeURIComponent(id)}/cancel`, { expectedVersion }, { signal }),
    receiveGoods: (companyId: string, id: string, expectedVersion: number, signal?: AbortSignal) => client.post<BusinessRecord>(`/api/v1/companies/${encodeURIComponent(companyId)}/purchasing/orders/${encodeURIComponent(id)}/receive`, { expectedVersion }, { signal }),
    recordPayment: (companyId: string, obligationId: string, body: Readonly<Record<string, unknown>>, signal?: AbortSignal) => client.post<BusinessRecord>(`/api/v1/companies/${encodeURIComponent(companyId)}/finance/obligations/${encodeURIComponent(obligationId)}/payments`, body, { signal }),
    movementKey: createCorrelationId,
  };
}
