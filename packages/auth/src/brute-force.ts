import { issueTokenPair, verifyAccessToken, verifyRefreshToken } from './token.js';

export interface BruteForceStore {
  readonly increment: (key: string) => Promise<{ count: number; blocked: boolean }>;
  readonly reset: (key: string) => Promise<void>;
}

export interface BruteForceConfig {
  readonly maxAttempts: number;
  readonly windowMs: number;
  readonly blockMs: number;
}

/** In-memory brute-force guard. Swap for a Redis-backed store in production. */
export function createMemoryBruteForce(config: BruteForceConfig) {
  const state = new Map<string, { count: number; firstAt: number; blockedUntil: number }>();

  return {
    async increment(key: string): Promise<{ count: number; blocked: boolean }> {
      const now = Date.now();
      const entry = state.get(key);
      if (!entry || now - entry.firstAt > config.windowMs) {
        const fresh = { count: 1, firstAt: now, blockedUntil: 0 };
        state.set(key, fresh);
        return { count: 1, blocked: false };
      }
      if (entry.blockedUntil > now) return { count: entry.count, blocked: true };
      entry.count += 1;
      if (entry.count >= config.maxAttempts) entry.blockedUntil = now + config.blockMs;
      return { count: entry.count, blocked: entry.count >= config.maxAttempts };
    },
    async reset(key: string): Promise<void> {
      state.delete(key);
    },
    isBlocked(key: string): boolean {
      const entry = state.get(key);
      return entry !== undefined && entry.blockedUntil > Date.now();
    },
  };
}

export { issueTokenPair, verifyAccessToken, verifyRefreshToken };
export type { TokenConfig, TokenPair } from './token.js';