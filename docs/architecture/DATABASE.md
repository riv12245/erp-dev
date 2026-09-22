# Database Documentation

**Document**: DATABASE.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

This document describes the database architecture, schema design, and data management strategies for the ERP Platform.

## Database Technology

### Primary Database: MongoDB Atlas
- **Type**: Document database (NoSQL)
- **Service**: MongoDB Atlas (fully managed)
- **Version**: 8.x
- **Driver**: Mongoose 8.x ODM
- **Connectivity**: Via MongoDB Atlas connection string
- **Replica Set**: 3-node replica set for high availability
- **Backup**: Automated daily backups with point-in-time recovery

### Cache and Queue: Redis
- **Type**: In-memory data store
- **Driver**: ioredis
- **Use Cases**: Session cache, query cache, rate limiting, message queue
- **Cluster**: Redis Cluster for horizontal scaling

## Database Design Principles

### Schema Design
1. **Embed for read**: Embed frequently accessed related data
2. **Reference for write**: Reference data that changes frequently
3. **Denormalize for performance**: Duplicate strategically for read speed
4. **Index wisely**: Create indexes based on query patterns
5. **Tenant-scoped**: Every document includes `tenantId`

### Naming Conventions
- **Collections**: `snake_case` (e.g., `users`, `tenants`, `roles`)
- **Fields**: `snake_case` (e.g., `first_name`, `created_at`)
- **Indexes**: Named descriptively (e.g., `idx_users_tenant_id`)
- **Collections**: Plural form of the entity name

### Document Structure
```typescript
interface BaseDocument {
  _id: string;           // UUID
  tenantId: string;      // Tenant identifier
  isActive: boolean;     // Soft delete flag
  createdAt: Date;       // Creation timestamp
  updatedAt: Date;       // Last modification timestamp
}
```

## Collection Schema Overview

### Core Collections

#### Users (`users`)
- User accounts and authentication data
- Fields: email, firstName, lastName, password (hashed), tenantId, roleIds
- Indexes: `tenantId + email` (unique), `tenantId + isActive`

#### Tenants (`tenants`)
- Organization and tenant configuration
- Fields: name, slug, domain, subscription, settings, maxUsers
- Indexes: `slug` (unique), `domain` (unique), `isActive`

#### Roles (`roles`)
- Role definitions and permission mappings
- Fields: name, description, tenantId, permissionIds, isSystem
- Indexes: `tenantId + name` (unique), `tenantId + isSystem`

#### Permissions (`permissions`)
- Permission definitions
- Fields: name, resource, action, conditions, isActive
- Indexes: `resource + action` (unique)

#### Companies (`companies`)
- Company entities within tenants
- Fields: name, slug, taxId, currency, locale, address
- Indexes: `tenantId + isActive`, `tenantId + slug`

#### Audit (`audit`)
- Immutable audit log entries
- Fields: action, entityType, entityId, actorId, tenantId, changes, metadata
- Indexes: `tenantId + timestamp`, `entityType + entityId`

### Business Module Collections

Each business module defines its own collections:

| Module | Collections |
|--------|-------------|
| CRM | `contacts`, `leads`, `opportunities`, `accounts` |
| Finance | `invoices`, `transactions`, `journal_entries`, `accounts` |
| HR | `employees`, `payroll`, `benefits`, `time_off` |
| Inventory | `products`, `stock_levels`, `warehouses`, `suppliers` |
| Sales | `orders`, `order_items`, `quotes`, `contracts` |
| Projects | `projects`, `tasks`, `milestones`, `time_entries` |
| Manufacturing | `bills_of_material`, `production_runs`, `quality_checks` |
| Logistics | `shipments`, `carriers`, `tracking_events` |

### Index Strategy

#### Compound Indexes
```typescript
// Users: tenant-scoped lookups
{ tenantId: 1, email: 1 }     // Unique email per tenant
{ tenantId: 1, isActive: 1 }  // Active users per tenant

// Orders: tenant-scoped queries
{ tenantId: 1, status: 1, createdAt: -1 }  // Orders by status
{ tenantId: 1, customerId: 1, total: -1 }  // Orders by customer
```

#### Text Indexes
```typescript
// Full-text search capability
{ name: 'text', description: 'text', slug: 'text' }
```

#### TTL Indexes
```typescript
// Session expiration
{ expiresAt: 1 }    // Automatically removed after expiration
```

## Migrations

### Migration Strategy
- MongoDB's schema-less nature means no traditional migration files
- Schema changes are handled via Mongoose model updates
- Data transformations applied through scripts
- Version tracking via `schemaVersion` field

### Migration Process
1. Update Mongoose schema in code
2. Create data transformation script if needed
3. Run migration script to update existing data
4. Deploy updated model code
5. Verify data integrity

### Schema Versioning
```typescript
interface SchemaVersion {
  version: number;
  appliedAt: Date;
  description: string;
  tenantId?: string;
}
```

## Data Flow and Transactions

### MongoDB Transactions
Multi-document ACID transactions for critical operations:
- Financial transactions
- Order processing
- User registration (user + outbox event)
- Role-permission assignment

```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  await user.save({ session });
  await outboxEvent.save({ session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Connection Management
- Connection pooling configured per environment
- Default pool size: 10 connections
- Connection timeout: 10 seconds
- Heartbeat frequency: 30 seconds
- Retry writes enabled

### Read Preferences
- **Primary**: Default for write operations
- **Secondary**: Read replicas for analytics queries
- **Nearest**: Read from closest replica for latency-sensitive operations

## Data Integrity

### Validation
- Mongoose schema validation at the model level
- Business validation in domain services
- Joi validation at the controller layer
- Referential integrity maintained by application logic

### Soft Delete Pattern
- All documents have `isActive` field
- `isActive: false` indicates deleted
- Deleted records are excluded from queries
- Periodic cleanup of soft-deleted records

### Data Backup and Recovery
- Daily automated backups via MongoDB Atlas
- Point-in-time recovery capability
- Backup retention: 30 days
- Off-site backup storage
- Regular restore testing

## Performance Considerations

### Query Optimization
- Use `.explain()` to analyze query performance
- Ensure all queries use indexes
- Avoid `$lookup` on large collections
- Use aggregation pipelines for complex reporting
- Limit result sets with pagination

### Caching Strategy
- Redis cache for frequently accessed data
- Cache key includes tenant ID for isolation
- TTL-based cache expiration
- Cache invalidation on data modification
- Cache warming for predictable access patterns

### Connection Pooling
```javascript
mongoose.connect(uri, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [ADR-002: MongoDB Atlas](ADR/ADR-002-mongodb-atlas.md)
- [Security Documentation](SECURITY.md)
- [Events Documentation](EVENTS.md)
