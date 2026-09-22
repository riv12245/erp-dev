# Outbox Documentation

**Document**: OUTBOX.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

The Outbox pattern ensures reliable event delivery in the ERP Platform. When domain events are emitted, they are stored in an outbox collection within the same database transaction as the business data. A separate processor then publishes these events to the message broker, ensuring no events are lost even if the message broker is temporarily unavailable.

## Why the Outbox Pattern?

### Problem
In a distributed system, we need to atomically persist business data and publish domain events. Without the outbox pattern:
- If the event publish fails after the database commit, the event is lost
- If the database commit fails after the event publish, we have an inconsistent state
- Network partitions can cause message loss

### Solution
The Outbox pattern solves this by:
1. Storing events in the same database transaction as business data
2. Having a separate process publish events from the outbox
3. Ensuring atomicity between data changes and event publication

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Application                      │
│                                                   │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │ Domain   │───►│ Outbox   │───►│ MongoDB   │  │
│  │ Entity   │    │ Insert   │    │ (Single   │  │
│  │ State    │    │ (same    │    │  Transaction)│
│  │ Change   │    │  TX)     │    │           │  │
│  └──────────┘    └──────────┘    └───────────┘  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│              Outbox Processor                     │
│                                                   │
│  ┌──────────────┐    ┌───────────┐    ┌────────┐│
│  │ Poll Outbox  │───►│ Publish   │───►│ Redis  ││
│  │ (periodic)   │    │ to Stream │    │ Streams││
│  └──────────────┘    └───────────┘    └────────┘│
└─────────────────────────────────────────────────┘
```

## Outbox Collection

### Schema
```typescript
interface OutboxEvent {
  // Identity
  id: string;                    // UUID, unique event identifier
  aggregateType: string;         // Source aggregate type
  aggregateId: string;           // Source aggregate ID
  eventType: string;             // Event type (e.g., "OrderCreated")
  eventData: Record<string, unknown>;  // Serialized event payload

  // Context
  tenantId: string;              // Tenant identifier
  status: 'pending' | 'published' | 'failed';
  attempts: number;              // Number of publishing attempts
  lastError?: string;            // Last error message if failed
  publishedAt?: Date;            // When the event was published

  // Timing
  createdAt: Date;               // When the event was created
  expiresAt: Date;               // When the event should be archived
}
```

### Collection Indexes
```typescript
// Primary index for processing
{ status: 1, createdAt: 1, tenantId: 1 }

// Cleanup index
{ expiresAt: 1 }
```

## Outbox Processor

### Configuration
| Parameter | Environment Variable | Default | Description |
|-----------|---------------------|---------|-------------|
| Poll Interval | `OUTBOX_POLL_INTERVAL_MS` | 1000ms | Time between polling cycles |
| Batch Size | `OUTBOX_BATCH_SIZE` | 10 | Events processed per batch |
| Max Attempts | `OUTBOX_MAX_ATTEMPTS` | 5 | Maximum retry attempts |
| Retry Delay | `OUTBOX_RETRY_DELAY_MS` | 1000ms | Initial retry delay |
| Backoff Multiplier | `OUTBOX_BACKOFF_MULTIPLIER` | 2 | Exponential backoff factor |
| Max Retry Delay | `OUTBOX_MAX_RETRY_DELAY_MS` | 30000ms | Maximum retry delay |

### Processing Flow
```
1. Query outbox for pending events (ordered by createdAt, limited by batch size)
2. For each event:
   a. Publish to Redis Streams
   b. If success: update status to 'published', set publishedAt
   c. If failure: increment attempts, set lastError, update status to 'failed' if max attempts reached
3. Wait for next poll interval
4. Repeat
```

### Redis Streams Integration
- **Stream name**: `erp:outbox:<eventType>` or `erp:events` (shared stream)
- **Consumer groups**: Per module (e.g., `erp:cg:inventory`, `erp:cg:finance`)
- **Acknowledgment**: Consumer ack after successful processing
- **Pending messages**: Messages not acked within the pending window are redelivered
- **Stream trimming**: Trim old entries to prevent unbounded growth

### Consumer Group Pattern
```
Redis Stream: erp:events
Consumer Groups:
├── erp:cg:inventory     ← Inventory module
├── erp:cg:finance       ← Finance module
├── erp:cg:notifications ← Notifications module
└── erp:cg:analytics     ← Analytics module
```

Each consumer group independently reads all events. This ensures every module receives every event.

### Dead Letter Queue
Events that fail after maximum retry attempts are moved to the dead letter queue:
- Stored in `erp:dead-letter` Redis stream
- Archived in MongoDB `dead_letter_events` collection
- Alerts generated for DLQ accumulation
- Manual review process for dead letter events
- Potential replay mechanism after issue resolution

## Reliability Guarantees

### At-Least-Once Delivery
- Events are delivered at least once
- Consumers must handle duplicates (idempotency)
- Idempotency key in event data or consumer processing

### Atomicity
- Business data change and outbox insert are in the same MongoDB transaction
- If either fails, both are rolled back
- No event without corresponding business data change

### Durability
- Events persisted to MongoDB before acknowledgment
- MongoDB writes are acknowledged (w:1 minimum, w:majority for critical events)
- Replica set ensures persistence even if primary fails

## Monitoring and Observability

### Metrics
- **Outbox queue depth**: Number of pending events
- **Processing rate**: Events published per second
- **Processing latency**: Time from creation to publication
- **Error rate**: Failed publishing attempts
- **DLQ size**: Number of dead letter events
- **Average attempts**: Average retry count for events

### Alerts
- Outbox queue depth > 1000 (warning) or > 5000 (critical)
- Processing latency > 5 seconds (warning) or > 30 seconds (critical)
- DLQ size > 100 (warning) or > 500 (critical)
- Processing error rate > 5% (warning) or > 20% (critical)

### Tracing
- Correlation ID propagated through outbox events
- OpenTelemetry spans for outbox insert and publish operations are roadmap

## Operations

### Manual Event Publishing
```typescript
// Force publish pending events
await outboxService.processPending();
```

### Replay Events
```typescript
// Replay events for a specific tenant
await outboxService.replay('tenant-001', { fromDate: '2026-01-01' });
```

### Cleanup
```typescript
// Archive events older than 30 days
await outboxService.archive({ olderThan: 30 });

// Delete archived events
await outboxService.purgeArchived();
```

### Health Checks
- Outbox processor status included in `/health/ready`
- Processor running: boolean
- Last successful poll timestamp
- Current queue depth
- Error rate summary

## Troubleshooting

### Common Issues
1. **Events not being published**: Check outbox processor logs, verify Redis connection
2. **Slow processing**: Check Redis latency, increase batch size, check network
3. **Duplicate processing**: Verify consumer idempotency, check ack behavior
4. **High error rate**: Check Redis configuration, verify consumer error handling
5. **DLQ accumulation**: Investigate root cause, fix consumer issues, then replay

### Debugging Steps
1. Check outbox collection for pending events
2. Verify Redis Streams configuration
3. Check consumer group membership and lag
4. Review processor logs for errors
5. Check Redis connectivity and performance

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [ADR-005: Domain Events Outbox](ADR/ADR-005-domain-events-outbox.md)
- [Events Documentation](EVENTS.md)
- [Database Documentation](DATABASE.md)
