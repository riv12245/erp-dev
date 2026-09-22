# ADR-005: Domain Events Outbox Pattern

**Status**: Accepted  
**Date**: September 21, 2026  
**Deciders**: Platform Engineering Team  
**Domain**: Architecture, Data Integrity

## Context

The ERP Platform requires reliable event-driven communication between modules and external systems. When a business event occurs (e.g., order created, user registered), other modules and systems need to be notified. However, using a message broker directly from the domain layer introduces coupling and potential data inconsistency issues.

Key requirements:
- Reliable event delivery (no lost events)
- Atomicity between database operations and event publishing
- Decoupling between event producers and consumers
- Eventual consistency across modules
- Dead letter handling for failed events
- Event replay capability for debugging

## Decision

We will implement the **Domain Events Outbox Pattern**. When a domain event occurs, it is stored in an outbox collection/table within the same database transaction as the business data change. A separate outbox processor then publishes events from the outbox to the message broker (Redis Streams or similar).

### How It Works
1. **Domain event emitted**: Business logic produces a domain event
2. **Outbox write**: Event is persisted in the outbox collection within the same MongoDB transaction as the business data
3. **Transaction commit**: Both business data and outbox event are committed atomically
4. **Outbox processor**: Polls the outbox for unpublished events
5. **Event publishing**: Events are published to the message broker
6. **Acknowledgment**: After successful publishing, the event is marked as published
7. **Failure handling**: If publishing fails, event remains in outbox for retry

### Outbox Collection Schema
```typescript
interface OutboxEvent {
  id: string;           // UUID
  aggregateType: string; // e.g., "Order", "User"
  aggregateId: string;  // ID of the aggregate
  eventType: string;    // e.g., "OrderCreated"
  eventData: object;    // Serialized event payload
  tenantId: string;     // Tenant context
  status: 'pending' | 'published' | 'failed';
  attempts: number;
  lastError?: string;
  publishedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}
```

## Consequences

### Positive
- **Atomicity**: Business data changes and event publishing are atomic
- **Reliability**: No events lost even if message broker is temporarily unavailable
- **Decoupling**: Domain layer doesn't depend on message broker
- **Retry capability**: Failed events are retried automatically
- **Auditability**: All events are stored in the database for audit
- **Replay capability**: Events can be replayed for debugging or recovery
- **Scalability**: Outbox processor can scale independently

### Negative
- **Latency**: Events are not immediately published; there's a polling delay
- **Complexity**: Additional infrastructure for outbox processing
- **Storage overhead**: Outbox collection grows until events are cleaned up
- **Duplicate events**: Risk of duplicate publishing if ack fails after publish

### Mitigations
- Use short polling intervals (configurable, default 1 second)
- Implement idempotent consumers to handle duplicates
- Set TTL on outbox events to prevent infinite growth
- Use Redis Streams for pub/sub with consumer group acknowledgment
- Implement exactly-once semantics where critical

## Event Types

### Domain Events (Internal)
- `UserRegistered`: Triggered when a new user registers
- `UserActivated`: Triggered when a user account is activated
- `TenantCreated`: Triggered when a new tenant is created
- `OrderCreated`: Triggered when a new order is placed
- `PaymentProcessed`: Triggered when a payment is completed
- `InventoryUpdated`: Triggered when inventory levels change
- `RoleAssigned`: Triggered when a role is assigned to a user
- `PermissionChanged`: Triggered when permissions are updated

### Integration Events (External)
- `TenantSynced`: Triggered when tenant data is updated in external systems
- `UserProfileUpdated`: Triggered when user profile changes propagate
- `NotificationRequested`: Triggered when notifications are needed

## Outbox Processing

### Worker Configuration
- **Poll interval**: Configurable (default 1000ms via `OUTBOX_POLL_INTERVAL_MS`)
- **Batch size**: Process multiple events per poll for efficiency
- **Concurrency**: Configurable worker concurrency
- **Error handling**: Exponential backoff for failed events
- **Dead letter queue**: Events failing after max retries moved to DLQ

### Redis Streams Integration
- Use Redis Streams as the message broker
- Consumer groups for parallel processing
- Each consumer group reads from the same stream
- Acknowledgment ensures at-least-once delivery
- Stream trimming to prevent unbounded growth

## Alternatives Considered

### Direct Message Broker Publishing
- **Rejected because**: Introduces coupling between domain layer and message broker, risks data inconsistency if publish fails after database commit.

### Transactional Outbox with CDC (Change Data Capture)
- **Rejected because**: CDC adds infrastructure complexity (Debezium connector), and MongoDB change streams don't provide the same guarantees as relational CDC.

### Saga Pattern Only
- **Rejected because**: Saga pattern manages distributed transactions but doesn't provide the event notification mechanism needed for cross-module communication.

### Transactional Messaging
- **Rejected because**: MongoDB doesn't support XA transactions across MongoDB and external message brokers.

## Implementation Guidelines

1. **Always use transactions**: Wrap business data change and outbox insert in a single MongoDB transaction
2. **Idempotent event handlers**: Consumer handlers must handle duplicate events gracefully
3. **Event versioning**: Include event version for forward compatibility
4. **Event schema evolution**: Use flexible schemas for event data
5. **Monitoring**: Track outbox queue depth, processing latency, and failure rates
6. **Cleanup**: Archive or delete published events after retention period

## Related ADRs
- ADR-001: Modular Monolith Architecture
- ADR-002: MongoDB Atlas for Primary Data Store
