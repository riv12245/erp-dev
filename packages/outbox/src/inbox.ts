import mongoose, { type Connection } from 'mongoose';
import type { EventEnvelope, OutboxPublisher } from './types.js';

const schema = new mongoose.Schema({
  eventId: { type: String, required: true }, tenantId: { type: String, required: true },
  eventName: { type: String, required: true }, eventVersion: { type: Number, required: true },
  aggregateId: { type: String, required: true }, occurredAt: { type: Date, required: true },
  correlationId: { type: String, required: true }, causationId: String,
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  receivedAt: { type: Date, required: true },
  status: { type: String, enum: ['pending'], default: 'pending' },
}, { collection: 'event_inbox' });
schema.index({ tenantId: 1, eventId: 1 }, { unique: true });

/** Durable delivery only. Business handling is explicitly still pending in the inbox. */
export class MongoInboxPublisher implements OutboxPublisher {
  constructor(private readonly connection: Connection) {}
  async publish(event: EventEnvelope): Promise<void> {
    const model = this.connection.models.EventInbox ?? this.connection.model('EventInbox', schema);
    await model.init();
    try {
      await model.updateOne({ tenantId: event.tenantId, eventId: event.eventId }, {
        $setOnInsert: { ...event, receivedAt: new Date(), status: 'pending' },
      }, { upsert: true, runValidators: true });
    } catch (error) {
      if (!(error instanceof mongoose.mongo.MongoServerError && error.code === 11000)) throw error;
      // Concurrent deliveries raced on the unique inbox key; the first durable insert wins.
      if (!await model.exists({ tenantId: event.tenantId, eventId: event.eventId })) throw error;
    }
  }
}
