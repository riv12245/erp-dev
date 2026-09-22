import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../../packages/api-client/src/client';
import { normalizeError } from '../../../packages/api-client/src/errors';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('shared client without browser-only globals', () => {
  it('preserves network errors without DOMException', async () => {
    vi.stubGlobal('DOMException', undefined);
    vi.stubGlobal('fetch', async () => { throw new TypeError('offline'); });
    await expect(createApiClient({ baseUrl: 'http://api.test' }).get('/health'))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(normalizeError(new TypeError('offline')).code).toBe('NETWORK_ERROR');
    expect(normalizeError({ name: 'AbortError' }).message).toBe('Request aborted');
  });

  it('recognizes native abort errors on timeout without DOMException', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('DOMException', undefined);
    vi.stubGlobal('fetch', (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject({ name: 'AbortError', message: 'Aborted' }));
    }));
    const request = createApiClient({ baseUrl: 'http://api.test', defaultTimeoutMs: 10 }).get('/health');
    const assertion = expect(request).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });

  it('serializes query values without URLSearchParams', async () => {
    vi.stubGlobal('URLSearchParams', undefined);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] })));
    vi.stubGlobal('fetch', fetchMock);
    await createApiClient({ baseUrl: 'http://api.test' }).get('/items', {
      query: { search: 'a b&c', page: 0, active: false, ignored: undefined },
    });
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/items?search=a%20b%26c&page=0&active=false', expect.anything());
  });
});
