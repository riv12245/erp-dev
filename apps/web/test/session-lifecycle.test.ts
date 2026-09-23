import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApiClient } from '../../../packages/api-client/src/client';
import { createSessionController, type Session } from '../../../packages/api-client/src/session';

const value: Session = { accessToken: 'access', refreshToken: 'refresh', tenantId: 'tenant', sessionId: 'session', user: { userId: 'user', email: 'u@example.com' } };
const response = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status });
afterEach(() => vi.unstubAllGlobals());
function setup(native = true) {
  let token: string | null = 'stored'; let blocked = false;
  const changed = vi.fn();
  const storage = { read: async () => token, write: async (v: string | null) => { token = v; }, blocked: async () => blocked, block: async (v: boolean) => { blocked = v; } };
  const controller = createSessionController({ client: createApiClient({ baseUrl: 'http://api.test' }), native, storage, changed });
  return { controller, changed, storage };
}
describe('session lifecycle unit contracts (mocked transport)', () => {
  it('restores from native storage, rotates durable token, and deduplicates refresh', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => response(value)); vi.stubGlobal('fetch', fetchMock);
    const { controller, storage } = setup();
    expect(await Promise.all([controller.restore(), controller.refresh()])).toEqual(['access', 'access']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({ refreshToken: 'stored' });
    expect(await storage.read()).toBe('refresh');
  });
  it('fences refresh completion after logout and removes durable credentials', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', (url: string) => url.endsWith('/refresh') ? new Promise<Response>((resolve) => { finish = resolve; }) : Promise.resolve(response({ revoked: true })));
    const { controller, storage, changed } = setup();
    const refreshing = controller.refresh();
    await vi.waitFor(() => expect(finish).toBeDefined());
    const logout = controller.logout(); finish(response(value));
    expect(await refreshing).toBeNull(); await logout;
    expect(changed.mock.calls.some(([session]) => session !== null)).toBe(false);
    expect(await storage.read()).toBeNull(); expect(await storage.blocked()).toBe(true);
  });
  it('offline logout blocks cookie restoration on next startup', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('offline'); });
    const { controller, storage, changed } = setup(false);
    await controller.logout();
    const next = createSessionController({ client: createApiClient({ baseUrl: 'http://api.test' }), native: false, storage, changed });
    expect(await next.restore()).toBeNull();
    expect(changed).toHaveBeenLastCalledWith(null, false, expect.stringContaining('locally'));
  });
  it('clears revoked refresh credentials and prevents repeated restore', async () => {
    const transport = vi.fn(async () => response({}, 401)); vi.stubGlobal('fetch', transport);
    const { controller, storage } = setup();
    expect(await controller.restore()).toBeNull();
    expect(await storage.read()).toBeNull();
    expect(await storage.blocked()).toBe(true);
    await controller.restore(); expect(transport).toHaveBeenCalledTimes(1);
  });
  it('attempts remote revocation even if secure persistence fails', async () => {
    const transport = vi.fn(async () => response({ revoked: true })); vi.stubGlobal('fetch', transport);
    const changed = vi.fn();
    const controller = createSessionController({ client: createApiClient({ baseUrl: 'http://api.test' }), native: true, changed,
      storage: { read: async () => 'old', write: async () => { throw new Error('disk'); }, blocked: async () => false,
        block: () => { throw new Error('disk'); } } });
    await controller.logout();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenLastCalledWith(null, false, expect.stringContaining('persistence'));
    expect(await controller.restore()).toBeNull();
  });
});

describe('bounded shared refresh retries', () => {
  it('single flight refresh serves concurrent 401 reads with at most one retry each', async () => {
    let token = 'old';
    const refresh = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); token = 'new'; return token; });
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => response({ ok: true }, new Headers(init.headers).get('authorization') === 'Bearer new' ? 200 : 401));
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ baseUrl: 'http://api.test', getAccessToken: () => token, onRefresh: refresh });
    await Promise.all([client.get('/a'), client.get('/b')]);
    expect(refresh).toHaveBeenCalledTimes(1); expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it('never replays ordinary writes, even when a key was supplied', async () => {
    const refresh = vi.fn(async () => 'new'); const fetchMock = vi.fn(async () => response({}, 401));
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ baseUrl: 'http://api.test', onRefresh: refresh });
    await expect(client.post('/orders', {}, { idempotencyKey: 'key' })).rejects.toBeDefined();
    expect(refresh).not.toHaveBeenCalled(); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not retry with a token returned after logout changed epoch', async () => {
    let epoch = 0;
    vi.stubGlobal('fetch', vi.fn(async () => response({}, 401)));
    const client = createApiClient({ baseUrl: 'http://api.test', getSessionEpoch: () => epoch, onRefresh: async () => { epoch++; return 'late'; } });
    await expect(client.get('/orders')).rejects.toBeDefined(); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects successful old-session data returned after logout', async () => {
    let epoch = 0; let finish!: (r: Response) => void;
    vi.stubGlobal('fetch', () => new Promise<Response>((resolve) => { finish = resolve; }));
    const client = createApiClient({ baseUrl: 'http://api.test', getSessionEpoch: () => epoch });
    const pending = client.get('/private');
    await vi.waitFor(() => expect(finish).toBeDefined());
    epoch++; finish(response({ secret: true }));
    await expect(pending).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
  it('retries a guaranteed idempotent write only once and exposes a repeated 401', async () => {
    const transport = vi.fn(async () => response({}, 401)); vi.stubGlobal('fetch', transport);
    const refresh = vi.fn(async () => 'new');
    const client = createApiClient({ baseUrl: 'http://api.test', onRefresh: refresh });
    await expect(client.post('/orders', {}, { idempotencyKey: 'guaranteed-key', idempotencyGuaranteed: true })).rejects.toMatchObject({ status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1); expect(transport).toHaveBeenCalledTimes(2);
  });
});
