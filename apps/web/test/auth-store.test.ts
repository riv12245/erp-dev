import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore as web } from '../src/store/auth-store';
import { apiClient } from '../src/services/api-client';
import { useTenantStore } from '../src/store/tenant-store';
import { useAuthStore as mobile } from '../../mobile/src/store/auth-store';

afterEach(() => { vi.unstubAllGlobals(); web.getState().logout(); mobile.getState().logout(); });
describe.each([['web', web], ['mobile', mobile]] as const)('%s login contract', (_name, store) => {
  it('sends explicit tenant and consumes the actual user identity', async () => {
    let requestHeaders: HeadersInit | undefined;
    vi.stubGlobal('fetch', async (_url: string, options: RequestInit) => {
      requestHeaders = options.headers;
      return new Response(JSON.stringify({ data: { accessToken: 'test-token', user: { userId: 'user-1', email: 'user@example.com' } } }), { status: 200 });
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
    useTenantStore.getState().clearTenant();
    await apiClient.get('/health');
    expect(seen).toEqual(['tenant-one', 'tenant-two', null]);
  });
});
