import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness, provisionMembership } from './helpers.js';
import { AuthDomainService } from '../src/platform/auth/auth-service.js';
import { AuthService } from '../src/platform/auth/auth-app-service.js';
import { getUserModel } from '../src/platform/auth/user-model.js';

describe('auth brute-force protection (unit)', () => {
  let h: TestHarness;
  let service: AuthService;

  const email = 'lockout@example.com';
  const password = 'Passw0rd!123';

  beforeAll(async () => {
    h = await setupApi();
    const domain = new AuthDomainService('test-secret-for-brute-force');
    service = new AuthService(h.conn, domain, 900, 3);
    const user = await service.register({ email, password, firstName: 'Lock', lastName: 'Out' });
    await provisionMembership(h, user.userId);
  });

  afterAll(async () => {
    await h.stop();
  });

  it('locks the account after too many failed attempts', async () => {
    for (let i = 0; i < 3; i += 1) {
      await expect(service.login(email, 'wrong-password', 'tenant_a')).rejects.toMatchObject({ statusCode: 401 });
    }
    const User = getUserModel(h.conn);
    const user = await User.findOne({ email }).exec();
    expect(user?.status).toBe('locked');
    expect(user?.lockedUntil).toBeTruthy();
  });

  it('rejects even valid credentials while the account is temporarily locked', async () => {
    await expect(service.login(email, password, 'tenant_a')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('never returns password material', async () => {
    const User = getUserModel(h.conn);
    const user = await User.findOne({ email }).exec();
    const raw = user?.toObject() as Record<string, unknown>;
    expect(raw.passwordHash).toBeTruthy();
    expect(JSON.stringify(raw)).toContain('passwordHash');
  });

  it('resets failed attempts after a successful login', async () => {
    const User = getUserModel(h.conn);
    await User.updateOne({ email }, { $set: { status: 'active', lockedUntil: null, failedLoginAttempts: 0 } }).exec();
    await service.login(email, password, 'tenant_a');
    const user = await User.findOne({ email }).exec();
    expect(user?.failedLoginAttempts).toBe(0);
  });
});

describe('auth model sanity', () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await setupApi();
  });

  afterAll(async () => {
    await h.stop();
  });

  it('rejects empty email and enforces unique email', async () => {
    const User = getUserModel(h.conn);
    await User.init();
    await expect(User.create({ email: '', passwordHash: 'x', firstName: 'A', lastName: 'B', status: 'active', failedLoginAttempts: 0 })).rejects.toThrow();
    await User.create({ email: 'unique@example.com', passwordHash: 'x', firstName: 'A', lastName: 'B', status: 'active', failedLoginAttempts: 0 });
    await expect(
      User.create({ email: 'unique@example.com', passwordHash: 'y', firstName: 'C', lastName: 'D', status: 'active', failedLoginAttempts: 0 }),
    ).rejects.toThrow();
  });
});