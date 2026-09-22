import { describe, it, expect, beforeEach } from 'vitest';
import { IdempotencyService } from '../src/idempotency.js';
import { v4 as uuidv4 } from 'uuid';

describe('IdempotencyService', () => {
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    idempotencyService = IdempotencyService.getInstance();
    idempotencyService.invalidateAll();
  });

  it('should execute operation idempotently', async () => {
    const key = uuidv4();
    let executionCount = 0;

    const result1 = await idempotencyService.execute(key, async () => {
      executionCount++;
      return 'result';
    });

    const result2 = await idempotencyService.execute(key, async () => {
      executionCount++;
      return 'duplicate';
    });

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(executionCount).toBe(1);
  });

  it('should detect existing keys', async () => {
    const key = uuidv4();
    await idempotencyService.execute(key, async () => 'value');
    const exists = await idempotencyService.has(key);
    expect(exists).toBe(true);
  });

  it('should return false for non-existent keys', async () => {
    const exists = await idempotencyService.has(uuidv4());
    expect(exists).toBe(false);
  });

  it('should invalidate keys', async () => {
    const key = uuidv4();
    await idempotencyService.execute(key, async () => 'value');
    await idempotencyService.invalidate(key);
    const exists = await idempotencyService.has(key);
    expect(exists).toBe(false);
  });

  it('should generate unique keys', () => {
    const key1 = idempotencyService.generateKey('test');
    const key2 = idempotencyService.generateKey('test');
    expect(key1).not.toBe(key2);
  });
});