import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore as web } from '../src/store/auth-store';
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
