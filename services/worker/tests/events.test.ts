import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { DomainEventDispatcher } from '../src/events/domain-event-dispatcher.js';
import { EventSchemaValidator } from '../src/events/event-schema-validator.js';
import { IntegrationEventPublisher } from '../src/events/integration-event-publisher.js';
import { IdempotencyService } from '../src/idempotency.js';
import { RetryService } from '../src/retry.js';
import { DomainEvent } from '../src/shared/types.js';
import { randomUUID as uuidv4 } from 'node:crypto';
import { hasRedis } from './support.js';

const redisAvailable = await hasRedis();
if (process.env.CI && !redisAvailable) throw new Error('CI requires Redis for event integration tests');

describe('Event Handling', () => {
  let dispatcher: DomainEventDispatcher;
  let validator: EventSchemaValidator;
  let publisher: IntegrationEventPublisher;
  let idempotencyService: IdempotencyService;
  let retryService: RetryService;

  beforeEach(() => {
    dispatcher = DomainEventDispatcher.getInstance();
    validator = EventSchemaValidator.getInstance();
    if (redisAvailable) publisher = IntegrationEventPublisher.getInstance();
    idempotencyService = IdempotencyService.getInstance();
    retryService = RetryService.getInstance();
  });

  afterAll(async () => {
    if (redisAvailable) await publisher.stop();
  });

  it('should validate domain events', async () => {
    const event: DomainEvent = {
      id: uuidv4(),
      eventType: 'order.created',
      source: 'order-service',
      data: { orderId: '123', customerId: '456', total: 99.99 },
      timestamp: new Date(),
      idempotencyKey: uuidv4(),
      correlationId: uuidv4(),
      version: 1,
    };

    const isValid = await validator.validate(event);
    expect(isValid).toBe(true);
  });

  it('rejects events without a real handler instead of recording fake success', async () => {
    const event: DomainEvent = {
      id: uuidv4(), eventType: 'order.created', source: 'test',
      data: { orderId: '123', customerId: '456', total: 99.99 }, timestamp: new Date(),
      idempotencyKey: uuidv4(), correlationId: uuidv4(), version: 1,
    };
    await expect(dispatcher.dispatch(event)).rejects.toThrow('No handler registered');
    expect(await idempotencyService.has(event.idempotencyKey)).toBe(false);
  });

  it('should reject invalid domain events', async () => {
    const event: DomainEvent = {
      id: uuidv4(),
      eventType: 'order.created',
      source: 'order-service',
      data: { invalid: 'data' },
      timestamp: new Date(),
      idempotencyKey: uuidv4(),
      correlationId: uuidv4(),
      version: 1,
    };

    const isValid = await validator.validate(event);
    expect(isValid).toBe(false);
  });

  it('should dispatch events idempotently', async () => {
    const key = uuidv4();
    await idempotencyService.execute(key, async () => 'dispatched');
    const result = await idempotencyService.execute(key, async () => 'duplicate');
    expect(result).toBe('dispatched');
  });

  it('should retry failed event dispatching', async () => {
    let attempts = 0;
    try {
      await retryService.executeWithRetry(async () => {
        attempts++;
        throw new Error('Event dispatch failed');
      }, { maxRetries: 2 });
    } catch (error) {
      expect(attempts).toBe(2);
    }
  });

  it.runIf(redisAvailable)('should publish integration events', async () => {
    const event = {
      id: uuidv4(),
      eventType: 'test.event',
      source: 'test-source',
      target: 'test-target',
      data: { test: true },
      timestamp: new Date(),
      correlationId: uuidv4(),
      idempotencyKey: uuidv4(),
    };

    const subscriber = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
    try {
      await subscriber.subscribe(`integration-events:${event.eventType}`);
      const received = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Redis did not deliver the event')), 3000);
        subscriber.once('message', (_channel, payload) => {
          clearTimeout(timeout);
          resolve(payload);
        });
      });
      const [, payload] = await Promise.all([publisher.publish(event), received]);
      expect(JSON.parse(payload)).toEqual({ ...event, timestamp: event.timestamp.toISOString() });
    } finally {
      await subscriber.quit();
    }
  });

  it('should handle duplicate integration events', async () => {
    const key = uuidv4();
    await idempotencyService.execute(key, async () => 'event');
    const exists = await idempotencyService.has(key);
    expect(exists).toBe(true);
  });
});
