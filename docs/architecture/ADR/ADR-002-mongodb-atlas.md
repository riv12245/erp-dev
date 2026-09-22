# ADR-002: MongoDB Atlas for Primary Data Store

**Status**: Accepted  
**Date**: September 21, 2026  
**Deciders**: Platform Engineering Team  
**Domain**: Data Architecture

## Context

The ERP Platform requires a flexible, scalable database to store diverse business data across multiple modules. The data includes structured financial records, semi-structured document metadata, unstructured audit logs, and complex hierarchical relationships. We needed a database solution that could handle diverse data types, scale horizontally, and provide strong querying capabilities.

Key requirements:
- Flexible schema for evolving business entities
- Horizontal scalability for growing data volumes
- Strong query capabilities for reporting and analytics
- Geographically distributed deployment capability
- Reliable backup and disaster recovery
- High availability with automatic failover
- Transaction support for critical financial operations

## Decision

We will use **MongoDB Atlas** as our primary database, accessed via Mongoose ODM. MongoDB Atlas provides a fully managed database service with automatic scaling, backup, and monitoring.

We chose MongoDB over relational databases because:
1. **Schema flexibility**: Business entities evolve frequently, and schema migrations in MongoDB are simpler
2. **Horizontal scaling**: Native sharding support for data volume growth
3. **Document model**: Natural fit for JSON-based APIs and TypeScript applications
4. **Rich queries**: Aggregation framework supports complex reporting needs
5. **Atlas managed service**: Reduces operational overhead for database management

We use Mongoose as the ODM to provide:
- Schema validation and type safety
- Document modeling patterns
- Query builder with TypeScript support
- Middleware hooks for business logic
- Plugin ecosystem for extended functionality

## Consequences

### Positive
- **Rapid schema evolution**: No migration files needed for structural changes
- **Native JSON support**: Direct mapping between documents and TypeScript objects
- **Geographic distribution**: Atlas global clusters for low-latency access worldwide
- **Automatic scaling**: Read/write scaling without manual intervention
- **Rich indexing**: Compound indexes, text indexes, geospatial indexes
- **Aggregation framework**: Powerful analytics and reporting capabilities
- **Managed service**: Reduced operational burden

### Negative
- **No joins**: Data duplication required for performance (denormalization)
- **Eventual consistency**: Replica set reads may return stale data
- **Memory usage**: Large documents can consume significant memory
- **Transaction limitations**: Multi-document transactions have performance implications
- **Query complexity**: Complex relational queries require aggregation pipeline

### Mitigations
- Design documents with access patterns in mind
- Use transactions for critical financial operations
- Implement read preference configuration per query type
- Use `$lookup` and `$union` for cross-document queries when needed
- Regularly review and optimize indexes based on query patterns

## Alternatives Considered

### PostgreSQL
- **Rejected because**: While excellent for relational data, PostgreSQL requires more upfront schema design and migrations. The ERP's need for flexible schemas and rapid iteration is better served by MongoDB.

### DynamoDB
- **Rejected because**: AWS vendor lock-in, limited query flexibility, and DynamoDB's partition key design doesn't align well with the ERP's complex query patterns.

### DynamoDB + MongoDB Hybrid
- **Rejected because**: Adds unnecessary complexity with two database technologies.

### Redis-only
- **Rejected because**: Redis is not suitable as a primary persistent store due to memory costs and limited query capabilities.

## Data Modeling Guidelines

1. **Embed vs. Reference**: Embed frequently accessed related data; reference for large or frequently updated data
2. **Denormalization**: Duplicate data strategically for read performance
3. **Index Strategy**: Create indexes based on query patterns, not data structure
4. **Document Size**: Keep documents under 16MB; use references for large collections
5. **Tenant Isolation**: Every document includes `tenantId` field for multi-tenancy
6. **Audit Trail**: Include `createdAt`, `updatedAt` fields on all mutable documents

## Related ADRs
- ADR-001: Modular Monolith Architecture
- ADR-003: Multi-Tenant Strategy
