import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiRequest, authHeaders, registerAndLogin, setupApi, type TestHarness, type RegisteredUser } from './helpers.js';
import { getRoleModel } from '../src/platform/iam/role-models.js';
import { requireCompanyAccess } from '../src/platform/tenancy/company-access.js';
import { getCompanyModel, getCompanyMembershipModel } from '../src/platform/tenancy/company-model.js';
import { AuditService } from '../src/platform/audit/audit-service.js';
import { CompanyService } from '../src/platform/tenancy/company-service.js';

describe('explicit company access and atomic onboarding', () => {
  let h: TestHarness;
  let manager: RegisteredUser;
  let colleague: RegisteredUser;
  let foreign: RegisteredUser;
  let companyId: string;
  const input = { name: 'Company A', taxId: 'NON-FISCAL-TEST', registrationNumber: 'TEST', defaultCurrency: 'MXN', defaultTimezone: 'America/Mexico_City' };
  beforeAll(async () => {
    h = await setupApi({ RATE_LIMIT_MAX: '1000' }, true);
    manager = await registerAndLogin(h, 'company-manager@test.invalid');
    colleague = await registerAndLogin(h, 'company-colleague@test.invalid');
    foreign = await registerAndLogin(h, 'company-foreign@test.invalid', undefined, 'tenant_b');
    await getRoleModel(h.conn).updateOne({ tenantId: 'tenant_a', name: 'ADMIN' }, { $set: { permissions: ['tenancy.company.write', 'tenancy.company.membership.write'] } });
  });
  afterAll(async () => { await h.stop(); });

  it('creates authoritative company and only grants creator access', async () => {
    const response = await apiRequest(h.baseUrl, '/api/v1/companies', { method: 'POST', headers: authHeaders(manager.accessToken, 'tenant_a'), body: input });
    expect(response.status).toBe(200);
    companyId = response.body.data.id;
    expect(await getCompanyModel(h.conn).countDocuments({ id: companyId, tenantId: 'tenant_a' })).toBe(1);
    expect(await getCompanyMembershipModel(h.conn).countDocuments({ companyId, status: 'active' })).toBe(1);
    const rows = await apiRequest(h.baseUrl, '/api/v1/companies', { headers: authHeaders(colleague.accessToken, 'tenant_a') });
    expect(rows.body.data).toEqual([]);
    await expect(requireCompanyAccess(h.conn, { tenantId: 'tenant_a', locale: 'en', timezone: 'UTC' }, colleague.userId, companyId)).rejects.toMatchObject({ statusCode: 403 });
  });
  it('grants/revokes existing same-tenant users only through a permissioned manager', async () => {
    const path = `/api/v1/companies/${companyId}/memberships/${colleague.userId}`;
    const headers = authHeaders(manager.accessToken, 'tenant_a');
    expect((await apiRequest(h.baseUrl, path, { method: 'PUT', headers, body: { status: 'active' } })).status).toBe(200);
    expect((await apiRequest(h.baseUrl, '/api/v1/companies', { headers: authHeaders(colleague.accessToken, 'tenant_a') })).body.data).toHaveLength(1);
    expect((await apiRequest(h.baseUrl, path, { method: 'PUT', headers, body: { status: 'disabled' } })).status).toBe(200);
    await expect(requireCompanyAccess(h.conn, { tenantId: 'tenant_a', locale: 'en', timezone: 'UTC' }, colleague.userId, companyId)).rejects.toMatchObject({ statusCode: 403 });
    expect((await apiRequest(h.baseUrl, `/api/v1/companies/${companyId}/memberships/${foreign.userId}`, { method: 'PUT', headers, body: { status: 'active' } })).status).toBe(404);
  });
  it('rejects foreign tenant, company spoofing and unsupported branch scope', async () => {
    const context = { tenantId: 'tenant_a', locale: 'en', timezone: 'UTC' };
    await expect(requireCompanyAccess(h.conn, { ...context, tenantId: 'tenant_b' }, foreign.userId, companyId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(requireCompanyAccess(h.conn, { ...context, companyId: crypto.randomUUID() }, manager.userId, companyId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(requireCompanyAccess(h.conn, { ...context, branchId: 'unverified' }, manager.userId, companyId)).rejects.toMatchObject({ statusCode: 400 });
  });
  it('rejects protected fields and insufficient IAM permissions', async () => {
    expect((await apiRequest(h.baseUrl, '/api/v1/companies', { method: 'POST', headers: authHeaders(manager.accessToken, 'tenant_a'), body: { ...input, tenantId: 'tenant_b' } })).status).toBe(400);
    expect((await apiRequest(h.baseUrl, '/api/v1/companies', { method: 'POST', headers: authHeaders(foreign.accessToken, 'tenant_b'), body: input })).status).toBe(403);
  });
  it('rolls back company and membership if audit persistence fails', async () => {
    const before = await getCompanyModel(h.conn).countDocuments();
    const audit = vi.spyOn(AuditService.prototype, 'record').mockRejectedValueOnce(new Error('audit unavailable'));
    try {
      await expect(new CompanyService(h.conn).create({ tenantId: 'tenant_a', locale: 'en', timezone: 'UTC' }, manager.userId, input)).rejects.toThrow();
      expect(await getCompanyModel(h.conn).countDocuments()).toBe(before);
      expect(await getCompanyMembershipModel(h.conn).countDocuments({ userId: manager.userId })).toBe(1);
    } finally { audit.mockRestore(); }
  });
});
