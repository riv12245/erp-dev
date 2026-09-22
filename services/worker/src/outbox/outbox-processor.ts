import { Document } from 'mongoose';
import { OutboxMessage, OutboxStatus } from '../shared/types.js';
import { OutboxProcessingError } from '../errors.js';
import { EventSchemaValidator } from '../events/event-schema-validator.js';
import { MongoConnection } from '../connection.js';
import { RetryService } from '../retry.js';
import { IdempotencyService } from '../idempotency.js';
import { OutboxModel } from './outbox-repository.js';

export class OutboxProcessor {
  private static instance: OutboxProcessor;
  private isRunning: boolean = false;
  private readonly db: MongoConnection;
  private readonly retryService: RetryService;
  private readonly idempotencyService: IdempotencyService;
  private readonly validator: EventSchemaValidator;

  private constructor() {
    this.db = MongoConnection.getInstance();
    this.retryService = RetryService.getInstance();
    this.idempotencyService = IdempotencyService.getInstance();
    this.validator = EventSchemaValidator.getInstance();
  }

  static getInstance(): OutboxProcessor {
    if (!OutboxProcessor.instance) {
      OutboxProcessor.instance = new OutboxProcessor();
    }
    return OutboxProcessor.instance;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.info('OutboxProcessor started');
    await this.processOutbox();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.info('OutboxProcessor stopped');
  }

  async processOutbox(): Promise<void> {
    if (!this.isRunning) return;

    await this.db.connect();
    const pendingMessages = await OutboxModel.find({ status: 'pending' })
      .limit(10)
      .sort({ createdAt: 1 });

    for (const doc of pendingMessages) {
      await this.processMessage(doc);
    }
  }

  private async processMessage(doc: IOutboxDocument): Promise<void> {
    const message = this.toOutboxMessage(doc);

    try {
      const isDuplicate = await this.idempotencyService.has(message.id);
      if (isDuplicate) {
        await this.markPublished(message.id);
        return;
      }

      await this.retryService.executeWithRetry(async () => {
        await this.publishMessage(message);
      });

      await this.markPublished(message.id);
    } catch (error) {
      await this.markFailed(message.id, (error as Error).message);
    }
  }

  private async publishMessage(message: OutboxMessage): Promise<void> {
    const isValid = await this.validator.validate({ eventType: message.eventType, data: message.payload });
    if (!isValid) {
      throw new OutboxProcessingError('Invalid event schema', message.id);
    }

    console.info(`Publishing outbox message: ${message.id} of type ${message.eventType}`);
  }

  private async markPublished(id: string): Promise<void> {
    await OutboxModel.updateOne({ id }, { $set: { status: 'published', publishedAt: new Date() } });
  }

  private async markFailed(id: string, _error: string): Promise<void> {
    const doc = await OutboxModel.findOne({ id });
    await OutboxModel.updateOne(
      { id },
      { $set: { status: 'failed', retryCount: (doc?.retryCount || 0) + 1 } }
    );
  }

  private toOutboxMessage(doc: IOutboxDocument): OutboxMessage {
    return {
      id: doc.id,
      aggregateType: doc.aggregateType,
      aggregateId: doc.aggregateId,
      eventType: doc.eventType,
      payload: doc.payload,
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
      status: doc.status,
      retryCount: doc.retryCount,
      maxRetries: doc.maxRetries,
    };
  }
}

interface IOutboxDocument extends Document {
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