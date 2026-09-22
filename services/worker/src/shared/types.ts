export interface Job {
  readonly id: string;
  readonly type: JobType;
  readonly payload: Record<string, unknown>;
  status: JobStatus;
  readonly priority: number;
  readonly maxRetries: number;
  retryCount: number;
  readonly createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  error: string | null;
  readonly idempotencyKey: string | null;
}

export type JobType =
  | 'outbox-process'
  | 'event-handler'
  | 'notification-dispatcher'
  | 'report-generator'
  | 'import-handler'
  | 'export-handler';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface OutboxMessage {
  readonly id: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;
  readonly status: OutboxStatus;
  readonly retryCount: number;
  readonly maxRetries: number;
}

export type OutboxStatus = 'pending' | 'published' | 'failed';

export interface DomainEvent {
  readonly id: string;
  readonly eventType: string;
  readonly source: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: Date;
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly version: number;
}

export interface IntegrationEvent {
  readonly id: string;
  readonly eventType: string;
  readonly source: string;
  readonly target: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: Date;
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface ScheduledTask {
  readonly id: string;
  readonly name: string;
  readonly intervalMs: number;
  readonly execute: () => Promise<void>;
  readonly enabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}

export interface Notification {
  readonly id: string;
  readonly type: 'email' | 'sms' | 'push';
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
  status: 'pending' | 'sent' | 'failed';
  readonly createdAt: Date;
  sentAt: Date | null;
}

export interface ImportJob {
  readonly id: string;
  readonly source: 'csv' | 'excel';
  readonly filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordCount: number;
  readonly createdAt: Date;
}

export interface ExportJob {
  readonly id: string;
  readonly format: 'csv' | 'pdf';
  readonly query: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filePath: string | null;
  readonly createdAt: Date;
}

export interface Report {
  readonly id: string;
  readonly type: string;
  data: Record<string, unknown>;
  generatedAt: Date;
  status: 'pending' | 'generated' | 'failed';
}

export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly multiplier: number;
}