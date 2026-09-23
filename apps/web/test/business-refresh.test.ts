import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../src/store/auth-store';
import { usePermissionStore } from '../src/store/permission-store';
import { businessSessionKey } from '../../../packages/api-client/src/business';

const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });
const session = { accessToken: 'access-1', refreshToken: 'refresh', tenantId: 'tenant', sessionId: 'session', user: { userId: 'user', email: 'user@example.com' } };
afterEach(async () => {
  vi.stubGlobal('fetch', async () => response({ revoked: true }));
  await useAuthStore.getState().logout(); vi.unstubAllGlobals();
});
describe('business forms survive token-only refresh', () => {
  it('retains the principal and exact form lifetime key when only access credentials rotate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(session)).mockResolvedValueOnce(response({ ...session, accessToken: 'access-2' })));
    expect(await useAuthStore.getState().login('user@example.com', 'password', 'tenant')).toBe(true);
    usePermissionStore.getState().setIdentity({ requesterId: 'user', tenantId: 'tenant', permissions: ['sales.order.write'] });
    const principal = usePermissionStore.getState().principal;
    const before = useAuthStore.getState();
    const formKey = businessSessionKey(before.sessionEpoch(), before.tenantId, before.user?.id);
    expect(await before.refresh()).toBe('access-2');
    const after = useAuthStore.getState();
    expect(businessSessionKey(after.sessionEpoch(), after.tenantId, after.user?.id)).toBe(formKey);
    expect(usePermissionStore.getState().principal).toBe(principal);
  });

  it('destroys the old form lifetime and effective permissions on an actual logout', async () => {
    vi.stubGlobal('fetch', async (url: string) => response(url.endsWith('/login') ? session : { revoked: true }));
    await useAuthStore.getState().login('user@example.com', 'password', 'tenant');
    usePermissionStore.getState().setIdentity({ requesterId: 'user', tenantId: 'tenant', permissions: ['sales.order.write'] });
    const before = useAuthStore.getState(); const formKey = businessSessionKey(before.sessionEpoch(), before.tenantId, before.user?.id);
    await before.logout(); const after = useAuthStore.getState();
    expect(businessSessionKey(after.sessionEpoch(), after.tenantId, after.user?.id)).not.toBe(formKey);
    expect(usePermissionStore.getState().principal).toBeNull();
  });
});
