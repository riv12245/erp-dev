import { DomainEvent } from '../shared/types.js';
import { IdempotencyService } from '../idempotency.js';
import { RetryService } from '../retry.js';
import { EventSchemaValidator } from './event-schema-validator.js';

export class DomainEventDispatcher {
  private static instance: DomainEventDispatcher;
  private readonly idempotencyService: IdempotencyService;
  private readonly retryService: RetryService;
  private readonly validator: EventSchemaValidator;
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  private constructor() {
    this.idempotencyService = IdempotencyService.getInstance();
    this.retryService = RetryService.getInstance();
    this.validator = EventSchemaValidator.getInstance();
    this.registerHandlers();
  }

  static getInstance(): DomainEventDispatcher {
    if (!DomainEventDispatcher.instance) {
      DomainEventDispatcher.instance = new DomainEventDispatcher();
    }
    return DomainEventDispatcher.instance;
  }

  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const exists = await this.idempotencyService.has(event.idempotencyKey);
    if (exists) {
      console.info(`Duplicate event detected: ${event.idempotencyKey}`);
      return;
    }

    const isValid = await this.validator.validate(event);
    if (!isValid) {
      throw new Error(`Event validation failed: ${event.eventType}`);
    }

    const handlers = this.handlers.get(event.eventType) ?? [];

    for (const handler of handlers) {
      await this.retryService.executeWithRetry(async () => {
        await handler.handle(event);
      });
    }

    await this.idempotencyService.execute(event.idempotencyKey, async () => event);
  }

  async start(): Promise<void> {
    console.info('DomainEventDispatcher started');
  }

  async stop(): Promise<void> {
    console.info('DomainEventDispatcher stopped');
  }

  private registerHandlers(): void {
    this.on('order.created', { handle: async () => {} });
    this.on('payment.processed', { handle: async () => {} });
    this.on('user.registered', { handle: async () => {} });
  }
}

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}