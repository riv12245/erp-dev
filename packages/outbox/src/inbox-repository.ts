import { randomUUID } from 'node:crypto';
import mongoose, { type ClientSession, type Connection } from 'mongoose';
import type { EventEnvelope } from './types.js';
import type { OutboxOptions } from './repository.js';

export interface InboxSubscription {
  readonly consumerId: string;
  readonly eventName: string;
  readonly eventVersion: number;
}
export type InboxStatus = 'pending' | 'processing' | 'retrying' | 'succeeded' | 'failed';
export interface InboxConsumption extends EventEnvelope {
  readonly consumerId: string;
  readonly status: InboxStatus;
  readonly attempts: number;
  readonly receivedAt: Date;
  readonly availableAt: Date;
  readonly owner?: string;
  readonly claimToken?: string;
  readonly lockedUntil?: Date;
  readonly lastError?: string;
  readonly lastAttemptAt?: Date;
  readonly succeededAt?: Date;
  readonly failedAt?: Date;
}
export interface InboxClaim extends InboxConsumption {
  readonly owner: string;
  readonly claimToken: string;
  readonly lockedUntil: Date;
}
/** Only transactional Mongo effects using this session; callbacks can be replayed. */
export type InboxHandler = (event: EventEnvelope, session: ClientSession) => Promise<void>;
export interface InboxRepository {
  enqueue(subscription: InboxSubscription, limit?: number): Promise<number>;
  claim(consumerId: string, owner: string): Promise<InboxClaim | null>;
  complete(claim: InboxClaim, handler: InboxHandler): Promise<void>;
  fail(claim: InboxClaim, error: string): Promise<boolean>;
  metrics(consumerId: string, tenantId?: string): Promise<Record<InboxStatus, number>>;
}

const schema = new mongoose.Schema<InboxConsumption>({
  eventId: { type: String, required: true }, tenantId: { type: String, required: true },
  consumerId: { type: String, required: true }, eventName: { type: String, required: true },
  eventVersion: { type: Number, required: true }, aggregateId: { type: String, required: true },
  occurredAt: { type: Date, required: true }, correlationId: { type: String, required: true }, causationId: String,
  payload: { type: mongoose.Schema.Types.Mixed, required: true }, receivedAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'processing', 'retrying', 'succeeded', 'failed'], required: true },
  attempts: { type: Number, required: true, min: 0 }, availableAt: { type: Date, required: true },
  owner: String, claimToken: String, lockedUntil: Date, lastError: String,
  lastAttemptAt: Date, succeededAt: Date, failedAt: Date,
}, { timestamps: true, collection: 'event_inbox_consumptions' });
schema.index({ tenantId: 1, eventId: 1, consumerId: 1 }, { unique: true });
schema.index({ consumerId: 1, status: 1, availableAt: 1, occurredAt: 1 });
schema.index({ consumerId: 1, status: 1, lockedUntil: 1 });

export class MongoInboxRepository implements InboxRepository {
  private readonly model: mongoose.Model<InboxConsumption>;
  private readonly leaseMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly now: () => Date;

  constructor(private readonly connection: Connection, options: OutboxOptions = {}) {
    this.model = (connection.models.InboxConsumption as mongoose.Model<InboxConsumption>) ??
      connection.model<InboxConsumption>('InboxConsumption', schema);
    this.leaseMs = options.leaseMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.now = options.now ?? (() => new Date());
    for (const [key, value] of Object.entries({ leaseMs: this.leaseMs, maxAttempts: this.maxAttempts, retryDelayMs: this.retryDelayMs })) {
      if (!Number.isSafeInteger(value) || value < (key === 'retryDelayMs' ? 0 : 1)) throw new Error(`Invalid inbox ${key}`);
    }
  }

