import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { setupApi, registerAndLogin, authHeaders, apiRequest, type TestHarness } from './helpers.js';

describe('Purchasing suppliers: real replica-set persistence', () => {
  let h: TestHarness;
  let headers: Record<string, string>;
  let foreignHeaders: Record<string, string>;
  let userId: string;
  const companyId = randomUUID();
  const otherCompanyId = randomUUID();
  const path = `/api/v1/companies/${companyId}/purchasing/suppliers`;
  beforeAll(async () => {
    h = await setupApi({}, true);
    const user = await registerAndLogin(h, 'purchasing@example.test');
    userId = user.userId;
    headers = authHeaders(user.accessToken, 'tenant_a');
    const foreign = await registerAndLogin(h, 'purchasing-foreign@example.test', 'Passw0rd!123', 'tenant_b');
    foreignHeaders = authHeaders(foreign.accessToken, 'tenant_b');
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    for (const tenantId of ['tenant_a', 'tenant_b']) await getRoleModel(h.conn).updateOne({ tenantId, name: 'ADMIN' }, { $addToSet: { permissions: { $each: ['purchasing.supplier.read', 'purchasing.supplier.write'] } } });
    const { getCompanyModel, getCompanyMembershipModel } = await import('../src/platform/tenancy/company-model.js');
    for (const id of [companyId, otherCompanyId]) {
      await getCompanyModel(h.conn).create({ id, tenantId: 'tenant_a', name: 'Purchasing test', taxId: 'test', registrationNumber: 'test', defaultCurrency: 'MXN', defaultTimezone: 'America/Mexico_City', isActive: true });
      await getCompanyMembershipModel(h.conn).create({ tenantId: 'tenant_a', companyId: id, userId, status: 'active' });
    }
  }, 120000);
  afterAll(async () => { await h?.stop(); });

  async function create(name = 'Acme Supplier') {
    const response = await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { name, email: 'buyer@example.test' } });
    expect(response.status).toBe(201);
    return response.body.data;
  }
  it('creates, searches literal name/email, paginates and preserves protected metadata', async () => {
    const supplier = await create('Search [literal]');
    expect(supplier).toMatchObject({ tenantId: 'tenant_a', companyId, version: 1, status: 'active', createdBy: userId });
    const read = await apiRequest(h.baseUrl, `${path}/${supplier.supplierId}`, { headers });
    expect(read.body.data).toEqual(supplier);
    const list = await apiRequest(h.baseUrl, `${path}?search=%5Bliteral%5D&page=1&limit=1`, { headers });
    expect(list.body.data).toMatchObject({ total: 1, page: 1, limit: 1, totalPages: 1 });
    expect(list.body.data.items[0].supplierId).toBe(supplier.supplierId);
    const updated = await apiRequest(h.baseUrl, `${path}/${supplier.supplierId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, status: 'inactive' } });
    expect(updated.body.data).toMatchObject({ version: 2, status: 'inactive', createdBy: userId });
    expect((await apiRequest(h.baseUrl, `${path}/${supplier.supplierId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, name: 'Stale' } })).status).toBe(409);
  });
  it('does not impose an invented email or name uniqueness rule', async () => {
    const first = await create('Repeated');
    const second = await create('Repeated');
    expect(second.supplierId).not.toBe(first.supplierId);
  });
  it('allows only one concurrent update at the same version', async () => {
    const supplier = await create('Concurrent');
    const results = await Promise.all(['First', 'Second'].map(name => apiRequest(h.baseUrl, `${path}/${supplier.supplierId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, name } })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await apiRequest(h.baseUrl, `${path}/${supplier.supplierId}`, { headers })).body.data.version).toBe(2);
  });
  it('requires effective permission and active company membership', async () => {
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    const { getCompanyMembershipModel, getCompanyModel } = await import('../src/platform/tenancy/company-model.js');
    await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $pull: { permissions: 'purchasing.supplier.read' } });
    try { expect((await apiRequest(h.baseUrl, path, { headers })).status).toBe(403); }
    finally { await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $addToSet: { permissions: 'purchasing.supplier.read' } }); }
    await getCompanyMembershipModel(h.conn).updateOne({ tenantId: 'tenant_a', companyId, userId }, { status: 'disabled' });
    try { expect((await apiRequest(h.baseUrl, path, { headers })).status).toBe(403); }
    finally { await getCompanyMembershipModel(h.conn).updateOne({ tenantId: 'tenant_a', companyId, userId }, { status: 'active' }); }
    await getCompanyModel(h.conn).updateOne({ tenantId: 'tenant_a', id: companyId }, { isActive: false });
    try { expect((await apiRequest(h.baseUrl, path, { headers })).status).toBe(403); }
    finally { await getCompanyModel(h.conn).updateOne({ tenantId: 'tenant_a', id: companyId }, { isActive: true }); }
    expect((await apiRequest(h.baseUrl, `${path}/${randomUUID()}`, { headers })).status).toBe(404);
  });
  it('blocks foreign tenants and scopes known identifiers to the authorized company', async () => {
    const supplier = await create();
    for (const suffix of ['', `/${supplier.supplierId}`]) expect((await apiRequest(h.baseUrl, path + suffix, { headers: foreignHeaders })).status).toBe(403);
    expect((await apiRequest(h.baseUrl, `${path}/${supplier.supplierId}`, { method: 'PATCH', headers: foreignHeaders, body: { expectedVersion: 1, name: 'Foreign' } })).status).toBe(403);
    const other = `/api/v1/companies/${otherCompanyId}/purchasing/suppliers/${supplier.supplierId}`;
    expect((await apiRequest(h.baseUrl, other, { headers })).status).toBe(404);
    expect((await apiRequest(h.baseUrl, other, { method: 'PATCH', headers, body: { expectedVersion: 1, name: 'Other' } })).status).toBe(404);
    expect((await apiRequest(h.baseUrl, path, { headers: { ...headers, 'x-tenant-id': 'tenant_b' } })).status).toBe(403);
  });
  it('rejects unauthenticated, malformed and mass-assignment requests', async () => {
    expect((await apiRequest(h.baseUrl, path, { headers: { 'x-tenant-id': 'tenant_a' } })).status).toBe(401);
    for (const body of [{ name: '' }, { name: 'x'.repeat(201) }, { name: 'Bad', email: 'bad' }, { name: 'Bad', tenantId: 'tenant_b' }]) {
      expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body })).status).toBe(400);
    }
    expect((await apiRequest(h.baseUrl, `${path}?limit=101`, { headers })).status).toBe(400);
    expect((await apiRequest(h.baseUrl, `${path}/invalid`, { headers })).status).toBe(400);
    const supplier = await create();
    expect((await apiRequest(h.baseUrl, `${path}/${supplier.supplierId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, $set: { name: 'Bad' } } })).status).toBe(400);
  });
  it('rolls back business writes when audit fails and records successful mutations', async () => {
    const { AuditService, getAuditModel } = await import('../src/platform/audit/index.js');
    const { getSupplierModel } = await import('../src/modules/purchasing/infrastructure/supplier-model.js');
    const spy = vi.spyOn(AuditService.prototype, 'record').mockRejectedValueOnce(new Error('audit failure'));
    try {
      expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { name: 'Must rollback' } })).status).toBe(500);
    } finally { spy.mockRestore(); }
    expect(await getSupplierModel(h.conn).countDocuments({ name: 'Must rollback' })).toBe(0);
    const supplier = await create('Audited');
    expect(await getAuditModel(h.conn).countDocuments({ tenantId: 'tenant_a', companyId, entityId: supplier.supplierId, action: 'purchasing.supplier.created' })).toBe(1);
  });
});
