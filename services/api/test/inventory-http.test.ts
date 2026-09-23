import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { setupApi, registerAndLogin, authHeaders, apiRequest, type TestHarness } from './helpers.js';

describe('Inventory HTTP permissions and company boundaries', () => {
  let h: TestHarness;
  let headers: Record<string, string>;
  let foreignHeaders: Record<string, string>;
  let userId: string;
  const companyId = randomUUID();
  const otherCompanyId = randomUUID();
  const path = `/api/v1/companies/${companyId}/inventory`;
  beforeAll(async () => {
    h = await setupApi({}, true);
    const user = await registerAndLogin(h, 'inventory-http@example.test');
    userId = user.userId;
    headers = authHeaders(user.accessToken, 'tenant_a');
    const foreign = await registerAndLogin(h, 'inventory-foreign@example.test', 'Passw0rd!123', 'tenant_b');
    foreignHeaders = authHeaders(foreign.accessToken, 'tenant_b');
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    const permissions = ['inventory.product.read', 'inventory.product.write', 'inventory.warehouse.read', 'inventory.warehouse.write', 'inventory.stock.read', 'inventory.stock.write'];
    for (const tenantId of ['tenant_a', 'tenant_b']) {
      await getRoleModel(h.conn).updateOne({ tenantId, name: 'ADMIN' }, { $addToSet: { permissions: { $each: permissions } } });
    }
    const { getCompanyModel, getCompanyMembershipModel } = await import('../src/platform/tenancy/company-model.js');
    for (const id of [companyId, otherCompanyId]) {
      await getCompanyModel(h.conn).create({ id, tenantId: 'tenant_a', name: 'Inventory test', taxId: 'test', registrationNumber: 'test', defaultCurrency: 'MXN', defaultTimezone: 'America/Mexico_City', isActive: true });
    }
    await getCompanyMembershipModel(h.conn).create({ tenantId: 'tenant_a', companyId, userId, status: 'active' });
  }, 120000);
  afterAll(async () => { await h?.stop(); });

  it('persists catalog, stock, ledger and correlated audit through HTTP', async () => {
    const product = await apiRequest(h.baseUrl, `${path}/products`, { method: 'POST', headers, body: { name: 'HTTP product', sku: 'HTTP-SKU', unitOfMeasure: 'piece' } });
    expect(product.status).toBe(200);
    const warehouse = await apiRequest(h.baseUrl, `${path}/warehouses`, { method: 'POST', headers, body: { name: 'HTTP warehouse', code: 'HTTP-WH' } });
    expect(warehouse.status).toBe(200);
    const input = { productId: product.body.data.id, warehouseId: warehouse.body.data.id, type: 'inbound', quantity: 4, reason: 'Initial', idempotencyKey: randomUUID() };
    const movement = await apiRequest(h.baseUrl, `${path}/movements`, { method: 'POST', headers: { ...headers, 'x-correlation-id': 'inventory-http-audit' }, body: input });
    expect(movement.status).toBe(200);
    const stock = await apiRequest(h.baseUrl, `${path}/stock?productId=${input.productId}&warehouseId=${input.warehouseId}`, { headers });
    expect(stock.body.data.items).toHaveLength(1);
    expect(stock.body.data.items[0]).toMatchObject({ onHand: 4, available: 4, reservationsSupported: false });
    const history = await apiRequest(h.baseUrl, `${path}/movements?productId=${input.productId}`, { headers });
    expect(history.body.data.total).toBe(1);
    const rejected = await apiRequest(h.baseUrl, `${path}/movements`, { method: 'POST', headers, body: { ...input, type: 'adjustment', quantity: -5, idempotencyKey: randomUUID() } });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.code).toBe('INVENTORY_INSUFFICIENT_STOCK');
    const { getAuditModel } = await import('../src/platform/audit/index.js');
    expect(await getAuditModel(h.conn).countDocuments({ tenantId: 'tenant_a', companyId, entityId: movement.body.data.id, correlationId: 'inventory-http-audit' })).toBe(1);
  });
  it('enforces permission, company membership, tenant scope and strict input', async () => {
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $pull: { permissions: 'inventory.stock.read' } });
    try { expect((await apiRequest(h.baseUrl, `${path}/stock`, { headers })).status).toBe(403); }
    finally { await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $addToSet: { permissions: 'inventory.stock.read' } }); }
    expect((await apiRequest(h.baseUrl, `/api/v1/companies/${otherCompanyId}/inventory/products`, { headers })).status).toBe(403);
    expect((await apiRequest(h.baseUrl, `${path}/products`, { headers: foreignHeaders })).status).toBe(403);
    expect((await apiRequest(h.baseUrl, `${path}/products/${randomUUID()}`, { headers })).status).toBe(404);
    expect((await apiRequest(h.baseUrl, `${path}/products`, { headers: { 'x-tenant-id': 'tenant_a' } })).status).toBe(401);
    expect((await apiRequest(h.baseUrl, `${path}/products`, { method: 'POST', headers, body: { name: 'Bad', sku: { $ne: null }, unitOfMeasure: 'piece' } })).status).toBe(400);
    expect((await apiRequest(h.baseUrl, `${path}/products?limit=1&limit=2`, { headers })).status).toBe(400);
  });
});
