import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../../packages/api-client/src/client';
import { createSessionController, type Session, type SessionStorage } from '../../../packages/api-client/src/session';
import { setupApi, registerAndLogin, type TestHarness } from '../../../services/api/test/helpers';

/** Real Express + disposable Mongo + loopback HTTP. The token store is an in-memory test adapter, not Keystore evidence. */
describe('shared client against real session HTTP endpoints', () => {
  let harness: TestHarness;
  beforeAll(async () => { harness = await setupApi({ RATE_LIMIT_MAX: '1000', CORS_ORIGIN: 'http://localhost:5173' }); }, 60_000);
  afterAll(async () => { await harness?.stop(); }, 60_000);
  afterEach(() => vi.unstubAllGlobals());
  const storage = (): SessionStorage => {
    let token: string | null = null; let blocked = false;
    return { read: async () => token, write: async (value) => { token = value; },
      blocked: async () => blocked, block: async (value) => { blocked = value; } };
  };

  it('native login, concurrent expired-access reads, restart restore and logout use real HTTP', async () => {
    const user = await registerAndLogin(harness, 'client-native@example.test');
    const vault = storage();
    let current: Session | null = null;
    let access: string | null = null;
    const auth = createApiClient({ baseUrl: harness.baseUrl, headers: { 'x-session-client': 'native' } });
    const changed = (value: Session | null) => { current = value; access = value?.accessToken ?? null; };
    const controller = createSessionController({ client: auth, native: true, storage: vault, changed });
    expect(await controller.login(user.email, 'Passw0rd!123', 'tenant_a')).toBe(true);
    const first = await vault.read(); expect(first).toBeTruthy();
    const client = createApiClient({ baseUrl: harness.baseUrl, getTenantId: () => current?.tenantId,
      getAccessToken: () => access, getSessionEpoch: controller.epoch, onRefresh: controller.refresh });
    access = 'expired-for-test';
    const results = await Promise.all([client.get('/api/v1/auth/me'), client.get('/api/v1/auth/me')]);
    expect(results).toHaveLength(2); expect(await vault.read()).not.toBe(first);
    const restarted = createSessionController({ client: auth, native: true, storage: vault, changed });
    expect(await restarted.restore()).toBeTruthy();
    const beforeLogout = access;
    await restarted.logout(); expect(await vault.read()).toBeNull(); expect(access).toBeNull();
    await expect(auth.get('/api/v1/auth/me', { headers: { authorization: `Bearer ${beforeLogout}`, 'x-tenant-id': 'tenant_a' } })).rejects.toMatchObject({ status: 401 });
    expect(await restarted.restore()).toBeNull();
  }, 60_000);

  it('web client transports the HttpOnly cookie, restores and revokes without a JSON refresh token', async () => {
    const user = await registerAndLogin(harness, 'client-web@example.test');
    const realFetch = globalThis.fetch;
    let cookie = ''; let latestSetCookie = '';
    // Node does not maintain a browser cookie jar: forward the server cookie over real HTTP.
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (init?.credentials === 'include') {
        headers.set('origin', 'http://localhost:5173');
        if (cookie) headers.set('cookie', cookie);
      }
      const response = await realFetch(input, { ...init, headers });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) { latestSetCookie = setCookie; cookie = setCookie.split(';')[0]!; }
      return response;
    });
    const auth = createApiClient({ baseUrl: harness.baseUrl, credentials: 'include', headers: { 'x-session-client': 'web' } });
    const vault = storage(); let latest: Session | null = null;
    const changed = (session: Session | null) => { latest = session; };
    const controller = createSessionController({ client: auth, native: false, storage: vault, changed });
    expect(await controller.login(user.email, 'Passw0rd!123', 'tenant_a')).toBe(true);
    expect(latest).not.toHaveProperty('refreshToken'); expect(await vault.read()).toBeNull();
    expect(latestSetCookie).toContain('HttpOnly'); expect(latestSetCookie).toContain('SameSite=Strict');
    const previousCookie = cookie;
    const restarted = createSessionController({ client: auth, native: false, storage: vault, changed });
    expect(await restarted.restore()).toBeTruthy(); expect(cookie).not.toBe(previousCookie);
    await restarted.logout(); expect(cookie).toBe('erp_refresh=');
    expect(latestSetCookie).toContain('Expires=Thu, 01 Jan 1970');
    expect(latest).toBeNull(); expect(await restarted.restore()).toBeNull();
  }, 60_000);

  it('logout-all from the controller revokes other real client sessions', async () => {
    const user = await registerAndLogin(harness, 'client-all@example.test');
    const auth = createApiClient({ baseUrl: harness.baseUrl, headers: { 'x-session-client': 'native' } });
    const first = createSessionController({ client: auth, native: true, storage: storage(), changed: () => undefined });
    const second = createSessionController({ client: auth, native: true, storage: storage(), changed: () => undefined });
    expect(await first.login(user.email, 'Passw0rd!123', 'tenant_a')).toBe(true);
    expect(await second.login(user.email, 'Passw0rd!123', 'tenant_a')).toBe(true);
    await first.logout(true);
    expect(await second.refresh()).toBeNull();
  }, 60_000);
});
