import { Model, Document, Schema, model } from 'mongoose';
import { OutboxStatus } from '../shared/types.js';

export interface IOutboxDocument extends Document {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  publishedAt: Date | null;
  createdAt: Date;
  status: OutboxStatus;
  retryCount: number;
  maxRetries: number;
}

const OutboxSchema = new Schema<IOutboxDocument>({
  id: { type: String, required: true, unique: true },
  aggregateType: { type: String, required: true },
  aggregateId: { type: String, required: true },
  eventType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  publishedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'published', 'failed'], default: 'pending' },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 5 },
}, { timestamps: true });

OutboxSchema.index({ status: 1, createdAt: 1 });
OutboxSchema.index({ aggregateType: 1, aggregateId: 1 });

export const OutboxModel: Model<IOutboxDocument> = model<IOutboxDocument>('Outbox', OutboxSchema);