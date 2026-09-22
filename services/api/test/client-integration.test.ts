import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiClient } from '@erp/api-client';
import { setupApi, registerAndLogin, type TestHarness } from './helpers.js';

describe('shared client against the HTTP API and MongoDB', () => {
  let h: TestHarness;
  beforeAll(async () => { h = await setupApi(); });
  afterAll(async () => { await h?.stop(); });

  it('logs in, reads identity, rejects a mismatched tenant and rejects a removed token', async () => {
    const user = await registerAndLogin(h, 'client@example.com');
    let token: string | null = null;
    let tenant = 'tenant_a';
    const client = createApiClient({ baseUrl: h.baseUrl, getAccessToken: () => token, getTenantId: () => tenant });
    const result = await client.post<{ accessToken: string }>('/api/v1/auth/login', { email: user.email, password: 'Passw0rd!123' });
    token = result.accessToken;
    expect(await client.get('/api/v1/auth/me')).toMatchObject({ requesterId: user.userId, tenantId: 'tenant_a' });
    tenant = 'tenant_b';
    await expect(client.get('/api/v1/auth/me')).rejects.toMatchObject({ status: 403 });
    tenant = 'tenant_a';
    token = null;
    await expect(client.get('/api/v1/auth/me')).rejects.toMatchObject({ status: 401 });
  });
});
