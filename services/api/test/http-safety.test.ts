import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, type TestHarness } from './helpers.js';

describe('HTTP boundary errors', () => {
  let h: TestHarness;
  beforeAll(async () => { h = await setupApi({ RATE_LIMIT_MAX: '3' }); });
  afterAll(async () => { await h?.stop(); });
  it('returns bounded correlated validation envelopes for invalid JSON and oversized bodies', async () => {
    for (const [body, status] of [['{"password":', 400], [JSON.stringify({ password: 'x'.repeat(1024 * 1024) }), 413]] as const) {
      const res = await fetch(h.baseUrl + '/api/v1/auth/register', { method: 'POST', headers: { 'content-type': 'application/json', 'x-correlation-id': 'trace-safe' }, body });
      expect(res.status).toBe(status);
      const envelope = await res.json() as { correlationId: string; error: { code: string } };
      expect(envelope.correlationId).toBe('trace-safe');
      expect(envelope.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(envelope)).not.toContain('password');
    }
  });
  it('returns the same error envelope when rate limited', async () => {
    let response: Response | undefined;
    for (let i = 0; i < 4; i++) response = await fetch(h.baseUrl + '/health/live');
    expect(response!.status).toBe(429);
    expect(await response!.json()).toMatchObject({ correlationId: expect.any(String), error: { code: 'RATE_LIMITED' } });
  });
});
