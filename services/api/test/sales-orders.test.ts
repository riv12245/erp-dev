import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { setupApi, registerAndLogin, authHeaders, apiRequest, type TestHarness } from './helpers.js';
import type { CompanyScope } from '../src/platform/tenancy/company-access.js';

describe('Draft sales orders through HTTP and a real replica set', () => {
  let h: TestHarness;
  let headers: Record<string, string>;
  let scope: CompanyScope;
  let customerId: string;
  let itemId: string;
  let warehouseId: string;
  const companyId = randomUUID();
  const path = `/api/v1/companies/${companyId}/sales/orders`;
  beforeAll(async () => {
    h = await setupApi({}, true);
    const user = await registerAndLogin(h, 'sales@example.test');
    headers = authHeaders(user.accessToken, 'tenant_a');
    scope = { tenantId: 'tenant_a', companyId, userId: user.userId, locale: 'en', timezone: 'UTC' };
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $addToSet: { permissions: { $each: ['sales.order.read', 'sales.order.write'] } } });
    const { getCompanyModel, getCompanyMembershipModel } = await import('../src/platform/tenancy/company-model.js');
    await getCompanyModel(h.conn).create({ id: companyId, tenantId: 'tenant_a', name: 'Sales company', taxId: 'test', registrationNumber: 'test', defaultCurrency: 'MXN', defaultTimezone: 'UTC', isActive: true });
    await getCompanyMembershipModel(h.conn).create({ tenantId: 'tenant_a', companyId, userId: user.userId, status: 'active' });
    const { CustomerService } = await import('../src/modules/crm/index.js');
    customerId = (await new CustomerService(h.conn).create(scope, { type: 'company', name: 'Buyer' })).customerId;
    const { InventoryService } = await import('../src/modules/inventory/index.js');
    const inventory = new InventoryService(h.conn);
    itemId = (await inventory.createProduct(scope, { name: 'Item', sku: 'SALES-ITEM', unitOfMeasure: 'piece' })).id;
    warehouseId = (await inventory.createWarehouse(scope, { name: 'Main', code: 'SALES-MAIN' })).id;
  }, 120000);
  afterAll(async () => { await h?.stop(); });
  function input() { return { customerId, warehouseId, currency: 'MXN', idempotencyKey: randomUUID(), lines: [{ itemId, quantity: 1.125, unitPrice: 2.50 }] }; }
  async function create(body = input()) {
    const result = await apiRequest(h.baseUrl, path, { method: 'POST', headers, body });
    expect(result.status).toBe(201); return result.body.data;
  }
  it('persists one idempotent draft, computes rounded subtotal, and never reserves stock', async () => {
    const body = input();
    const [first, second] = await Promise.all([create(body), create(body)]);
    expect(first.orderId).toBe(second.orderId);
    expect(first).toMatchObject({ status: 'DRAFT', subtotal: 2.81, total: null, taxAmount: null, pricingStatus: 'tax-policy-required' });
    expect(first.number).toBe(first.orderId);
    const detail = await apiRequest(h.baseUrl, `${path}/${first.orderId}`, { headers });
    expect(detail.body.data.availability[0]).toMatchObject({ itemId, availabilityStatus: 'available', availability: { onHand: 0, reserved: 0, reservationsSupported: false } });
    const { InventoryService } = await import('../src/modules/inventory/index.js');
    expect((await new InventoryService(h.conn).list(scope, 'movement', {})).total).toBe(0);
    expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { ...body, lines: [{ itemId, quantity: 2, unitPrice: 2.5 }] } })).status).toBe(409);
  });
  it('cancels one current draft exactly once with concurrent requests', async () => {
    const order = await create();
    const results = await Promise.all([1, 2].map(() => apiRequest(h.baseUrl, `${path}/${order.orderId}/cancel`, { method: 'POST', headers, body: { expectedVersion: 1 } })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await apiRequest(h.baseUrl, `${path}/${order.orderId}`, { headers })).body.data).toMatchObject({ status: 'CANCELLED', version: 2 });
  });
  it('rounds draft line amounts with currency precision and rejects unsupported fractions', async () => {
    const { currencyScale, lineMinor, minorNumber, parseDraft } = await import('../src/modules/sales/domain/order.js');
    expect(minorNumber(lineMinor(1.5, 3, currencyScale('JPY')), currencyScale('JPY'))).toBe(5);
    expect(minorNumber(lineMinor(1.5, 0.003, currencyScale('KWD')), currencyScale('KWD'))).toBe(0.005);
    expect(() => parseDraft({ ...input(), currency: 'JPY', lines: [{ itemId, quantity: 1, unitPrice: 0.1 }] })).toThrow('precision');
  });
  it('retains historical order detail when catalog references are retired', async () => {
    const { InventoryService } = await import('../src/modules/inventory/index.js');
    const inventory = new InventoryService(h.conn);
    const product = await inventory.createProduct(scope, { name: 'Retired', sku: randomUUID(), unitOfMeasure: 'piece' });
    const order = await create({ ...input(), lines: [{ itemId: product.id, quantity: 1, unitPrice: 1 }] });
    await inventory.patchProduct(scope, product.id, { expectedVersion: 0, isActive: false });
    const response = await apiRequest(h.baseUrl, `${path}/${order.orderId}`, { headers });
    expect(response.status).toBe(200);
    expect(response.body.data.availability).toEqual([{ itemId: product.id, availability: null, availabilityStatus: 'reference-inactive-or-missing' }]);
  });
  it('rejects invalid pricing, unsupported tax input, inactive customer, and foreign references', async () => {
    for (const body of [{ ...input(), currency: 'USD' }, { ...input(), lines: [{ itemId, quantity: 1, unitPrice: 10, taxRate: 0.16 }] }, { ...input(), lines: [{ itemId, quantity: 0.0001, unitPrice: 10 }] }, { ...input(), lines: [{ itemId, quantity: 1, unitPrice: -1 }] }]) expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body })).status).toBe(400);
    expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { ...input(), customerId: randomUUID() } })).status).toBe(404);
    const { CustomerService } = await import('../src/modules/crm/index.js');
    const crm = new CustomerService(h.conn);
    const inactive = await crm.create(scope, { type: 'individual', name: 'Inactive' });
    await crm.update(scope, inactive.customerId, { expectedVersion: 1, status: 'blocked' });
    expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { ...input(), customerId: inactive.customerId } })).status).toBe(409);
    expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { ...input(), lines: [{ itemId: randomUUID(), quantity: 1, unitPrice: 1 }] } })).status).toBe(404);
  });
  it('requires authentication, permissions and company access', async () => {
    expect((await apiRequest(h.baseUrl, path, { headers: { 'x-tenant-id': 'tenant_a' } })).status).toBe(401);
    const order = await create();
    const foreign = await registerAndLogin(h, 'sales-foreign@example.test', 'Passw0rd!123', 'tenant_b');
    expect((await apiRequest(h.baseUrl, `${path}/${order.orderId}`, { headers: authHeaders(foreign.accessToken, 'tenant_b') })).status).toBe(403);
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $pull: { permissions: 'sales.order.write' } });
    try { expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: input() })).status).toBe(403); }
    finally { await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $addToSet: { permissions: 'sales.order.write' } }); }
  });
  it('rolls back order creation on audit failure', async () => {
    const { AuditService } = await import('../src/platform/audit/index.js');
    const { orderModel } = await import('../src/modules/sales/infrastructure/order-repository.js');
    const body = input();
    const spy = vi.spyOn(AuditService.prototype, 'record').mockRejectedValueOnce(new Error('audit failure'));
    try { expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body })).status).toBe(500); }
    finally { spy.mockRestore(); }
    expect(await orderModel(h.conn).countDocuments({ idempotencyKey: body.idempotencyKey })).toBe(0);
  });
});
