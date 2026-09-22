import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, serializeHash, parseHash } from '../src/index.js';

describe('pbkdf2 password hashing', () => {
  it('round-trips a password', async () => {
    const hash = await hashPassword('S3curePass!1', 2_000);
    expect(hash.algorithm).toBe('pbkdf2-sha256');
    expect(hash.salt.length).toBeGreaterThan(0);
    expect(hash.hash).not.toBe('S3curePass!1');
    await expect(verifyPassword('S3curePass!1', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('uses a unique salt per call', async () => {
    const a = await hashPassword('same-password', 2_000);
    const b = await hashPassword('same-password', 2_000);
    expect(b.salt).not.toBe(a.salt);
    expect(b.hash).not.toBe(a.hash);
  });

  it('serializes and parses the stored format', async () => {
    const hash = await hashPassword('S3curePass!1', 2_000);
    const serialized = serializeHash(hash);
    expect(serialized).toMatch(/^pbkdf2-sha256:\d+:/);
    const parsed = parseHash(serialized);
    expect(parsed).toEqual(hash);
    await expect(verifyPassword('S3curePass!1', parsed!)).resolves.toBe(true);
  });

  it('returns null for malformed stored hashes', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('not-a-valid-hash')).toBeNull();
    expect(parseHash('pbkdf2-sha256:notanumber:')).toBeNull();
  });
});