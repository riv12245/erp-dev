import { DomainEvent } from '../shared/types.js';
import { IdempotencyService } from '../idempotency.js';
import { RetryService } from '../retry.js';
import { DomainEventDispatcher } from '../events/domain-event-dispatcher.js';

export class EventHandler {
  private static instance: EventHandler;
  private readonly dispatcher: DomainEventDispatcher;
  private readonly idempotencyService: IdempotencyService;
  private readonly retryService: RetryService;

  private constructor() {
    this.dispatcher = DomainEventDispatcher.getInstance();
    this.idempotencyService = IdempotencyService.getInstance();
    this.retryService = RetryService.getInstance();
  }

  static getInstance(): EventHandler {
    if (!EventHandler.instance) {
      EventHandler.instance = new EventHandler();
    }
    return EventHandler.instance;
  }

  async handle(event: DomainEvent): Promise<void> {
    const exists = await this.idempotencyService.has(event.idempotencyKey);
    if (exists) return;

    await this.retryService.executeWithRetry(async () => {
      await this.dispatcher.dispatch(event);
    });

    await this.idempotencyService.execute(event.idempotencyKey, async () => event);
  }

  async execute(): Promise<void> {
    await this.dispatcher.start();
  }
}