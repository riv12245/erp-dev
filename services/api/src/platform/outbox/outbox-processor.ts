import { EventEnvelope } from '../events/domain-event.js';

/** Publishes events to registered handlers on behalf of the outbox worker. */
export interface OutboxPublisher {
  readonly publish: (event: EventEnvelope) => Promise<void>;
}

/** Idempotent wrapper: handlers are only invoked once per eventId per publisher instance. */
export class DeduplicatingOutboxPublisher implements OutboxPublisher {
  private readonly seen = new Set<string>();
  private readonly pending = new Map<string, Promise<void>>();

  constructor(private readonly delegate: OutboxPublisher) {}

  async publish(event: EventEnvelope): Promise<void> {
    if (this.seen.has(event.eventId)) return;
    const existing = this.pending.get(event.eventId);
    if (existing) return existing;
    const delivery = this.delegate.publish(event)
      .then(() => { this.seen.add(event.eventId); })
      .finally(() => { this.pending.delete(event.eventId); });
    this.pending.set(event.eventId, delivery);
    return delivery;
  }
}

export { eventToOutboxRecord } from './mongo-outbox-repository.js';
export type { OutboxRepository } from './mongo-outbox-repository.js';
