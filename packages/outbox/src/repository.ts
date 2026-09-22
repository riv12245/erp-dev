import { randomUUID } from 'node:crypto';
import mongoose, { type ClientSession, type Connection } from 'mongoose';
import type { OutboxClaim, OutboxRecord, OutboxRepository } from './types.js';

const schema = new mongoose.Schema<OutboxRecord>({
  eventId: { type: String, required: true, unique: true },
  eventName: { type: String, required: true },
  eventVersion: { type: Number, required: true, min: 1 },
  aggregateId: { type: String, required: true },
  tenantId: { type: String, required: true },
  occurredAt: { type: Date, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  correlationId: { type: String, required: true },
  causationId: String,
  status: { type: String, enum: ['pending', 'processing', 'published', 'failed'], required: true },
  attempts: { type: Number, required: true, min: 0 },
  owner: String,
  claimToken: String,
  lockedUntil: Date,
  availableAt: Date,
  publishedAt: Date,
  lastError: String,
}, { timestamps: true, collection: 'outbox' });
schema.index({ status: 1, availableAt: 1, occurredAt: 1 });
schema.index({ status: 1, lockedUntil: 1 });
schema.index({ tenantId: 1, status: 1 });

export type OutboxDocument = mongoose.HydratedDocument<OutboxRecord>;
export function getOutboxModel(connection: Connection): mongoose.Model<OutboxRecord> {
  return (connection.models.Outbox as mongoose.Model<OutboxRecord>) ?? connection.model<OutboxRecord>('Outbox', schema);
}

export interface OutboxOptions {
  readonly leaseMs?: number;
  readonly maxAttempts?: number;
  readonly retryDelayMs?: number;
  readonly now?: () => Date;
}

/** Infrastructure-only queue. Requests never supply the worker's ownership token. */
export class MongoOutboxRepository implements OutboxRepository {
  private readonly leaseMs: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMs: number;
  private readonly now: () => Date;
  constructor(private readonly connection: Connection, options: OutboxOptions = {}) {
    this.leaseMs = options.leaseMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryDelayMs = options.retryDelayMs ?? 1_000;
    this.now = options.now ?? (() => new Date());
    for (const [key, value] of Object.entries({ leaseMs: this.leaseMs, maxAttempts: this.maxAttempts, retryDelayMs: this.retryDelayMs })) {
      if (!Number.isSafeInteger(value) || value < (key === 'retryDelayMs' ? 0 : 1)) throw new Error(`Invalid outbox ${key}`);
    }
  }
  private get model(): mongoose.Model<OutboxRecord> { return getOutboxModel(this.connection); }

  async append(record: OutboxRecord, session?: ClientSession): Promise<void> {
    await this.model.init();
    // Callers pass their business transaction session to make both writes atomic.
    await this.model.create([record], { session });
  }

  async claimBatch(limit: number, owner: string): Promise<OutboxClaim[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !owner.trim()) throw new Error('Invalid outbox claim');
    const claims: OutboxClaim[] = [];
    const now = this.now();
    await this.model.updateMany({ status: 'processing', attempts: { $gte: this.maxAttempts }, lockedUntil: { $lte: now } }, {
      $set: { status: 'failed', lastError: 'Lease expired after maximum attempts' },
      $unset: { owner: 1, claimToken: 1, lockedUntil: 1 },
    });
    for (let i = 0; i < limit; i++) {
      const claim = await this.model.findOneAndUpdate({
        attempts: { $lt: this.maxAttempts },
        $or: [
          { status: { $in: ['pending', 'failed'] }, $or: [{ availableAt: { $exists: false } }, { availableAt: { $lte: now } }] },
          { status: 'processing', lockedUntil: { $lte: now } },
        ],
      }, {
        $set: { status: 'processing', owner, claimToken: randomUUID(), lockedUntil: new Date(now.getTime() + this.leaseMs) },
        $inc: { attempts: 1 }, $unset: { lastError: 1 },
      }, { new: true, sort: { occurredAt: 1, eventId: 1 } }).lean().exec();
      if (!claim) break;
      claims.push(claim as OutboxClaim);
    }
    return claims;
  }

  private owned(claim: OutboxClaim): mongoose.FilterQuery<OutboxRecord> {
    return { eventId: claim.eventId, tenantId: claim.tenantId, status: 'processing', owner: claim.owner,
      claimToken: claim.claimToken, lockedUntil: { $gt: this.now() } };
  }

  async markPublished(claim: OutboxClaim): Promise<boolean> {
    const result = await this.model.updateOne(this.owned(claim), {
      $set: { status: 'published', publishedAt: this.now() },
      $unset: { owner: 1, claimToken: 1, lockedUntil: 1, lastError: 1, availableAt: 1 },
    });
    return result.modifiedCount === 1;
  }

  async markFailed(claim: OutboxClaim, error: string): Promise<boolean> {
    const delay = Math.min(this.retryDelayMs * 2 ** (claim.attempts - 1), 3_600_000);
    const result = await this.model.updateOne(this.owned(claim), {
      $set: { status: 'failed', lastError: error.slice(0, 1000), availableAt: new Date(this.now().getTime() + delay) },
      $unset: { owner: 1, claimToken: 1, lockedUntil: 1 },
    });
    return result.modifiedCount === 1;
  }

  async countPending(tenantId?: string): Promise<number> {
    return this.model.countDocuments({ status: { $in: ['pending', 'failed'] }, attempts: { $lt: this.maxAttempts }, ...(tenantId ? { tenantId } : {}) });
  }
}
