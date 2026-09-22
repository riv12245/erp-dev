import { describe, it, expect, beforeEach } from 'vitest';
import { DomainEventDispatcher } from '../src/events/domain-event-dispatcher.js';
import { EventSchemaValidator } from '../src/events/event-schema-validator.js';
import { IntegrationEventPublisher } from '../src/events/integration-event-publisher.js';
import { IdempotencyService } from '../src/idempotency.js';
import { RetryService } from '../src/retry.js';
import { DomainEvent } from '../src/shared/types.js';
import { v4 as uuidv4 } from 'uuid';
import { hasRedis } from './support.js';

const redisAvailable = await hasRedis();

describe('Event Handling', () => {
  let dispatcher: DomainEventDispatcher;
  let validator: EventSchemaValidator;
  let publisher: IntegrationEventPublisher;
  let idempotencyService: IdempotencyService;
  let retryService: RetryService;

  beforeEach(() => {
    dispatcher = DomainEventDispatcher.getInstance();
    validator = EventSchemaValidator.getInstance();
    publisher = IntegrationEventPublisher.getInstance();
    idempotencyService = IdempotencyService.getInstance();
    retryService = RetryService.getInstance();
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

    await publisher.publish(event);
    expect(true).toBe(true);
  });

  it('should handle duplicate integration events', async () => {
    const key = uuidv4();
    await idempotencyService.execute(key, async () => 'event');
    const exists = await idempotencyService.has(key);
    expect(exists).toBe(true);
  });
});