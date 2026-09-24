import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore as web } from '../src/store/auth-store';
import { apiClient } from '../src/services/api-client';
import { useTenantStore } from '../src/store/tenant-store';
import { useAuthStore as mobile } from '../../mobile/src/store/auth-store';
vi.mock('../../mobile/src/services/session-storage', () => {
  let token: string | null = null;
  let blocked = false;
  return { sessionStorage: { read: async () => token, write: async (value: string | null) => { token = value; },
    blocked: async () => blocked, block: async (value: boolean) => { blocked = value; } } };
});

afterEach(async () => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ data: { revoked: true } })));
  await web.getState().logout(); await mobile.getState().logout(); vi.unstubAllGlobals();
});
describe.each([['web', web], ['mobile', mobile]] as const)('%s login contract', (_name, store) => {
  it('sends explicit tenant and consumes the actual user identity', async () => {
    let requestHeaders: HeadersInit | undefined;
    vi.stubGlobal('fetch', async (_url: string, options: RequestInit) => {
      requestHeaders = options.headers;
      return new Response(JSON.stringify({ data: { accessToken: 'test-token', refreshToken: 'refresh', tenantId: 'tenant-acme', sessionId: 'sid', user: { userId: 'user-1', email: 'user@example.com' } } }), { status: 200 });
    });
    const success = await store.getState().login('user@example.com', 'test-password', 'tenant-acme');
    expect(new Headers(requestHeaders).get('x-tenant-id')).toBe('tenant-acme');
    expect(success).toBe(true);
    expect(store.getState().user?.id).toBe('user-1');
  });
  it('clears stale auth and returns false on a denied login', async () => {
    store.setState({ accessToken: 'stale', isAuthenticated: true });
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 403 }));
    expect(await store.getState().login('user@example.com', 'wrong', 'tenant-global')).toBe(false);
    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().accessToken).toBeNull();
  });
  it('does not restore a session when logout happens during login', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', (url: string) => url.endsWith('/login') ? new Promise<Response>((resolve) => { finish = resolve; }) : Promise.resolve(new Response(JSON.stringify({ data: { revoked: true } }))));
    const pending = store.getState().login('user@example.com', 'password', 'tenant-one');
    await vi.waitFor(() => expect(finish).toBeDefined());
    store.getState().logout();
    finish(new Response(JSON.stringify({ data: { accessToken: 'late', refreshToken: 'refresh', tenantId: 'tenant-one', sessionId: 'sid', user: { userId: 'u', email: 'user@example.com' } } })));
    expect(await pending).toBe(false);
    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().accessToken).toBeNull();
  });
});


describe('web API tenant context', () => {
  it('uses the authenticated tenant for each request and clears it on logout', async () => {
    const seen: Array<string | null> = [];
    vi.stubGlobal('fetch', async (_url: string, options: RequestInit) => {
      seen.push(new Headers(options.headers).get('x-tenant-id'));
      return new Response(JSON.stringify({ data: { ok: true }, correlationId: 'test' }), { status: 200 });
    });
    web.setState({ tenantId: 'tenant-one', accessToken: 'token' });
    await apiClient.get('/api/v1/auth/me');
    web.setState({ tenantId: 'tenant-two' });
    await apiClient.get('/api/v1/auth/me');
    web.getState().logout();
    useTenantStore.getState().setTenantId('stale-tenant');
    await apiClient.get('/health');
    expect(seen.slice(0, 2)).toEqual(['tenant-one', 'tenant-two']);
    expect(seen.slice(2).every((value) => value === null)).toBe(true);
    useTenantStore.getState().clearTenant();
  });
});
