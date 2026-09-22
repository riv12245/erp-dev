# Events Documentation

**Document**: EVENTS.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

This document describes the event-driven architecture of the ERP Platform. Domain events enable modules to communicate without direct coupling, supporting the modular monolith design.

## Event Types

### Domain Events
Events emitted by domain entities when state changes occur.

| Event | Source Module | Description |
|-------|--------------|-------------|
| `UserRegistered` | auth | New user account created |
| `UserActivated` | auth | User account activated |
| `UserDeactivated` | auth | User account deactivated |
| `TenantCreated` | tenancy | New tenant organization created |
| `TenantUpdated` | tenancy | Tenant information updated |
| `OrderCreated` | sales | New order placed |
| `OrderPaid` | sales | Order payment processed |
| `InventoryUpdated` | inventory | Stock level changed |
| `RoleAssigned` | iam | Role assigned to user |
| `PermissionChanged` | iam | Permission modified |

### Integration Events
Events emitted for external system consumption.

| Event | Description | Target |
|-------|-------------|--------|
| `NotificationRequested` | Notification needs to be sent | Notifications service |
| `ReportGenerated` | Analytics report is ready | Analytics service |
| `WorkflowTriggered` | Workflow automation should start | Workflow engine |
| `DocumentCreated` | Document uploaded | Documents service |

## Event Structure

### Base Event Schema
```typescript
interface DomainEvent {
  id: string;              // Unique event ID (UUID)
  type: string;            // Event type name
  timestamp: Date;         // When the event occurred
  tenantId: string;        // Tenant context
  aggregateType: string;   // Source aggregate (e.g., "User", "Order")
  aggregateId: string;     // ID of the aggregate that emitted the event
  causationId?: string;    // ID of the event that caused this one
  correlationId?: string;  // Correlation ID for tracing
  data: Record<string, unknown>;  // Event payload
  metadata?: Record<string, unknown>;  // Additional metadata
}
```

### Example Events

#### UserRegistered
```json
{
  "id": "evt-001",
  "type": "UserRegistered",
  "timestamp": "2026-09-21T10:00:00Z",
  "tenantId": "tenant-001",
  "aggregateType": "User",
  "aggregateId": "user-001",
  "data": {
    "userId": "user-001",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "tenant-001"
  },
  "correlationId": "corr-001"
}
```

#### OrderCreated
```json
{
  "id": "evt-002",
  "type": "OrderCreated",
  "timestamp": "2026-09-21T10:05:00Z",
  "tenantId": "tenant-001",
  "aggregateType": "Order",
  "aggregateId": "order-001",
  "data": {
    "orderId": "order-001",
    "customerId": "user-001",
    "items": [...],
    "totalAmount": 1500.00,
    "currency": "USD",
    "status": "pending"
  },
  "causationId": "evt-001"
}
```

## Event Lifecycle

### 1. Event Creation
1. Domain entity state changes
2. Aggregate emits domain event
3. Event is added to the unit of work

### 2. Event Persistence (Outbox)
1. Event is saved to the outbox collection
2. Saved within the same MongoDB transaction as business data
3. Transaction committed atomically
4. Event status: `pending`

### 3. Event Publishing
1. Outbox processor polls for pending events
2. Events are serialized and published to Redis Streams
3. Consumer groups process events
4. Event status updated to `published`
5. Acknowledgment sent to consumer group

### 4. Event Consumption
1. Subscriber modules consume events from their consumer group
2. Business logic is executed in response to the event
3. New domain events may be emitted
4. Processing errors trigger retry or dead letter queue

## Event Handling

### Subscriber Pattern
Each module subscribes to events it cares about:

```typescript
// Inventory module subscribes to OrderCreated
class OrderCreatedHandler {
  async handle(event: OrderCreatedEvent): Promise<void> {
    // Reduce inventory based on order items
    await inventoryService.decrementStock(event.data.items);
    // Emit new event
    await eventBus.emit(new InventoryUpdatedEvent({
      ...event.data,
      productIds: event.data.items.map(i => i.productId)
    }));
  }
}
```

### Error Handling
- **Transient errors**: Retry with exponential backoff
- **Permanent errors**: Move to dead letter queue
- **Max retries**: Configurable (default 5)
- **Dead letter queue**: Events that fail after max retries
- **Alerting**: Notifications on DLQ accumulation

### Idempotency
- All event handlers must be idempotent
- Event IDs ensure events are not processed twice
- Deduplication checks before processing
- Idempotency keys for external service calls

## Outbox Pattern

### How It Works
1. Within a MongoDB transaction, save business data AND outbox event
2. Outbox processor polls the outbox collection
3. Events are published to Redis Streams
4. After successful publishing, mark event as published

### Outbox Collection Schema
```typescript
interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  tenantId: string;
  status: 'pending' | 'published' | 'failed';
  attempts: number;
  lastError?: string;
  publishedAt?: Date;
  createdAt: Date;
  expiresAt: Date;
}
```

### Outbox Configuration
- **Poll interval**: 1000ms (`OUTBOX_POLL_INTERVAL_MS`)
- **Batch size**: 10 events per poll
- **Max attempts**: 5 retries
- **Retry delay**: Exponential backoff
- **TTL**: 30 days before archival

## Event Sourcing (Optional)

### Approach
- Events are the source of truth for entity state
- Current state is derived by replaying events
- Event store maintains complete history

### Benefits
- Complete audit trail
- Temporal queries (what was the state at time T?)
- Easy debugging and troubleshooting
- Natural fit for the outbox pattern

### Implementation Notes
- Event sourcing is optional and module-specific
- Current state is cached in documents for performance
- Event store is append-only
- Snapshots for frequently accessed aggregates

## Event Schema Registry

### Versioning Strategy
- Events are versioned (`UserRegistered.v1`, `UserRegistered.v2`)
- Backward compatibility required
- New fields optional, removed fields ignored
- Event version in the `type` field

### Schema Definition
```typescript
interface EventDefinition {
  name: string;
  version: string;
  description: string;
  schema: ZodSchema;  // Validation schema
  publisher: string;
  subscribers: string[];
}
```

## Monitoring and Observability

### Metrics
- Events published per second
- Events processed per second
- Average processing latency
- Error rate by event type
- Outbox queue depth
- Dead letter queue size

### Tracing
- Correlation ID propagated through all events
- Trace spans for event emission, persistence, and consumption
- Distributed tracing across modules

### Alerting
- Outbox queue depth exceeds threshold
- Event processing error rate exceeds threshold
- DLQ size exceeds threshold
- Event processing latency exceeds threshold

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [ADR-005: Domain Events Outbox](ADR/ADR-005-domain-events-outbox.md)
- [Outbox Documentation](OUTBOX.md)
- [Database Documentation](DATABASE.md)
