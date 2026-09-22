import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness, apiRequest, registerAndLogin, authHeaders } from './helpers.js';

describe('master-data countries module', () => {
  let h: TestHarness;
  let token: string;
  const tenantId = 'tenant_md';

  beforeAll(async () => {
    h = await setupApi();
    const user = await registerAndLogin(h, 'md-admin@example.com', undefined, tenantId);
    token = user.accessToken;
  });

  afterAll(async () => {
    await h.stop();
  });

  it('rejects without auth (401)', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      headers: { 'x-tenant-id': tenantId },
    });
    expect(res.status).toBe(401);
  });

  it('rejects without a tenant header (401)', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('upserts a country and lists it', async () => {
    const create = await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      method: 'POST',
      headers: authHeaders(token, tenantId),
      body: { code: 'MX', name: 'Mexico' },
    });
    expect(create.status).toBe(200);
    expect(create.body.data.code).toBe('MX');
    expect(create.body.data.isActive).toBe(true);

    const list = await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      headers: authHeaders(token, tenantId),
    });
    expect(list.status).toBe(200);
    expect(list.body.data.some((c: { code: string }) => c.code === 'MX')).toBe(true);
  });

  it('rejects country payloads without code/name', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      method: 'POST',
      headers: authHeaders(token, tenantId),
      body: { code: 'AR' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('upserting the same code is idempotent (single row)', async () => {
    await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      method: 'POST',
      headers: authHeaders(token, tenantId),
      body: { code: 'CO', name: 'Colombia' },
    });
    await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      method: 'POST',
      headers: authHeaders(token, tenantId),
      body: { code: 'CO', name: 'Colombia updated' },
    });
    const list = await apiRequest(h.baseUrl, '/api/v1/master-data/countries', {
      headers: authHeaders(token, tenantId),
    });
    const rows = list.body.data.filter((c: { code: string }) => c.code === 'CO');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Colombia updated');
  });
});