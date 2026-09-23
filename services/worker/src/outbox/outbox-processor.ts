import { MongoOutboxRepository, MongoInboxPublisher, type OutboxRepository, type OutboxPublisher } from '@erp/outbox';
import { createLogger } from '@erp/shared';
import { MongoConnection } from '../connection.js';
import { workerConfig } from '../config.js';

interface ProcessorOptions { readonly owner: string; readonly pollIntervalMs?: number; readonly batchSize?: number; }

/** At-least-once delivery with atomic claims and a durable idempotent inbox. */
export class OutboxProcessor {
  private static instance: OutboxProcessor;
  private running = false;
  private stopping = false;
  private timer?: ReturnType<typeof setTimeout>;
  private active?: Promise<void>;
  private readonly logger = createLogger('outbox-worker');
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;

  constructor(
    private readonly repository: () => Promise<OutboxRepository>,
    private readonly publisher: () => Promise<OutboxPublisher>,
    private readonly options: ProcessorOptions,
  ) {
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
    this.batchSize = options.batchSize ?? 10;
    if (!options.owner.trim() || !Number.isSafeInteger(this.pollIntervalMs) || this.pollIntervalMs < 1 ||
      !Number.isSafeInteger(this.batchSize) || this.batchSize < 1 || this.batchSize > 100) throw new Error('Invalid outbox processor options');
  }

  static getInstance(): OutboxProcessor {
    if (!this.instance) {
      const db = MongoConnection.getInstance();
      this.instance = new OutboxProcessor(
        async () => new MongoOutboxRepository(await db.connect(), { maxAttempts: workerConfig.maxRetries, retryDelayMs: workerConfig.retryDelayMs }),
        async () => new MongoInboxPublisher(await db.connect()),
        { owner: workerConfig.workerId, pollIntervalMs: workerConfig.outboxPollIntervalMs },
      );
    }
    return this.instance;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stopping = false;
    try { await this.processOutbox(); } catch (error) { this.running = false; throw error; }
    this.schedule();
  }

  private schedule(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      try { await this.processOutbox(); }
      catch { this.logger.error('Outbox poll failed'); }
      this.schedule();
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    this.running = false;
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    await this.active;
  }

  processOutbox(): Promise<void> {
    if (this.active) return this.active;
    this.active = this.processBatch().finally(() => { this.active = undefined; });
    return this.active;
  }

  private async processBatch(): Promise<void> {
    const repository = await this.repository();
    const publisher = await this.publisher();
    for (let i = 0; i < this.batchSize; i++) {
      if (this.stopping) break;
      // Claim only the event being handled so queued work cannot exhaust its lease.
      const [claim] = await repository.claimBatch(1, this.options.owner);
      if (!claim) break;
      const context = { eventId: claim.eventId, tenantId: claim.tenantId, correlationId: claim.correlationId };
      try {
        await publisher.publish(claim);
        const acknowledged = await repository.markPublished(claim);
        if (!acknowledged) this.logger.warn('Delivery completed after lease ownership changed', context);
      } catch {
        await repository.markFailed(claim, 'Delivery failed');
        this.logger.warn('Delivery failed; event retained for retry', context);
      }
    }
  }
}
