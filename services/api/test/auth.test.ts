import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness, apiRequest, provisionMembership } from './helpers.js';

describe('auth endpoints', () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await setupApi({ RATE_LIMIT_MAX: '100' });
  });

  afterAll(async () => {
    await h.stop();
  });

  it('registers a new user and returns an envelope', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/register', {
      method: 'POST',
      body: { email: 'alice@example.com', password: 'Passw0rd!123', firstName: 'Alice', lastName: 'Example' },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBeTruthy();
    expect(res.body.data.email).toBe('alice@example.com');
    expect(res.body.meta.action).toBe('register');
    await provisionMembership(h, res.body.data.userId);
    expect((res.body.data.passwordHash ?? res.body.data.password ?? res.body.data.passwords) ?? null).toBe(null);
  });

  it('rejects registration with missing fields (400)', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/register', {
      method: 'POST',
      body: { email: 'bob@example.com', password: 'Passw0rd!123' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate email registration (409)', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/register', {
      method: 'POST',
      body: { email: 'alice@example.com', password: 'Passw0rd!123', firstName: 'Alice', lastName: 'Example' },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('logs in and returns an access token', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant_a' },
      body: { email: 'alice@example.com', password: 'Passw0rd!123' },
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  it('rejects wrong credentials (401)', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'x-tenant-id': 'tenant_a' },
      body: { email: 'alice@example.com', password: 'Wrong-Password' },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects /auth/me without a token', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/auth/me', { headers: { 'x-tenant-id': 'tenant_a' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});