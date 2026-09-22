export class WorkerError extends Error {
  public readonly code: string;
  public readonly details: Record<string, unknown> | null;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'WorkerError';
    this.code = code;
    this.details = details ?? null;
  }
}

export class JobExecutionError extends WorkerError {
  constructor(message: string, jobId: string, details?: Record<string, unknown>) {
    super(message, 'JOB_EXECUTION_ERROR', { jobId, ...details });
    this.name = 'JobExecutionError';
  }
}

export class OutboxProcessingError extends WorkerError {
  constructor(message: string, outboxId: string, details?: Record<string, unknown>) {
    super(message, 'OUTBOX_PROCESSING_ERROR', { outboxId, ...details });
    this.name = 'OutboxProcessingError';
  }
}

export class EventProcessingError extends WorkerError {
  constructor(message: string, eventId: string, details?: Record<string, unknown>) {
    super(message, 'EVENT_PROCESSING_ERROR', { eventId, ...details });
    this.name = 'EventProcessingError';
  }
}

export class NotificationError extends WorkerError {
  constructor(message: string, notificationId: string, details?: Record<string, unknown>) {
    super(message, 'NOTIFICATION_ERROR', { notificationId, ...details });
    this.name = 'NotificationError';
  }
}

export class ImportError extends WorkerError {
  constructor(message: string, importId: string, details?: Record<string, unknown>) {
    super(message, 'IMPORT_ERROR', { importId, ...details });
    this.name = 'ImportError';
  }
}

export class ExportError extends WorkerError {
  constructor(message: string, exportId: string, details?: Record<string, unknown>) {
    super(message, 'EXPORT_ERROR', { exportId, ...details });
    this.name = 'ExportError';
  }
}

export class ScheduledTaskError extends WorkerError {
  constructor(message: string, taskName: string, details?: Record<string, unknown>) {
    super(message, 'SCHEDULED_TASK_ERROR', { taskName, ...details });
    this.name = 'ScheduledTaskError';
  }
}

export class RetryLimitExceededError extends WorkerError {
  constructor(message: string, maxRetries: number) {
    super(message, 'RETRY_LIMIT_EXCEEDED', { maxRetries });
    this.name = 'RetryLimitExceededError';
  }
}

export class IdempotencyConflictError extends WorkerError {
  constructor(message: string, idempotencyKey: string) {
    super(message, 'IDEMPOTENCY_CONFLICT', { idempotencyKey });
    this.name = 'IdempotencyConflictError';
  }
}