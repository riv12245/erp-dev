import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness, apiRequest, registerAndLogin, authHeaders } from './helpers.js';

describe('health endpoints', () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await setupApi();
  });

  afterAll(async () => {
    await h.stop();
  });

  it('GET /health returns 200 with api up', async () => {
    const res = await apiRequest(h.baseUrl, '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.api).toBe('up');
  });

  it('GET /health/live returns 200', async () => {
    const res = await apiRequest(h.baseUrl, '/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/ready returns 200 when mongodb is connected', async () => {
    const res = await apiRequest(h.baseUrl, '/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks.mongodb).toBe('up');
  });

  it('GET /api/v1/status returns service metadata', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/status');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('erp-api');
    expect(res.body.correlationId).toBeTruthy();
  });

  it('unknown routes require auth and return a NOT_FOUND envelope once authenticated', async () => {
    const anon = await apiRequest(h.baseUrl, '/api/v1/nope');
    expect(anon.status).toBe(401);

    const user = await registerAndLogin(h, 'unknown-route@example.com');
    const res = await apiRequest(h.baseUrl, '/api/v1/nope', { headers: authHeaders(user.accessToken, 'tenant_a') });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.correlationId).toBeTruthy();
  });
});