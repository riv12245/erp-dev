import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('runtime security configuration', () => {
  it.each([
    ['PORT', '-1'], ['RATE_LIMIT_MAX', '0'], ['RATE_LIMIT_WINDOW_MS', 'NaN'],
    ['JWT_EXPIRES_IN', 'forever'], ['JWT_REFRESH_EXPIRES_IN', '0d'],
    ['CORS_ORIGIN', '*'], ['MONGO_POOL_SIZE', '-1'], ['JWT_SECRET', 'change-me-in-production-use-a-very-long-random-string'],
  ])('rejects invalid %s at startup', async (key, value) => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_SECRET', 'test-secret-0123456789abcdef0123456789abcdef');
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017');
    vi.stubEnv(key, value);
    vi.resetModules();
    const { loadConfig } = await import('../src/config/index.js');
    expect(() => loadConfig()).toThrow(key);
  });
  it('refuses production with development JWT secrets', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'dev-only-insecure-secret');
    vi.resetModules();
    const { loadConfig } = await import('../src/config/index.js');
    expect(() => loadConfig()).toThrow();
  });
  it('rejects invalid brute-force thresholds', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('AUTH_BRUTE_FORCE_MAX', 'NaN');
    vi.resetModules();
    const { loadConfig } = await import('../src/config/index.js');
    expect(() => loadConfig()).toThrow();
  });
  it('never forces local DNS in production', () => {
    const result = spawnSync(process.execPath, ['--import', './src/bootstrap/dns-cloudflare.mjs', '-e', ''], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 10_000,
      env: { ...process.env, NODE_ENV: 'production' },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('Cloudflare');
  });
});
