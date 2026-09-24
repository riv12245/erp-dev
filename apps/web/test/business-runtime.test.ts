import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../../packages/api-client/src/client';
import { applyBusinessResult, businessRecordId, createBusinessClient, hydrateBusinessIdentity, salesDraftLines } from '../../../packages/api-client/src/business';
import type { BusinessIdentity } from '../../../packages/api-client/src/business';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const response = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

describe('business client and lifetime boundaries', () => {
  it('unwraps authorized companies and scopes customer queries to the selected company', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response([{ id: 'allowed', name: 'Company', defaultCurrency: 'MXN' }])).mockResolvedValueOnce(response({ items: [], total: 0, page: 2, limit: 20, totalPages: 0 }));
    vi.stubGlobal('fetch', fetchMock);
    const business = createBusinessClient(createApiClient({ baseUrl: 'https://api.test', getTenantId: () => 'tenant', getAccessToken: () => 'token' }));
    expect(await business.companies()).toEqual([{ id: 'allowed', name: 'Company', defaultCurrency: 'MXN' }]);
    await business.list('allowed', 'customers', { search: 'A & B', page: 2, limit: 20 });
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/api/v1/companies/allowed/crm/customers?search=A%20%26%20B&page=2&limit=20');
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ authorization: 'Bearer token', 'x-tenant-id': 'tenant' });
  });

  it('hydrates effective permissions from the server identity', async () => {
    const identity: BusinessIdentity = { requesterId: 'user', tenantId: 'tenant', permissions: ['crm.customer.read'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(identity)));
    const apply = vi.fn();
    await hydrateBusinessIdentity(createApiClient({ baseUrl: 'https://api.test' }), { signal: new AbortController().signal, epoch: 4, getEpoch: () => 4, apply });
    expect(apply).toHaveBeenCalledExactlyOnceWith(identity);
  });

  it('does not hydrate a previous session after its response arrives late', async () => {
    const pending = deferred<Response>();
    vi.stubGlobal('fetch', () => pending.promise);
    const apply = vi.fn(); let epoch = 1;
    const hydration = hydrateBusinessIdentity(createApiClient({ baseUrl: 'https://api.test' }), { signal: new AbortController().signal, epoch, getEpoch: () => epoch, apply });
    epoch = 2;
    pending.resolve(response({ requesterId: 'old', tenantId: 'tenant', permissions: ['*'] }));
    await hydration;
    expect(apply).not.toHaveBeenCalled();
  });

  it('remains fail closed when permissions cannot be loaded', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'No access' } }), { status: 403 }));
    const apply = vi.fn();
    await expect(hydrateBusinessIdentity(createApiClient({ baseUrl: 'https://api.test' }), { signal: new AbortController().signal, epoch: 1, getEpoch: () => 1, apply })).rejects.toMatchObject({ status: 403 });
    expect(apply).not.toHaveBeenCalled();
  });

  it('a late company A result cannot replace company B even if transport ignores cancellation', async () => {
    const old = deferred<string>(); const oldController = new AbortController();
    let visible = '';
    const stale = applyBusinessResult(old.promise, oldController.signal, value => { visible = value; });
    oldController.abort();
    await applyBusinessResult(Promise.resolve('company B'), new AbortController().signal, value => { visible = value; });
    old.resolve('company A'); await stale;
    expect(visible).toBe('company B');
  });

  it('rejects an old session response even when both sessions select the same company', async () => {
    const pending = deferred<Response>(); vi.stubGlobal('fetch', () => pending.promise);
    let epoch = 1;
    const business = createBusinessClient(createApiClient({ baseUrl: 'https://api.test', getSessionEpoch: () => epoch }));
    const list = business.list('same-company', 'customers', { page: 1 });
    epoch = 2; pending.resolve(response({ items: [{ name: 'Old account data' }], total: 1, page: 1, limit: 20, totalPages: 1 }));
    await expect(list).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('uses the order identifier rather than its customer identifier', () => {
    expect(businessRecordId({ orderId: 'order', customerId: 'customer' })).toBe('order');
  });

  it('keeps version and idempotency data in mutation bodies without unsafe retries', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ id: 'product', version: 3 })).mockResolvedValueOnce(response({ orderId: 'order', status: 'CANCELLED' }));
    vi.stubGlobal('fetch', fetchMock);
    const business = createBusinessClient(createApiClient({ baseUrl: 'https://api.test' }));
    await business.update('company', 'products', 'product', { expectedVersion: 2, name: 'Updated' });
    await business.cancelOrder('company', 'order', 1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ expectedVersion: 2, name: 'Updated' });
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/api/v1/companies/company/sales/orders/order/cancel');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ expectedVersion: 1 });
  });

  it('validates draft prices by company currency and rejects invalid quantities', () => {
    expect(salesDraftLines([{ itemId: 'product', quantity: '1.125', unitPrice: '1.234' }], 'KWD')).toEqual([{ itemId: 'product', quantity: 1.125, unitPrice: 1.234 }]);
    expect(() => salesDraftLines([{ itemId: 'product', quantity: '1', unitPrice: '1.5' }], 'JPY')).toThrow('0 decimal places');
    expect(() => salesDraftLines([{ itemId: 'product', quantity: '0', unitPrice: '10' }])).toThrow('quantity');
  });

  it.each(['1e-18', '0.0000000001', '1.0000000001'])('rejects quantities outside the server three-decimal contract: %s', quantity => {
    expect(() => salesDraftLines([{ itemId: 'product', quantity, unitPrice: '10' }])).toThrow('quantity');
  });
});

// Prepared regression: token rotation keeps the same form lifetime and effective permissions.
describe('idempotent business write refresh', () => {
  it.each(['movements', 'orders'] as const)('retries %s after a 401 with the identical frozen body and key', async resource => {
    let token = 'expired';
    const calls: Array<{ body: string; key: string | null; token: string | null }> = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      calls.push({ body: String(init.body), key: headers.get('idempotency-key'), token: headers.get('authorization') });
      return calls.length === 1 ? new Response('{}', { status: 401 }) : response({ id: 'saved-once' });
    });
    const refresh = vi.fn(async () => { token = 'fresh'; return token; });
    const business = createBusinessClient(createApiClient({ baseUrl: 'https://api.test', getAccessToken: () => token, onRefresh: refresh, getSessionEpoch: () => 1 }));
    const frozen = Object.freeze({ idempotencyKey: 'stable-key', quantity: 3, reason: 'Receive' });
    await business.create('company', resource, frozen);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      { body: JSON.stringify(frozen), key: 'stable-key', token: 'Bearer expired' },
      { body: JSON.stringify(frozen), key: 'stable-key', token: 'Bearer fresh' },
    ]);
  });
});
