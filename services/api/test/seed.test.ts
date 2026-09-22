import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, type TestHarness } from './helpers.js';

describe('development seed CLI', () => {
  let h: TestHarness;
  const password = 'Seed-test-only!42';
  beforeAll(async () => { h = await setupApi(); });
  afterAll(async () => { await h?.stop(); });
  const run = (overrides: Record<string, string> = {}, args: string[] = []) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-dev.ts', ...args], {
    cwd: fileURLToPath(new URL('../../../', import.meta.url)), encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test', SEED_DEV: 'true', MONGODB_URI: h.mongo.getUri(), MONGODB_DB_NAME: 'erp_test', SEED_PASSWORD: password, ...overrides },
  });
  it('creates IAM idempotently and never logs URI or password', async () => {
    for (let i = 0; i < 2; i++) {
      const result = run();
      if (result.status !== 0) console.error(result.stderr.replace(/mongodb[^\s]+/g, '[redacted]'));
      expect(result.status).toBe(0);
      expect(result.stdout.includes(password)).toBe(false);
      expect(result.stdout.includes(h.mongo.getUri())).toBe(false);
    }
    expect(await h.conn.collection('memberships').countDocuments()).toBe(4);
    expect(await h.conn.collection('roles').countDocuments()).toBe(6);
    expect(await h.conn.collection('users').countDocuments()).toBe(4);
    expect(await h.conn.collection('tenants').countDocuments()).toBe(3);
  });
  it('refuses production and non-development databases before connecting', () => {
    expect(run({ NODE_ENV: 'production' }).status).not.toBe(0);
    expect(run({ MONGODB_DB_NAME: 'customer_live' }, ['--reset']).status).not.toBe(0);
  });
  it('reset preserves unrelated users and tenants', async () => {
    await h.conn.collection('users').insertOne({ email: 'unrelated@example.com' });
    await h.conn.collection('tenants').insertOne({ tenantId: 'unrelated' });
    expect(run({}, ['--reset']).status).toBe(0);
    expect(await h.conn.collection('users').countDocuments({ email: 'unrelated@example.com' })).toBe(1);
    expect(await h.conn.collection('tenants').countDocuments({ tenantId: 'unrelated' })).toBe(1);
  });
});
