import { EventEnvelope } from '../events/domain-event.js';

/** Publishes events to registered handlers on behalf of the outbox worker. */
export interface OutboxPublisher {
  readonly publish: (event: EventEnvelope) => Promise<void>;
}

/** Idempotent wrapper: handlers are only invoked once per eventId per publisher instance. */
export class DeduplicatingOutboxPublisher implements OutboxPublisher {
  private readonly seen = new Set<string>();

  constructor(private readonly delegate: OutboxPublisher) {}

  async publish(event: EventEnvelope): Promise<void> {
    if (this.seen.has(event.eventId)) return;
    this.seen.add(event.eventId);
    await this.delegate.publish(event);
  }
}

export { eventToOutboxRecord } from './mongo-outbox-repository.js';
export type { OutboxRepository } from './mongo-outbox-repository.js';