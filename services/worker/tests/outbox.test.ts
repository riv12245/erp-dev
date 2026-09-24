import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoInboxPublisher, MongoOutboxRepository, getOutboxModel, type OutboxPublisher } from '@erp/outbox';
import { eventToOutboxRecord } from '../../api/src/platform/outbox/mongo-outbox-repository.js';
import { OutboxProcessor } from '../src/outbox/outbox-processor.js';

describe('API to worker durable outbox', () => {
  let mongo: MongoMemoryReplSet;
  let connection: mongoose.Connection;
  let repo: MongoOutboxRepository;
  let now: Date;
  const event = (id: string, tenantId = 'tenant-a') => eventToOutboxRecord({
    eventId: id, tenantId, eventName: 'foundation.test', eventVersion: 1, aggregateId: 'aggregate-1',
    occurredAt: new Date(), correlationId: 'correlation-' + id, payload: { value: id },
  });
  const processor = (owner: string, publisher: OutboxPublisher = new MongoInboxPublisher(connection)) =>
    new OutboxProcessor(async () => repo, async () => publisher, { owner, batchSize: 1, pollIntervalMs: 10 });

  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    connection = await mongoose.createConnection(mongo.getUri(), { dbName: 'outbox_test' }).asPromise();
    await getOutboxModel(connection).init();
  }, 120_000);
  beforeEach(async () => {
    now = new Date();
    repo = new MongoOutboxRepository(connection, { now: () => now, leaseMs: 1000, maxAttempts: 2, retryDelayMs: 0 });
    await getOutboxModel(connection).deleteMany({});
    await connection.collection('event_inbox').deleteMany({});
  });
  afterAll(async () => { await connection?.close(); await mongo?.stop(); });

  it('delivers the API envelope durably with tenant and correlation intact', async () => {
    await repo.append(event('event-1'));
    await processor('worker-a').processOutbox();
    expect((await getOutboxModel(connection).findOne({ eventId: 'event-1' }))?.status).toBe('published');
    const delivered = await connection.collection('event_inbox').findOne({ eventId: 'event-1' });
    expect(delivered).toMatchObject({ tenantId: 'tenant-a', correlationId: 'correlation-event-1', status: 'pending', payload: { value: 'event-1' } });
  });

  it('lets two workers deliver events without duplicate inbox records', async () => {
    await Promise.all([repo.append(event('event-a')), repo.append(event('event-b', 'tenant-b'))]);
    await Promise.all([processor('worker-a').processOutbox(), processor('worker-b').processOutbox()]);
    expect(await connection.collection('event_inbox').countDocuments()).toBe(2);
    expect(await getOutboxModel(connection).countDocuments({ status: 'published' })).toBe(2);
  });

  it('fences expired owners and recovers delivery after a worker crash', async () => {
    await repo.append(event('recovered'));
    const [old] = await repo.claimBatch(1, 'old-worker');
    await new MongoInboxPublisher(connection).publish(old); // Crash after delivery, before acknowledgement.
    now = new Date(now.getTime() + 1001);
    const [current] = await repo.claimBatch(1, 'new-worker');
    expect(current.claimToken).not.toBe(old.claimToken);
    expect(await repo.markPublished(old)).toBe(false);
    expect(await repo.markFailed(old, 'stale failure')).toBe(false);
    await new MongoInboxPublisher(connection).publish(current); // New publisher instance after restart.
    expect(await repo.markPublished(current)).toBe(true);
    expect(await connection.collection('event_inbox').countDocuments()).toBe(1);
  });

  it('retains a failed delivery and retries it successfully', async () => {
    await repo.append(event('retry'));
    let attempts = 0;
    const inbox = new MongoInboxPublisher(connection);
    const p = processor('worker', { publish: async (record) => {
      if (++attempts === 1) throw new Error('temporary failure');
      await inbox.publish(record);
    } });
    await p.processOutbox();
    expect((await getOutboxModel(connection).findOne({ eventId: 'retry' }))?.status).toBe('failed');
    await p.processOutbox();
    expect(attempts).toBe(2);
    expect((await getOutboxModel(connection).findOne({ eventId: 'retry' }))?.status).toBe('published');
  });

  it('does not persist publisher exceptions that may contain credentials or payloads', async () => {
    await repo.append(event('redacted'));
    await processor('worker', { publish: async () => { throw new Error('secret credential'); } }).processOutbox();
    expect((await getOutboxModel(connection).findOne({ eventId: 'redacted' }))?.lastError).toBe('Delivery failed');
  });

  it('awaits active delivery on stop without claiming the next event', async () => {
    let release!: () => void;
    let began!: () => void;
    const started = new Promise<void>(resolve => { began = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const inbox = new MongoInboxPublisher(connection);
    const p = new OutboxProcessor(async () => repo, async () => ({ publish: async record => {
      began(); await gate; await inbox.publish(record);
    } }), { owner: 'shutdown', batchSize: 10, pollIntervalMs: 10 });
    await repo.append(event('first'));
    const starting = p.start();
    try {
      await started;
      await repo.append(event('waiting'));
      const stopping = p.stop();
      release();
      await Promise.all([starting, stopping]);
      expect(await getOutboxModel(connection).countDocuments({ status: 'published' })).toBe(1);
      expect(await repo.countPending()).toBe(1);
    } finally { release(); await p.stop(); }
  });

  it('bounds retries, including workers that repeatedly crash with a lease', async () => {
    await repo.append(event('exhausted'));
    await repo.claimBatch(1, 'worker-a');
    now = new Date(now.getTime() + 1001);
    await repo.claimBatch(1, 'worker-b');
    now = new Date(now.getTime() + 1001);
    expect(await repo.claimBatch(1, 'worker-c')).toEqual([]);
    expect(await repo.countPending()).toBe(0);
    expect((await getOutboxModel(connection).findOne({ eventId: 'exhausted' }))?.status).toBe('failed');
  });

  it('rolls business and outbox writes back together in the same session', async () => {
    await connection.createCollection('business_test');
    const session = await connection.startSession();
    try {
      await expect(session.withTransaction(async () => {
        await connection.collection('business_test').insertOne({ name: 'rollback' }, { session });
        await repo.append(event('rollback'), session);
        throw new Error('rollback');
      })).rejects.toThrow('rollback');
      expect(await connection.collection('business_test').countDocuments()).toBe(0);
      expect(await getOutboxModel(connection).countDocuments({ eventId: 'rollback' })).toBe(0);
    } finally { await session.endSession(); }
  });

  it('keeps polling for events appended after start and stops cleanly', async () => {
    const p = processor('poller');
    await p.start();
    try {
      await repo.append(event('later'));
      await vi.waitFor(async () => expect((await getOutboxModel(connection).findOne({ eventId: 'later' }))?.status).toBe('published'), { timeout: 5000 });
    } finally { await p.stop(); }
  });
});
