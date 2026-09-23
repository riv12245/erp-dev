import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { apiRequest, authHeaders, provisionMembership, registerAndLogin, setupApi, TestHarness } from './helpers.js';

interface Tokens { accessToken: string; refreshToken: string; sessionId: string; tenantId: string; expiresIn: number; }
describe('Persistent session lifecycle (real Mongo + HTTP)', () => {
  let h: TestHarness;
  const password = 'Passw0rd!123';
  beforeAll(async () => { h = await setupApi({ RATE_LIMIT_MAX: '1000', CORS_ORIGIN: 'http://localhost:5173' }); });
  afterAll(async () => { await h?.stop(); });
  async function login(email: string): Promise<Tokens> {
    const result = await apiRequest(h.baseUrl, '/api/v1/auth/login', { method: 'POST', headers: { 'x-tenant-id': 'tenant_a' }, body: { email, password } });
    expect(result.status).toBe(200);
    return result.body.data as Tokens;
  }
  const refresh = (token: string) => apiRequest(h.baseUrl, '/api/v1/auth/refresh', { method: 'POST', body: { refreshToken: token } });
  const me = (token: string) => apiRequest(h.baseUrl, '/api/v1/auth/me', { headers: authHeaders(token, 'tenant_a') });

  it('applies the same credential bounds at registration and login', async () => {
    for (const credentials of [
      { email: 'too-long@example.test', password: 'Aa1' + 'x'.repeat(4094) },
      { email: 'a'.repeat(243) + '@example.test', password },
    ]) {
      const registration = await apiRequest(h.baseUrl, '/api/v1/auth/register', { method: 'POST', body: { ...credentials, firstName: 'Test', lastName: 'User' } });
      expect(registration.status).toBe(400);
      expect((await apiRequest(h.baseUrl, '/api/v1/auth/login', { method: 'POST', headers: { 'x-tenant-id': 'tenant_a' }, body: credentials })).status).toBe(400);
    }
    const maximum = 'Aa1' + 'x'.repeat(4093);
    const user = await registerAndLogin(h, 'boundary@example.test', maximum);
    expect((await me(user.accessToken)).status).toBe(200);
  });

  it('stores only hashes, survives service reconstruction, rotates and revokes on known reuse', async () => {
    await registerAndLogin(h, 'rotate@example.test');
    const first = await login('rotate@example.test');
    expect(first.refreshToken).toBeTypeOf('string');
    const stored = await h.conn.collection('auth_sessions').findOne({ sessionId: first.sessionId });
    expect(stored).toBeTruthy();
    expect(JSON.stringify(stored)).not.toContain(first.refreshToken);
    // Each HTTP request constructs a new service; Mongo is authoritative.
    const rotated = await refresh(first.refreshToken);
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.refreshToken).not.toBe(first.refreshToken);
    expect((await me(rotated.body.data.accessToken)).status).toBe(200);
    expect((await refresh(first.refreshToken)).status).toBe(401);
    expect((await me(first.accessToken)).status).toBe(401);
    expect((await me(rotated.body.data.accessToken)).status).toBe(401);
  });

  it('fences concurrent refresh and does not let guessed credentials revoke a session', async () => {
    await registerAndLogin(h, 'race@example.test');
    const first = await login('race@example.test');
    expect((await refresh(first.sessionId + '.' + 'x'.repeat(43))).status).toBe(401);
    expect((await me(first.accessToken)).status).toBe(200);
    const results = await Promise.all([refresh(first.refreshToken), refresh(first.refreshToken)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 401]);
    expect((await me(first.accessToken)).status).toBe(401);
    const winner = results.find(r => r.status === 200)!;
    expect((await me(winner.body.data.accessToken)).status).toBe(401);
  });

  it('revokes current and all sessions immediately, including another tenant', async () => {
    const user = await registerAndLogin(h, 'logout@example.test');
    await provisionMembership(h, user.userId, 'tenant_b');
    const first = await login(user.email);
    const second = await login(user.email);
    const other = await apiRequest(h.baseUrl, '/api/v1/auth/login', { method: 'POST', headers: { 'x-tenant-id': 'tenant_b' }, body: { email: user.email, password } });
    expect((await apiRequest(h.baseUrl, '/api/v1/auth/logout', { method: 'POST', body: { refreshToken: first.refreshToken } })).status).toBe(200);
    expect((await me(first.accessToken)).status).toBe(401);
    expect((await me(second.accessToken)).status).toBe(200);
    expect((await apiRequest(h.baseUrl, '/api/v1/auth/logout-all', { method: 'POST', headers: authHeaders(second.accessToken, 'tenant_a') })).status).toBe(200);
    expect((await me(second.accessToken)).status).toBe(401);
    expect((await apiRequest(h.baseUrl, '/api/v1/auth/me', { headers: authHeaders(other.body.data.accessToken, 'tenant_b') })).status).toBe(401);
    expect((await refresh(second.refreshToken)).status).toBe(401);
  });

  it('rejects expiry, suspended users and disabled membership without accepting a supplied tenant', async () => {
    const user = await registerAndLogin(h, 'lifecycle@example.test');
    let tokens = await login(user.email);
    await h.conn.collection('auth_sessions').updateOne({ sessionId: tokens.sessionId }, { $set: { expiresAt: new Date(0) } });
    expect((await me(tokens.accessToken)).status).toBe(401);
    expect((await refresh(tokens.refreshToken)).status).toBe(401);
    tokens = await login(user.email);
    await h.conn.collection('memberships').updateOne({ userId: user.userId, tenantId: 'tenant_a' }, { $set: { status: 'disabled' } });
    expect((await refresh(tokens.refreshToken)).status).toBe(403);
    expect((await me(tokens.accessToken)).status).toBe(403);
    await provisionMembership(h, user.userId);
    await h.conn.collection('users').updateOne({ email: user.email }, { $set: { status: 'suspended' } });
    expect((await refresh(tokens.refreshToken)).status).toBe(401);
  });

  it('keeps browser refresh in HttpOnly cookies and rejects cross-origin/native browser bypasses', async () => {
    await registerAndLogin(h, 'cookie@example.test');
    const endpoint = h.baseUrl + '/api/v1/auth/login';
    const headers = { 'content-type': 'application/json', 'x-tenant-id': 'tenant_a', 'x-session-client': 'web', origin: 'http://localhost:5173' };
    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ email: 'cookie@example.test', password }) });
    expect(response.status).toBe(200);
    const body = await response.json() as { data: Tokens };
    expect(body.data.refreshToken).toBeUndefined();
    const cookie = response.headers.get('set-cookie')!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');
    const refreshUrl = h.baseUrl + '/api/v1/auth/refresh';
    expect((await fetch(refreshUrl, { method: 'POST', headers: { ...headers, cookie: cookie.split(';')[0], origin: 'https://evil.example' } })).status).toBe(403);
    expect((await fetch(refreshUrl, { method: 'POST', headers: { ...headers, cookie: cookie.split(';')[0] } })).status).toBe(200);
    expect((await fetch(endpoint, { method: 'POST', headers: { ...headers, 'x-session-client': 'native' }, body: JSON.stringify({ email: 'cookie@example.test', password }) })).status).toBe(403);
  });

  it('accepts persisted access and refresh after stopping and restarting the API process', async () => {
    await registerAndLogin(h, 'restart@example.test');
    const start = async () => {
      const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
        import { startServer } from './src/bootstrap/server.ts';
        const handle = await startServer();
        process.send({ port: handle.server.address().port });
        process.on('message', async () => { await handle.stop(); process.exit(0); });
      `], { env: { ...process.env, MONGODB_URI: h.mongo.getUri(), MONGODB_DB_NAME: 'erp_test', PORT: '0' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
      let stderr = '';
      child.stderr?.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-2000); });
      const baseUrl = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => { child.kill(); reject(new Error('API process startup timed out')); }, 10000);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', code => { clearTimeout(timer); reject(new Error(`API startup exit ${code}: ${stderr}`)); });
        child.once('message', message => { clearTimeout(timer); resolve(`http://127.0.0.1:${(message as { port: number }).port}`); });
      });
      return { baseUrl, stop: () => new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { child.kill(); reject(new Error('API shutdown timed out')); }, 10000);
        child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`API shutdown exit ${code}`)); });
        child.send('stop');
      }) };
    };
    let server = await start();
    let tokens: Tokens;
    try {
      const result = await apiRequest(server.baseUrl, '/api/v1/auth/login', { method: 'POST', headers: { 'x-tenant-id': 'tenant_a' }, body: { email: 'restart@example.test', password } });
      expect(result.status).toBe(200);
      tokens = result.body.data as Tokens;
    } finally { await server.stop(); }
    server = await start();
    try {
      expect((await apiRequest(server.baseUrl, '/api/v1/auth/me', { headers: authHeaders(tokens.accessToken, 'tenant_a') })).status).toBe(200);
      const result = await apiRequest(server.baseUrl, '/api/v1/auth/refresh', { method: 'POST', body: { refreshToken: tokens.refreshToken } });
      expect(result.status).toBe(200);
      expect(result.body.data.sessionId).toBe(tokens.sessionId);
    } finally { await server.stop(); }
  });
});
