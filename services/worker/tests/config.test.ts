import { afterEach, describe, expect, it, vi } from 'vitest';
import { workerConfig } from '../src/config.js';

describe('worker runtime configuration', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
  it('keeps one fallback worker identity across time', () => {
    vi.stubEnv('WORKER_ID', undefined);
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const first = workerConfig.workerId;
    vi.setSystemTime(2000);
    expect(workerConfig.workerId).toBe(first);
  });
  it.each(['NaN', '-1', '0', '1.5', 'Infinity'])('rejects invalid retry budget %s', value => {
    vi.stubEnv('MAX_RETRIES', value);
    expect(() => workerConfig.maxRetries).toThrow('Invalid worker configuration');
  });
  it('accepts zero retry delay while rejecting a zero polling interval', () => {
    vi.stubEnv('RETRY_DELAY_MS', '0');
    vi.stubEnv('OUTBOX_POLL_INTERVAL_MS', '0');
    expect(workerConfig.retryDelayMs).toBe(0);
    expect(() => workerConfig.outboxPollIntervalMs).toThrow('Invalid worker configuration');
  });
});
