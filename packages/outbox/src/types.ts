import type { ClientSession } from 'mongoose';

export interface EventEnvelope<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly eventId: string;
  readonly eventName: string;
  readonly eventVersion: number;
  readonly aggregateId: string;
  readonly tenantId: string;
  readonly occurredAt: Date;
  readonly payload: T;
  readonly correlationId: string;
  readonly causationId?: string;
}

export interface OutboxRecord extends EventEnvelope {
  readonly status: 'pending' | 'processing' | 'published' | 'failed';
  readonly attempts: number;
  readonly lastError?: string;
  readonly owner?: string;
  readonly claimToken?: string;
  readonly lockedUntil?: Date;
  readonly availableAt?: Date;
  readonly publishedAt?: Date;
}

export interface OutboxClaim extends OutboxRecord {
  readonly owner: string;
  readonly claimToken: string;
  readonly lockedUntil: Date;
}

export interface OutboxRepository {
  append(record: OutboxRecord, session?: ClientSession): Promise<void>;
  claimBatch(limit: number, owner: string): Promise<OutboxClaim[]>;
  markPublished(claim: OutboxClaim): Promise<boolean>;
  markFailed(claim: OutboxClaim, error: string): Promise<boolean>;
  countPending(tenantId?: string): Promise<number>;
}

export interface OutboxPublisher { publish(event: EventEnvelope): Promise<void>; }

export function eventToOutboxRecord(event: EventEnvelope): OutboxRecord {
  return { ...event, status: 'pending', attempts: 0 };
}
