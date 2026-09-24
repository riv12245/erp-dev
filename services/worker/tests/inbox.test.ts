import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import * as outbox from '../../../packages/outbox/src/index.js';
import { InboxProcessor } from '../src/outbox/inbox-processor.js';

describe('durable transactional inbox consumption', () => {
  let mongo: MongoMemoryReplSet;
  let connection: mongoose.Connection;
  let now: Date;
  const event = (tenantId = 'tenant-a') => ({ eventId: 'event-1', tenantId, eventName: 'test.effect', eventVersion: 1,
    aggregateId: 'aggregate', occurredAt: new Date(), correlationId: 'trace', payload: { value: 1 } });
  const consumer = { consumerId: 'test-consumer', eventName: 'test.effect', eventVersion: 1 };
  const repository = (retryDelayMs = 100) => new outbox.MongoInboxRepository(connection, {
    now: () => now, leaseMs: 1000, maxAttempts: 2, retryDelayMs,
  });
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    connection = await mongoose.createConnection(mongo.getUri(), { dbName: 'inbox_test' }).asPromise();
    await connection.createCollection('test_effects');
  }, 120_000);
  beforeEach(async () => {
    now = new Date();
    for (const name of ['event_inbox', 'event_inbox_consumptions', 'test_effects']) await connection.collection(name).deleteMany({});
  });
  afterAll(async () => { await connection?.close(); await mongo?.stop(); });

  it('deduplicates concurrent deliveries per tenant, event and consumer without consuming unsupported events', async () => {
    const publisher = new outbox.MongoInboxPublisher(connection);
    await Promise.all([publisher.publish(event()), publisher.publish(event()), publisher.publish(event('tenant-b'))]);
    await publisher.publish({ ...event(), eventId: 'unsupported', eventName: 'other' });
    const repo = repository();
    await Promise.all([repo.enqueue(consumer), repo.enqueue(consumer)]);
    await repo.enqueue({ ...consumer, consumerId: 'second-consumer' });
    expect(await connection.collection('event_inbox_consumptions').countDocuments()).toBe(4);
    const claims = await Promise.all([repo.claim(consumer.consumerId, 'one'), repo.claim(consumer.consumerId, 'two'), repo.claim(consumer.consumerId, 'three')]);
    expect(claims.filter(Boolean)).toHaveLength(2);
    expect(new Set(claims.filter(Boolean).map(c => c!.tenantId)).size).toBe(2);
  });

  it('rolls effects back on failure, persists backoff, then commits once after retry and duplicate delivery', async () => {
    await new outbox.MongoInboxPublisher(connection).publish(event());
    const repo = repository();
    await repo.enqueue(consumer);
    const first = (await repo.claim(consumer.consumerId, 'one'))!;
    await expect(repo.complete(first, async (_event, session) => {
      await connection.collection('test_effects').insertOne({ tenantId: first.tenantId }, { session });
      throw new Error('effect failed');
    })).rejects.toThrow('effect failed');
    expect(await connection.collection('test_effects').countDocuments()).toBe(0);
    expect(await repo.fail(first, 'effect failed')).toBe(true);
    expect(await repo.claim(consumer.consumerId, 'two')).toBeNull();
    now = new Date(now.getTime() + 100);
    const second = (await repo.claim(consumer.consumerId, 'two'))!;
    await repo.complete(second, async (envelope, session) => {
      await connection.collection('test_effects').insertOne({ tenantId: envelope.tenantId }, { session });
    });
    await expect(repository().complete(second, async (_event, session) => {
      await connection.collection('test_effects').insertOne({ duplicate: true }, { session });
    })).rejects.toThrow('Inbox lease lost');
    await new outbox.MongoInboxPublisher(connection).publish(event());
    await repo.enqueue(consumer);
    expect(await repo.claim(consumer.consumerId, 'three')).toBeNull();
    expect(await connection.collection('test_effects').countDocuments()).toBe(1);
    expect(await repo.metrics(consumer.consumerId)).toMatchObject({ succeeded: 1, failed: 0, processing: 0 });
  });

  it('fences crashed owners after reclaim and retains terminal failures', async () => {
    await new outbox.MongoInboxPublisher(connection).publish(event());
    const repo = repository();
    await repo.enqueue(consumer);
    const first = (await repo.claim(consumer.consumerId, 'one'))!;
    now = new Date(now.getTime() + 1001);
    const second = (await repo.claim(consumer.consumerId, 'two'))!;
    expect(second.claimToken).not.toBe(first.claimToken);
    let ran = false;
    await expect(repo.complete(first, async () => { ran = true; })).rejects.toThrow('Inbox lease lost');
    expect(ran).toBe(false);
    expect(await repo.fail(first, 'stale')).toBe(false);
    now = new Date(now.getTime() + 1001);
    expect(await repo.claim(consumer.consumerId, 'three')).toBeNull();
    expect(await repo.metrics(consumer.consumerId)).toMatchObject({ failed: 1, processing: 0 });
    expect(await connection.collection('event_inbox_consumptions').findOne({ consumerId: consumer.consumerId })).toMatchObject({
      status: 'failed', attempts: 2, lastError: 'Lease expired after maximum attempts',
    });
  });

  it('commits only one effect when two executions race using the same claim', async () => {
    await new outbox.MongoInboxPublisher(connection).publish(event());
    const repo = repository();
    await repo.enqueue(consumer);
    const claim = (await repo.claim(consumer.consumerId, 'one'))!;
    const effect: outbox.InboxHandler = async (envelope, session) => {
      await connection.collection('test_effects').insertOne({ tenantId: envelope.tenantId }, { session });
    };
    const executions = await Promise.allSettled([repo.complete(claim, effect), repository().complete(claim, effect)]);
    expect(executions.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(executions.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(await connection.collection('test_effects').countDocuments()).toBe(1);
    expect(await repo.metrics(consumer.consumerId, 'tenant-a')).toMatchObject({ succeeded: 1 });
    expect(await repo.metrics(consumer.consumerId, 'tenant-b')).toMatchObject({ succeeded: 0 });
  });

  it('rolls back effects when a lease expires during the transaction', async () => {
    await new outbox.MongoInboxPublisher(connection).publish(event());
    const repo = repository();
    await repo.enqueue(consumer);
    const claim = (await repo.claim(consumer.consumerId, 'one'))!;
    await expect(repo.complete(claim, async (_event, session) => {
      await connection.collection('test_effects').insertOne({ tenantId: claim.tenantId }, { session });
      now = new Date(now.getTime() + 1001);
    })).rejects.toThrow('Inbox lease lost');
    expect(await connection.collection('test_effects').countDocuments()).toBe(0);
  });

  it('polls registered consumers, awaits in-flight effects on stop and leaves unregistered events pending', async () => {
    const repo = repository();
    let release!: () => void;
    let began!: () => void;
    const started = new Promise<void>(resolve => { began = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const processor = new InboxProcessor(async () => repo, { owner: 'worker', pollIntervalMs: 10 });
    processor.register({ ...consumer, handle: async (envelope, session) => {
      began();
      await gate;
      await connection.collection('test_effects').insertOne({ tenantId: envelope.tenantId }, { session });
    } });
    await processor.start();
    try {
      await new outbox.MongoInboxPublisher(connection).publish(event());
      await started;
      await new outbox.MongoInboxPublisher(connection).publish({ ...event(), eventId: 'waiting' });
      await repo.enqueue(consumer);
      let stopped = false;
      const stopping = processor.stop().then(() => { stopped = true; });
      expect(stopped).toBe(false);
      release();
      await stopping;
      expect(await repo.metrics(consumer.consumerId)).toMatchObject({ succeeded: 1 });
      expect(await connection.collection('test_effects').countDocuments()).toBe(1);
      await new outbox.MongoInboxPublisher(connection).publish({ ...event(), eventId: 'later', eventName: 'unregistered' });
      expect(await connection.collection('event_inbox_consumptions').countDocuments()).toBe(2);
    } finally { release(); await processor.stop(); }
  });

  it('records worker failure and rejects ambiguous duplicate registrations', async () => {
    const repo = repository(0);
    const processor = new InboxProcessor(async () => repo, { owner: 'worker', pollIntervalMs: 10 });
    processor.register({ ...consumer, handle: async () => { throw new Error('handler unavailable'); } });
    expect(() => processor.register({ ...consumer, handle: async () => { throw new Error('duplicate'); } })).toThrow('Duplicate inbox consumer');
    await new outbox.MongoInboxPublisher(connection).publish(event());
    await processor.start();
    try {
      await vi.waitFor(async () => expect(await repo.metrics(consumer.consumerId)).toMatchObject({ failed: 1 }), { timeout: 5000 });
      expect(await connection.collection('test_effects').countDocuments()).toBe(0);
    } finally { await processor.stop(); }
  });
});