  async enqueue(subscription: InboxSubscription, limit = 100): Promise<number> {
    if (!subscription.consumerId.trim() || !subscription.eventName.trim() || !Number.isSafeInteger(subscription.eventVersion) ||
      subscription.eventVersion < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid inbox subscription');
    await this.model.init();
    // Worker-only cross-tenant fan-out. Match the entire tenant/event/consumer key.
    const events = await this.connection.collection<EventEnvelope & { receivedAt: Date }>('event_inbox').aggregate<EventEnvelope & { receivedAt: Date }>([
      { $match: { eventName: subscription.eventName, eventVersion: subscription.eventVersion } },
      { $sort: { receivedAt: 1, eventId: 1 } },
      { $lookup: { from: 'event_inbox_consumptions', let: { tenant: '$tenantId', event: '$eventId' }, pipeline: [
        { $match: { consumerId: subscription.consumerId, $expr: { $and: [
          { $eq: ['$tenantId', '$$tenant'] }, { $eq: ['$eventId', '$$event'] },
        ] } } }, { $limit: 1 },
      ], as: 'consumptions' } },
      { $match: { consumptions: { $size: 0 } } }, { $limit: limit },
      { $project: { _id: 0, consumptions: 0, status: 0, __v: 0 } },
    ]).toArray();
    let inserted = 0;
    for (const event of events) {
      const key = { tenantId: event.tenantId, eventId: event.eventId, consumerId: subscription.consumerId };
      try {
        const result = await this.model.updateOne(key, { $setOnInsert: {
          ...event, ...key, status: 'pending', attempts: 0, availableAt: this.now(),
        } }, { upsert: true, runValidators: true });
        inserted += result.upsertedCount;
      } catch (error) {
        if (!(error instanceof mongoose.mongo.MongoServerError && error.code === 11000) || !await this.model.exists(key)) throw error;
      }
    }
    return inserted;
  }

  async claim(consumerId: string, owner: string): Promise<InboxClaim | null> {
    if (!consumerId.trim() || !owner.trim()) throw new Error('Invalid inbox claim');
    await this.model.init();
    const now = this.now();
    await this.model.updateMany({ consumerId, status: 'processing', attempts: { $gte: this.maxAttempts }, lockedUntil: { $lte: now } }, {
      $set: { status: 'failed', failedAt: now, lastError: 'Lease expired after maximum attempts' },
      $unset: { owner: 1, claimToken: 1, lockedUntil: 1 },
    });
    return await this.model.findOneAndUpdate({ consumerId, attempts: { $lt: this.maxAttempts }, $or: [
      { status: { $in: ['pending', 'retrying'] }, availableAt: { $lte: now } },
      { status: 'processing', lockedUntil: { $lte: now } },
    ] }, { $set: { status: 'processing', owner, claimToken: randomUUID(),
      lockedUntil: new Date(now.getTime() + this.leaseMs), lastAttemptAt: now }, $inc: { attempts: 1 } },
    { new: true, sort: { occurredAt: 1, eventId: 1 } }).lean().exec() as InboxClaim | null;
  }

  private owned(claim: InboxClaim): mongoose.FilterQuery<InboxConsumption> {
    return { tenantId: claim.tenantId, eventId: claim.eventId, consumerId: claim.consumerId, status: 'processing',
      owner: claim.owner, claimToken: claim.claimToken, lockedUntil: { $gt: this.now() } };
  }

  async complete(claim: InboxClaim, handler: InboxHandler): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        // Take a write lock before effects; a concurrent reclaim conflicts and aborts this transaction.
        const record = await this.model.findOneAndUpdate(this.owned(claim), { $set: { lastAttemptAt: this.now() } },
          { new: true, session }).lean().exec();
        if (!record) throw new Error('Inbox lease lost');
        // Pass the persisted envelope, never fields supplied by a stale or modified claim.
        const { eventId, tenantId, eventName, eventVersion, aggregateId, occurredAt, correlationId, causationId, payload } = record;
        await handler({ eventId, tenantId, eventName, eventVersion, aggregateId, occurredAt, correlationId, causationId, payload }, session);
        const result = await this.model.updateOne(this.owned(claim), {
          $set: { status: 'succeeded', succeededAt: this.now() },
          $unset: { owner: 1, claimToken: 1, lockedUntil: 1, lastError: 1 },
        }, { session });
        if (result.modifiedCount !== 1) throw new Error('Inbox lease lost');
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
  }

  async fail(claim: InboxClaim, error: string): Promise<boolean> {
    const terminal = claim.attempts >= this.maxAttempts;
    const now = this.now();
    const delay = Math.min(this.retryDelayMs * 2 ** Math.min(claim.attempts - 1, 52), 3_600_000);
    const result = await this.model.updateOne(this.owned(claim), {
      $set: { status: terminal ? 'failed' : 'retrying', lastError: error.slice(0, 1000),
        availableAt: new Date(now.getTime() + delay), ...(terminal ? { failedAt: now } : {}) },
      $unset: { owner: 1, claimToken: 1, lockedUntil: 1 },
    });
    return result.modifiedCount === 1;
  }

  async metrics(consumerId: string, tenantId?: string): Promise<Record<InboxStatus, number>> {
    if (!consumerId.trim() || (tenantId !== undefined && !tenantId.trim())) throw new Error('Invalid inbox metrics scope');
    const result: Record<InboxStatus, number> = { pending: 0, processing: 0, retrying: 0, succeeded: 0, failed: 0 };
    const counts = await this.model.aggregate<{ _id: InboxStatus; count: number }>([
      { $match: { consumerId, ...(tenantId ? { tenantId } : {}) } }, { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    for (const row of counts) result[row._id] = row.count;
    return result;
  }
}
