export type EventName = string;
export type EventVersion = number;
export type AggregateId = string;

/** Base shape every domain/integration event must follow. */
export interface DomainEvent {
  readonly eventId: string;
  readonly eventName: EventName;
  readonly eventVersion: EventVersion;
  readonly aggregateId: AggregateId;
  readonly tenantId: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
  readonly correlationId: string;
  readonly causationId?: string;
}

export interface EventEnvelope<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly eventId: string;
  readonly eventName: EventName;
  readonly eventVersion: EventVersion;
  readonly aggregateId: AggregateId;
  readonly tenantId: string;
  readonly occurredAt: Date;
  readonly payload: T;
  readonly correlationId: string;
  readonly causationId?: string;
}

export interface EventMetadata {
  readonly correlationId: string;
  readonly causationId?: string;
  readonly actorId?: string;
}

export function createEvent<T extends Record<string, unknown>>(
  eventName: EventName,
  eventVersion: EventVersion,
  aggregateId: AggregateId,
  tenantId: string,
  payload: T,
  metadata: EventMetadata,
): EventEnvelope<T> {
  return {
    eventId: crypto.randomUUID(),
    eventName,
    eventVersion,
    aggregateId,
    tenantId,
    occurredAt: new Date(),
    payload,
    correlationId: metadata.correlationId,
    causationId: metadata.causationId,
  };
}

export interface EventHandler<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly handles: (event: EventEnvelope) => boolean;
  readonly handle: (event: EventEnvelope<T>) => Promise<void>;
}

export interface EventBus {
  readonly publish: (event: EventEnvelope) => Promise<void>;
  readonly subscribe: (handler: EventHandler) => void;
}