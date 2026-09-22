import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, apiRequest, authHeaders, type TestHarness } from './helpers.js';
import { AuthDomainService } from '../src/platform/auth/auth-service.js';
import { getUserModel } from '../src/platform/auth/user-model.js';
import { getTenantModel } from '../src/platform/tenancy/tenant-model.js';
import { getMembershipModel } from '../src/platform/iam/membership.js';
import { getRoleModel } from '../src/platform/iam/role-models.js';

describe('Core IAM isolation through HTTP and real MongoDB', () => {
  let h: TestHarness;
  const password = 'Test-only-password!42';
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const login = (email: string, tenantId: string) => apiRequest(h.baseUrl, '/api/v1/auth/login', {
    method: 'POST', headers: { 'x-tenant-id': tenantId }, body: { email, password },
  });
  beforeAll(async () => {
    h = await setupApi({ RATE_LIMIT_MAX: '1000', AUTH_BRUTE_FORCE_MAX: '3' });
    const domain = new AuthDomainService(process.env.JWT_SECRET!);
    const passwordHash = await domain.hashPlainPassword(password);
    for (const tenantId of ['tenant-acme', 'tenant-global']) {
      await getTenantModel(h.conn).create({ tenantId, slug: tenantId, name: tenantId, status: 'active' });
      await getRoleModel(h.conn).create({ tenantId, name: 'ADMIN', permissions: ['audit.read', 'master-data.country.read', 'master-data.country.write'] });
      await getRoleModel(h.conn).create({ tenantId, name: 'SALES', permissions: ['master-data.country.read'] });
    }
    for (const [email, tenantId, role, status] of [
      ['admin@acme.io', 'tenant-acme', 'ADMIN', 'active'],
      ['admin@global.io', 'tenant-global', 'ADMIN', 'active'],
      ['sales@acme.io', 'tenant-acme', 'SALES', 'active'],
      ['disabled@acme.io', 'tenant-acme', 'ADMIN', 'disabled'],
      ['none@acme.io', '', '', 'active'],
    ]) {
      const user = await getUserModel(h.conn).create({ email, passwordHash, firstName: 'Test', lastName: 'User' });
      ids[email] = user._id.toString();
      if (tenantId) await getMembershipModel(h.conn).create({ userId: ids[email], tenantId, roleNames: [role], status });
    }
  });
  afterAll(async () => { await h?.stop(); });

  it.each([['admin@acme.io', 'tenant-acme'], ['admin@global.io', 'tenant-global'], ['sales@acme.io', 'tenant-acme']])('logs in %s only into requested %s', async (email, tenant) => {
    const res = await login(email, tenant);
    expect(res.status).toBe(200);
    tokens[email] = res.body.data.accessToken;
    const claims = await new AuthDomainService(process.env.JWT_SECRET!).verify(tokens[email]);
    expect(claims?.tenantId).toBe(tenant);
    expect(claims?.roles).toEqual([email.startsWith('sales') ? 'SALES' : 'ADMIN']);
  });
  it.each(['admin@global.io', 'none@acme.io', 'disabled@acme.io'])('rejects absent/disabled membership for %s', async (email) => {
    expect((await login(email, 'tenant-acme')).status).toBe(403);
  });
  it.each([['admin@acme.io', 'tenant-global'], ['admin@global.io', 'tenant-acme']])('rejects token/header mismatch %s -> %s', async (email, tenant) => {
    for (const path of ['/auth/me', '/tenants/context', '/master-data/countries']) {
      expect((await apiRequest(h.baseUrl, `/api/v1${path}`, { headers: authHeaders(tokens[email], tenant) })).status).toBe(403);
    }
  });
  it('hydrates actual roles, email and permissions at /me', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/me', { headers: authHeaders(tokens['sales@acme.io'], 'tenant-acme') });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ requesterId: ids['sales@acme.io'], email: 'sales@acme.io', roles: ['SALES'], permissions: ['master-data.country.read'] });
  });
  it('denies insufficient permissions and allows actual grants', async () => {
    expect((await apiRequest(h.baseUrl, '/api/v1/audit', { headers: authHeaders(tokens['sales@acme.io'], 'tenant-acme') })).status).toBe(403);
    expect((await apiRequest(h.baseUrl, '/api/v1/audit', { headers: authHeaders(tokens['admin@acme.io'], 'tenant-acme') })).status).toBe(200);
    expect((await apiRequest(h.baseUrl, '/api/v1/master-data/countries', { headers: authHeaders(tokens['sales@acme.io'], 'tenant-acme') })).status).toBe(200);
    expect((await apiRequest(h.baseUrl, '/api/v1/master-data/countries', { method: 'POST', headers: authHeaders(tokens['sales@acme.io'], 'tenant-acme'), body: { code: 'MX', name: 'Mexico' } })).status).toBe(403);
  });
  it('does not expose another tenant through the route parameter', async () => {
    expect((await apiRequest(h.baseUrl, '/api/v1/tenants/tenant-global', { headers: authHeaders(tokens['admin@acme.io'], 'tenant-acme') })).status).toBe(403);
  });
  it('rejects missing, invalid and expired tokens and missing tenant context', async () => {
    const expired = await new AuthDomainService(process.env.JWT_SECRET!).issueAccessToken({ userId: ids['admin@acme.io'], email: '', tenantId: 'tenant-acme', roles: ['ADMIN'] }, -1);
    for (const token of ['', 'invalid', expired]) {
      expect((await apiRequest(h.baseUrl, '/api/v1/tenants/context', { headers: authHeaders(token, 'tenant-acme') })).status).toBe(401);
    }
    const res = await apiRequest(h.baseUrl, '/api/v1/tenants/context', { headers: { authorization: `Bearer ${tokens['admin@acme.io']}` } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TENANT_CONTEXT_MISSING');
  });
  it('rejects revoked membership immediately even with an unexpired token', async () => {
    await getMembershipModel(h.conn).updateOne({ userId: ids['sales@acme.io'] }, { $set: { status: 'disabled' } });
    expect((await apiRequest(h.baseUrl, '/api/v1/auth/me', { headers: authHeaders(tokens['sales@acme.io'], 'tenant-acme') })).status).toBe(403);
  });
  it('registration grants no membership and input objects are rejected', async () => {
    const registered = await apiRequest(h.baseUrl, '/api/v1/auth/register', { method: 'POST', body: { email: 'fresh@example.com', password, firstName: 'Fresh', lastName: 'User', tenantId: 'tenant-acme', roleIds: ['ADMIN'] } });
    expect(registered.status).toBe(200);
    expect((await login('fresh@example.com', 'tenant-acme')).status).toBe(403);
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/login', { method: 'POST', headers: { 'x-tenant-id': 'tenant-acme' }, body: { email: { $ne: null }, password } });
    expect(res.status).toBe(400);
  });
  it('applies the existing registration validation policy', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/register', { method: 'POST', body: { email: 'invalid-email', password: 'x', firstName: 'Test', lastName: 'User' } });
    expect(res.status).toBe(400);
  });
  it('rejects invalid audit pagination instead of allowing unlimited queries', async () => {
    for (const query of ['limit=0', 'limit=-1', 'limit=101', 'limit=NaN', 'offset=-1', 'offset=0.5']) {
      expect((await apiRequest(h.baseUrl, `/api/v1/audit?${query}`, { headers: authHeaders(tokens['admin@acme.io'], 'tenant-acme') })).status).toBe(400);
    }
  });
  it('ignores foreign tenant roles marked system and reflects permission changes immediately', async () => {
    const Role = getRoleModel(h.conn);
    await Role.create({ tenantId: 'tenant-global', name: 'FOREIGN', isSystem: true, permissions: ['audit.read'] });
    const Membership = getMembershipModel(h.conn);
    await Membership.updateOne({ userId: ids['sales@acme.io'] }, { $set: { status: 'active', roleNames: ['SALES', 'FOREIGN'] } });
    expect((await apiRequest(h.baseUrl, '/api/v1/audit', { headers: authHeaders(tokens['sales@acme.io'], 'tenant-acme') })).status).toBe(403);
    await Role.updateOne({ tenantId: 'tenant-acme', name: 'SALES' }, { $set: { permissions: ['audit.read'] } });
    expect((await apiRequest(h.baseUrl, '/api/v1/audit', { headers: authHeaders(tokens['sales@acme.io'], 'tenant-acme') })).status).toBe(200);
  });
  it('rejects suspended users and tenants; resolves a second explicit membership', async () => {
    const User = getUserModel(h.conn);
    await User.updateOne({ email: 'admin@global.io' }, { $set: { status: 'suspended' } });
    expect((await login('admin@global.io', 'tenant-global')).status).toBe(401);
    await User.updateOne({ email: 'admin@global.io' }, { $set: { status: 'active' } });
    await getTenantModel(h.conn).updateOne({ tenantId: 'tenant-global' }, { $set: { status: 'suspended' } });
    expect((await login('admin@global.io', 'tenant-global')).status).toBe(403);
    await getTenantModel(h.conn).updateOne({ tenantId: 'tenant-global' }, { $set: { status: 'active' } });
    await getMembershipModel(h.conn).create({ userId: ids['admin@global.io'], tenantId: 'tenant-acme', roleNames: ['SALES'] });
    const res = await login('admin@global.io', 'tenant-acme');
    expect(res.status).toBe(200);
    expect((await new AuthDomainService(process.env.JWT_SECRET!).verify(res.body.data.accessToken))?.roles).toEqual(['SALES']);
  });
  it('counts concurrent failures atomically, locks at configured max and recovers after 15 minutes', async () => {
    const email = 'admin@acme.io';
    const failures = await Promise.all(Array.from({ length: 3 }, () => apiRequest(h.baseUrl, '/api/v1/auth/login', { method: 'POST', headers: { 'x-tenant-id': 'tenant-acme' }, body: { email, password: 'incorrect' } })));
    expect(failures.map(r => r.status)).toEqual([401, 401, 401]);
    const User = getUserModel(h.conn);
    const user = await User.findOne({ email }).exec();
    expect(user?.failedLoginAttempts).toBe(3);
    expect(user?.status).toBe('locked');
    expect(user!.lockedUntil!.getTime() - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    expect((await login(email, 'tenant-acme')).status).toBe(401);
    await User.updateOne({ email }, { $set: { lockedUntil: new Date(Date.now() - 1) } });
    expect((await login(email, 'tenant-acme')).status).toBe(200);
    expect((await User.findOne({ email }).exec())?.status).toBe('active');
  });
});
