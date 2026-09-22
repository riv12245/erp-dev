import { EventBus, EventEnvelope, EventHandler } from './domain-event.js';

/** In-process (relay) event bus. Persistence + reliability live in the Outbox. */
export class InMemoryEventBus implements EventBus {
  private readonly handlers: EventHandler[] = [];

  subscribe(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  async publish(event: EventEnvelope): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.handles(event)) {
        await handler.handle(event);
      }
    }
  }
}