import { describe, expect, it } from 'vitest';
import { createMemoryBruteForce } from '../src/index.js';

describe('memory brute-force guard', () => {
  it('blocks after max attempts and resets on reset()', async () => {
    const guard = createMemoryBruteForce({ maxAttempts: 3, windowMs: 60_000, blockMs: 60_000 });
    expect(await guard.increment('email:user')).toEqual({ count: 1, blocked: false });
    expect(await guard.increment('email:user')).toEqual({ count: 2, blocked: false });
    expect(await guard.increment('email:user')).toEqual({ count: 3, blocked: true });
    expect(guard.isBlocked('email:user')).toBe(true);

    await guard.reset('email:user');
    expect(guard.isBlocked('email:user')).toBe(false);
    expect(await guard.increment('email:user')).toEqual({ count: 1, blocked: false });
  });

  it('tracks keys independently', async () => {
    const guard = createMemoryBruteForce({ maxAttempts: 2, windowMs: 60_000, blockMs: 60_000 });
    await guard.increment('key-a');
    await guard.increment('key-a');
    expect(guard.isBlocked('key-a')).toBe(true);
    expect(guard.isBlocked('key-b')).toBe(false);
    expect(await guard.increment('key-b')).toEqual({ count: 1, blocked: false });
  });

  it('counts down only within the window', async () => {
    const guard = createMemoryBruteForce({ maxAttempts: 2, windowMs: 100, blockMs: 50_000 });
    await guard.increment('email:x');
    expect(guard.isBlocked('email:x')).toBe(false);
  });
});