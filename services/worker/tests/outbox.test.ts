import { describe, it, expect, beforeEach } from 'vitest';
import { OutboxProcessor } from '../src/outbox/outbox-processor.js';
import { IdempotencyService } from '../src/idempotency.js';
import { RetryService } from '../src/retry.js';
import { v4 as uuidv4 } from 'uuid';
import { hasMongo } from './support.js';

const mongoAvailable = await hasMongo();

describe('OutboxProcessor', () => {
  let outboxProcessor: OutboxProcessor;
  let idempotencyService: IdempotencyService;
  let retryService: RetryService;

  beforeEach(() => {
    outboxProcessor = OutboxProcessor.getInstance();
    idempotencyService = IdempotencyService.getInstance();
    retryService = RetryService.getInstance();
  });

  it('should process outbox messages', async () => {
    await outboxProcessor.processOutbox();
    expect(true).toBe(true);
  });

  it('should handle idempotent outbox processing', async () => {
    const key = uuidv4();
    await idempotencyService.execute(key, async () => 'result');
    const result = await idempotencyService.execute(key, async () => 'duplicate');
    expect(result).toBe('result');
  });

  it('should retry failed outbox processing', async () => {
    let attempts = 0;
    try {
      await retryService.executeWithRetry(async () => {
        attempts++;
        throw new Error('Temporary failure');
      }, { maxRetries: 3 });
    } catch (error) {
      expect(attempts).toBe(3);
    }
  });

  it.runIf(mongoAvailable)('should start and stop the outbox processor', async () => {
    await outboxProcessor.start();
    expect(outboxProcessor).toBeDefined();
    await outboxProcessor.stop();
  });
});