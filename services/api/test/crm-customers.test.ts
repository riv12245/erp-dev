import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { setupApi, registerAndLogin, authHeaders, apiRequest, type TestHarness } from './helpers.js';

describe('CRM customers: real replica-set persistence', () => {
  let h: TestHarness;
  let headers: Record<string, string>;
  let foreignHeaders: Record<string, string>;
  let userId: string;
  const companyId = randomUUID();
  const otherCompanyId = randomUUID();
  const path = `/api/v1/companies/${companyId}/crm/customers`;
  beforeAll(async () => {
    h = await setupApi({}, true);
    const user = await registerAndLogin(h, 'crm@example.test');
    userId = user.userId;
    headers = authHeaders(user.accessToken, 'tenant_a');
    const foreign = await registerAndLogin(h, 'crm-foreign@example.test', 'Passw0rd!123', 'tenant_b');
    foreignHeaders = authHeaders(foreign.accessToken, 'tenant_b');
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    for (const tenantId of ['tenant_a', 'tenant_b']) await getRoleModel(h.conn).updateOne({ tenantId, name: 'ADMIN' }, { $addToSet: { permissions: { $each: ['crm.customer.read', 'crm.customer.write'] } } });
    const { getCompanyModel, getCompanyMembershipModel } = await import('../src/platform/tenancy/company-model.js');
    for (const id of [companyId, otherCompanyId]) {
      await getCompanyModel(h.conn).create({ id, tenantId: 'tenant_a', name: 'CRM test', taxId: 'test', registrationNumber: 'test', defaultCurrency: 'MXN', defaultTimezone: 'America/Mexico_City', isActive: true });
      await getCompanyMembershipModel(h.conn).create({ tenantId: 'tenant_a', companyId: id, userId, status: 'active' });
    }
  }, 120000);
  afterAll(async () => { await h?.stop(); });

  async function create(name = 'Acme Customer') {
    const response = await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { type: 'company', name, email: 'buyer@example.test' } });
    expect(response.status).toBe(201);
    return response.body.data;
  }
  it('creates, searches literal name/email, paginates and preserves protected metadata', async () => {
    const customer = await create('Search [literal]');
    expect(customer).toMatchObject({ tenantId: 'tenant_a', companyId, version: 1, status: 'active', createdBy: userId });
    const read = await apiRequest(h.baseUrl, `${path}/${customer.customerId}`, { headers });
    expect(read.body.data).toEqual(customer);
    const list = await apiRequest(h.baseUrl, `${path}?search=%5Bliteral%5D&page=1&limit=1`, { headers });
    expect(list.body.data).toMatchObject({ total: 1, page: 1, limit: 1, totalPages: 1 });
    expect(list.body.data.items[0].customerId).toBe(customer.customerId);
    const updated = await apiRequest(h.baseUrl, `${path}/${customer.customerId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, status: 'inactive' } });
    expect(updated.body.data).toMatchObject({ version: 2, status: 'inactive', createdBy: userId });
    expect((await apiRequest(h.baseUrl, `${path}/${customer.customerId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, name: 'Stale' } })).status).toBe(409);
  });
  it('does not impose an invented email or name uniqueness rule', async () => {
    const first = await create('Repeated');
    const second = await create('Repeated');
    expect(second.customerId).not.toBe(first.customerId);
  });
  it('allows only one concurrent update at the same version', async () => {
    const customer = await create('Concurrent');
    const results = await Promise.all(['First', 'Second'].map(name => apiRequest(h.baseUrl, `${path}/${customer.customerId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, name } })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect((await apiRequest(h.baseUrl, `${path}/${customer.customerId}`, { headers })).body.data.version).toBe(2);
  });
  it('requires effective permission and active company membership', async () => {
    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    const { getCompanyMembershipModel, getCompanyModel } = await import('../src/platform/tenancy/company-model.js');
    await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $pull: { permissions: 'crm.customer.read' } });
    try { expect((await apiRequest(h.baseUrl, path, { headers })).status).toBe(403); }
    finally { await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $addToSet: { permissions: 'crm.customer.read' } }); }
    await getCompanyMembershipModel(h.conn).updateOne({ tenantId: 'tenant_a', companyId, userId }, { status: 'disabled' });
    try { expect((await apiRequest(h.baseUrl, path, { headers })).status).toBe(403); }
    finally { await getCompanyMembershipModel(h.conn).updateOne({ tenantId: 'tenant_a', companyId, userId }, { status: 'active' }); }
    await getCompanyModel(h.conn).updateOne({ tenantId: 'tenant_a', id: companyId }, { isActive: false });
    try { expect((await apiRequest(h.baseUrl, path, { headers })).status).toBe(403); }
    finally { await getCompanyModel(h.conn).updateOne({ tenantId: 'tenant_a', id: companyId }, { isActive: true }); }
    expect((await apiRequest(h.baseUrl, `${path}/${randomUUID()}`, { headers })).status).toBe(404);
  });
  it('blocks foreign tenants and scopes known identifiers to the authorized company', async () => {
    const customer = await create();
    for (const suffix of ['', `/${customer.customerId}`]) expect((await apiRequest(h.baseUrl, path + suffix, { headers: foreignHeaders })).status).toBe(403);
    expect((await apiRequest(h.baseUrl, `${path}/${customer.customerId}`, { method: 'PATCH', headers: foreignHeaders, body: { expectedVersion: 1, name: 'Foreign' } })).status).toBe(403);
    const other = `/api/v1/companies/${otherCompanyId}/crm/customers/${customer.customerId}`;
    expect((await apiRequest(h.baseUrl, other, { headers })).status).toBe(404);
    expect((await apiRequest(h.baseUrl, other, { method: 'PATCH', headers, body: { expectedVersion: 1, name: 'Other' } })).status).toBe(404);
    expect((await apiRequest(h.baseUrl, path, { headers: { ...headers, 'x-tenant-id': 'tenant_b' } })).status).toBe(403);
  });
  it('rejects unauthenticated, malformed and mass-assignment requests', async () => {
    expect((await apiRequest(h.baseUrl, path, { headers: { 'x-tenant-id': 'tenant_a' } })).status).toBe(401);
    for (const body of [{ type: 'company', name: '' }, { type: 'company', name: 'x'.repeat(201) }, { type: 'company', name: 'Bad', email: 'bad' }, { type: 'company', name: 'Bad', tenantId: 'tenant_b' }]) {
      expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body })).status).toBe(400);
    }
    expect((await apiRequest(h.baseUrl, `${path}?limit=101`, { headers })).status).toBe(400);
    expect((await apiRequest(h.baseUrl, `${path}/invalid`, { headers })).status).toBe(400);
    const customer = await create();
    expect((await apiRequest(h.baseUrl, `${path}/${customer.customerId}`, { method: 'PATCH', headers, body: { expectedVersion: 1, $set: { name: 'Bad' } } })).status).toBe(400);
  });
  it('rolls back business writes when audit fails and records successful mutations', async () => {
    const { AuditService, getAuditModel } = await import('../src/platform/audit/index.js');
    const { getCustomerModel } = await import('../src/modules/crm/infrastructure/customer-model.js');
    const spy = vi.spyOn(AuditService.prototype, 'record').mockRejectedValueOnce(new Error('audit failure'));
    try {
      expect((await apiRequest(h.baseUrl, path, { method: 'POST', headers, body: { type: 'company', name: 'Must rollback' } })).status).toBe(500);
    } finally { spy.mockRestore(); }
    expect(await getCustomerModel(h.conn).countDocuments({ name: 'Must rollback' })).toBe(0);
    const customer = await create('Audited');
    expect(await getAuditModel(h.conn).countDocuments({ tenantId: 'tenant_a', companyId, entityId: customer.customerId, action: 'crm.customer.created' })).toBe(1);
  });
});
