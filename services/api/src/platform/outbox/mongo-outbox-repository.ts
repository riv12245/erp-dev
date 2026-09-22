import mongoose from 'mongoose';
import { EventEnvelope } from '../events/domain-event.js';

export interface OutboxRecord {
  readonly eventId: string;
  readonly eventName: string;
  readonly eventVersion: number;
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly status: 'pending' | 'processing' | 'published' | 'failed';
  readonly attempts: number;
  readonly lastError?: string;
}

export interface OutboxRepository {
  readonly append: (record: OutboxRecord) => Promise<void>;
  readonly claimBatch: (limit: number, owner: string) => Promise<OutboxRecord[]>;
  readonly markPublished: (eventId: string) => Promise<void>;
  readonly markFailed: (eventId: string, error: string) => Promise<void>;
  readonly countPending: (tenantId?: string) => Promise<number>;
}

const outboxSchema = new mongoose.Schema<OutboxRecord>(
  {
    eventId: { type: String, required: true, unique: true },
    eventName: { type: String, required: true, index: true },
    eventVersion: { type: Number, required: true },
    aggregateId: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    occurredAt: { type: Date, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    correlationId: { type: String, required: true },
    causationId: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'published', 'failed'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true, collection: 'outbox' },
);

export interface OutboxDocument extends mongoose.Document {
  eventId: string;
  eventName: string;
  eventVersion: number;
  aggregateId: string;
  tenantId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
  correlationId: string;
  causationId?: string;
  status: 'pending' | 'processing' | 'published' | 'failed';
  attempts: number;
  lastError?: string;
}

export function getOutboxModel(connection: mongoose.Connection): mongoose.Model<OutboxDocument> {
  return (
    (connection.models.Outbox as mongoose.Model<OutboxDocument>) ??
    (connection.model('Outbox', outboxSchema) as unknown as mongoose.Model<OutboxDocument>)
  );
}

/** Converts an EventEnvelope into a storable outbox record. */
export function eventToOutboxRecord(event: EventEnvelope): OutboxRecord {
  return {
    eventId: event.eventId,
    eventName: event.eventName,
    eventVersion: event.eventVersion,
    aggregateId: event.aggregateId,
    tenantId: event.tenantId,
    occurredAt: event.occurredAt,
    payload: event.payload,
    correlationId: event.correlationId,
    causationId: event.causationId,
    status: 'pending',
    attempts: 0,
  };
}

/** Mongo-backed outbox implementation. Events are appended atomically with business writes. */
export class MongoOutboxRepository implements OutboxRepository {
  constructor(private readonly connection: mongoose.Connection) {}

  private get model(): mongoose.Model<OutboxDocument> {
    return getOutboxModel(this.connection);
  }

  async append(record: OutboxRecord): Promise<void> {
    await this.model.create(record as unknown as Record<string, unknown>);
  }

  async claimBatch(limit: number, _owner: string): Promise<OutboxRecord[]> {
    const now = new Date();
    const docs = await this.model
      .find({ status: { $in: ['pending', 'failed'] }, attempts: { $lt: 5 } })
      .sort({ occurredAt: 1 })
      .limit(limit);
    await this.model.updateMany(
      { eventId: { $in: docs.map((d) => d.eventId) } },
      { $set: { status: 'processing', lastError: undefined, updatedAt: now } },
    );
    return docs.map(toRecord);
  }

  async markPublished(eventId: string): Promise<void> {
    await this.model.updateOne({ eventId }, { $set: { status: 'published' }, $inc: { attempts: 1 } });
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    await this.model.updateOne({ eventId }, { $set: { status: 'failed', lastError: error }, $inc: { attempts: 1 } });
  }

  async countPending(tenantId?: string): Promise<number> {
    const filter: mongoose.FilterQuery<OutboxDocument> = { status: { $in: ['pending', 'failed'] } };
    if (tenantId) filter.tenantId = tenantId;
    return this.model.countDocuments(filter);
  }
}

function toRecord(doc: OutboxDocument): OutboxRecord {
  return {
    eventId: doc.eventId,
    eventName: doc.eventName,
    eventVersion: doc.eventVersion,
    aggregateId: doc.aggregateId,
    tenantId: doc.tenantId,
    occurredAt: doc.occurredAt,
    payload: doc.payload,
    correlationId: doc.correlationId,
    causationId: doc.causationId,
    status: doc.status,
    attempts: doc.attempts,
    lastError: doc.lastError,
  };
}