import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness } from './helpers.js';
import { MongoOutboxRepository, eventToOutboxRecord, getOutboxModel } from '../src/platform/outbox/mongo-outbox-repository.js';
import { DeduplicatingOutboxPublisher } from '../src/platform/outbox/outbox-processor.js';
import { createEvent, InMemoryEventBus } from '../src/platform/events/index.js';

describe('outbox repository', () => {
  let h: TestHarness;
  let repo: MongoOutboxRepository;

  const makeEvent = (name: string) =>
    createEvent(name, 1, `agg-${name}`, 'tenant_a', { orderId: 'ord_1', total: 42.5 }, { correlationId: 'corr-1' });

  beforeAll(async () => {
    h = await setupApi();
    repo = new MongoOutboxRepository(h.conn);
  });

  afterAll(async () => {
    await h.stop();
  });

  it('appends an event and exposes it in pending counts', async () => {
    const event = makeEvent('order.created');
    await repo.append(eventToOutboxRecord(event));
    expect(await repo.countPending()).toBe(1);
    expect(await repo.countPending('tenant_a')).toBe(1);
    expect(await repo.countPending('tenant_b')).toBe(0);
  });

  it('claims a batch, marks processing, then lets publish mark published', async () => {
    const batch = await repo.claimBatch(10, 'test-owner');
    expect(batch.length).toBeGreaterThan(0);

    const Model = getOutboxModel(h.conn);
    for (const record of batch) {
      const doc = await Model.findOne({ eventId: record.eventId }).exec();
      expect(doc?.status).toBe('processing');
      await repo.markPublished(record.eventId);
    }
    expect(await repo.countPending()).toBe(0);
  });

  it('marks failures with retry attempts', async () => {
    await repo.append({
      eventId: 'order-failed-1',
      eventName: 'order.failed',
      eventVersion: 1,
      aggregateId: 'agg-failed',
      tenantId: 'tenant_a',
      occurredAt: new Date(),
      payload: {},
      correlationId: 'corr-f',
      status: 'pending',
      attempts: 0,
    });
    await repo.claimBatch(10, 'test-owner');
    await repo.markFailed('order-failed-1', 'boom');

    const doc = await getOutboxModel(h.conn).findOne({ eventId: 'order-failed-1' }).exec();
    expect(doc?.status).toBe('failed');
    expect(doc?.lastError).toBe('boom');
    expect(doc?.attempts).toBe(1);
  });

  it('rejects duplicate eventIds (unique index)', async () => {
    const event = makeEvent('order.duplicate');
    await repo.append(eventToOutboxRecord(event));
    await expect(repo.append(eventToOutboxRecord(event))).rejects.toThrow();
  });

  it('does not re-emit a claim for already published events', async () => {
    const batch = await repo.claimBatch(50, 'test-owner');
    for (const record of batch) {
      await repo.markPublished(record.eventId);
    }
    expect(await repo.countPending()).toBe(0);
    expect(await repo.claimBatch(50, 'test-owner')).toEqual([]);
  });
});

describe('event bus + deduplicating outbox publisher', () => {
  it('in-memory bus routes events only to matching handlers', async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];
    bus.subscribe({ handles: (event) => event.eventName === 'order.created', handle: async (event) => { calls.push(event.eventId); } });
    bus.subscribe({ handles: (event) => event.eventName === 'order.shipped', handle: async (event) => { calls.push(event.eventId); } });

    const created = createEvent('order.created', 1, 'a', 'ten', { x: 1 }, { correlationId: '1' });
    await bus.publish(created);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(created.eventId);
  });

  it('deduplicating publisher invokes the delegate once per eventId', async () => {
    const calls: string[] = [];
    const delegate = { publish: async (event: { eventId: string }) => { calls.push(event.eventId); } };
    const publisher = new DeduplicatingOutboxPublisher(delegate);
    const event = createEvent('order.created', 1, 'a', 'ten', {}, { correlationId: '1' });
    await publisher.publish(event);
    await publisher.publish(event);
    expect(calls).toHaveLength(1);
  });
});