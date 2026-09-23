import { MongoInboxRepository, type InboxHandler, type InboxRepository, type InboxSubscription } from '@erp/outbox';
import { createLogger } from '@erp/shared';
import { MongoConnection } from '../connection.js';
import { workerConfig } from '../config.js';

interface Consumer extends InboxSubscription { readonly handle: InboxHandler; }
interface ProcessorOptions { readonly owner: string; readonly pollIntervalMs?: number; readonly batchSize?: number; }

/** No default consumers: registering a consumer requires a reviewed business rule. */
export class InboxProcessor {
  private static instance: InboxProcessor;
  private readonly consumers = new Map<string, Consumer>();
  private readonly logger = createLogger('inbox-worker');
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private running = false;
  private stopping = false;
  private timer?: ReturnType<typeof setTimeout>;
  private active?: Promise<void>;
  constructor(private readonly repository: () => Promise<InboxRepository>, private readonly options: ProcessorOptions) {
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
    this.batchSize = options.batchSize ?? 10;
    if (!options.owner.trim() || !Number.isSafeInteger(this.pollIntervalMs) || this.pollIntervalMs < 1 || !Number.isSafeInteger(this.batchSize) || this.batchSize < 1 || this.batchSize > 100) throw new Error('Invalid inbox processor options');
  }
  static getInstance(): InboxProcessor {
    return this.instance ??= new InboxProcessor(async () => new MongoInboxRepository(await MongoConnection.getInstance().connect(), {
      maxAttempts: workerConfig.maxRetries, retryDelayMs: workerConfig.retryDelayMs,
    }), { owner: workerConfig.workerId, pollIntervalMs: workerConfig.outboxPollIntervalMs });
  }
  register(consumer: Consumer): void {
    if (this.running) throw new Error('Register inbox consumers before starting');
    if (!consumer.consumerId.trim() || !consumer.eventName.trim() || !Number.isSafeInteger(consumer.eventVersion) || consumer.eventVersion < 1) throw new Error('Invalid inbox consumer');
    if (this.consumers.has(consumer.consumerId)) throw new Error('Duplicate inbox consumer');
    this.consumers.set(consumer.consumerId, consumer);
  }
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stopping = false;
    try { await this.processInbox(); } catch (error) { this.running = false; throw error; }
    this.schedule();
  }
  private schedule(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      try { await this.processInbox(); }
      catch { this.logger.error('Inbox poll failed'); }
      this.schedule();
    }, this.pollIntervalMs);
  }
  async stop(): Promise<void> {
    this.running = false;
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    await this.active;
  }
  processInbox(): Promise<void> {
    return this.active ??= this.processBatch().finally(() => { this.active = undefined; });
  }
  private async processBatch(): Promise<void> {
    if (!this.consumers.size) return;
    const repository = await this.repository();
    for (const consumer of this.consumers.values()) {
      if (this.stopping) break;
      await repository.enqueue(consumer, this.batchSize);
      for (let i = 0; i < this.batchSize; i++) {
        if (this.stopping) break;
        const claim = await repository.claim(consumer.consumerId, this.options.owner);
        if (!claim) break;
        const context = { eventId: claim.eventId, tenantId: claim.tenantId, consumerId: claim.consumerId, correlationId: claim.correlationId };
        try { await repository.complete(claim, consumer.handle); }
        catch {
          // Persist a bounded classification, not arbitrary exceptions containing payloads/secrets.
          const retained = await repository.fail(claim, 'Consumer execution failed');
          this.logger.warn(retained ? 'Consumer failed; retry or terminal state recorded' : 'Consumer lost lease; effects rolled back', context);
        }
      }
    }
  }
}
