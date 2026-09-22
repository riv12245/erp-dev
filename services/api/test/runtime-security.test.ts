import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('runtime security configuration', () => {
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
