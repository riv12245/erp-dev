# ADR-003: Multi-Tenant Strategy

**Status**: Accepted  
**Date**: September 21, 2026  
**Deciders**: Platform Engineering Team  
**Domain**: Architecture

## Context

The ERP Platform must serve multiple organizations (tenants) simultaneously. Each tenant represents a distinct organization with its own users, data, configurations, and subscription plans. We needed a strategy that ensures data isolation, security, and performance while maintaining development simplicity.

Key requirements:
- Complete data isolation between tenants
- Shared infrastructure to minimize costs
- Per-tenant configuration and customization
- Scalable to hundreds of tenants
- Compliance with data residency requirements
- Granular access control within tenants

## Decision

We will adopt a **Shared Database, Shared Schema** multi-tenant strategy with tenant-scoped data isolation. Each document in MongoDB includes a `tenantId` field, and all queries automatically filter by the current tenant context.

The tenant context is resolved from the `x-tenant-id` request header and propagated through the application via a `TenantContext` object. This context is available in all layers of the application through dependency injection and middleware.

### Tenant Resolution Flow
1. Incoming request includes `x-tenant-id` header
2. Authentication middleware validates the JWT and extracts tenant information
3. Tenant resolution middleware sets the `TenantContext` for the request
4. All subsequent operations automatically scope to the tenant
5. Tenant context is included in audit logs and correlation data

### Data Isolation Strategy
- Every MongoDB document includes `tenantId` field
- Repository queries automatically include tenant filter
- Tenant-scoped indexes for query optimization
- No cross-tenant queries allowed (except by system administrators)
- Soft delete for tenant data (not physical deletion)

### Tenant Configuration
- Each tenant has a subscription plan (FREE, PRO, ENTERPRISE, CUSTOM)
- Feature flags are tenant-scoped
- Tenant settings stored as documents with flexible schema
- Resource limits (max users, storage) enforced per tenant

## Consequences

### Positive
- **Cost efficiency**: Shared infrastructure reduces operational costs
- **Simplified maintenance**: Single database to manage, backup, and scale
- **Easier migrations**: Schema changes apply to all tenants simultaneously
- **Resource pooling**: Better utilization of database resources
- **Simplified development**: Single codebase, no per-tenant customization

### Negative
- **Noisy neighbor risk**: One tenant's heavy queries can affect others
- **Data isolation complexity**: Must ensure tenant filtering is always applied
- **Backup granularity**: Per-tenant backup more complex
- **Compliance challenges**: Data residency requirements may complicate shared infrastructure
- **Scale limits**: Single database has maximum capacity

### Mitigations
- Implement query rate limiting per tenant
- Enforce tenant filtering at the repository layer (not just controllers)
- Use Atlas features for backup and point-in-time recovery
- Design for potential future shard-by-tenant migration
- Monitor tenant resource usage and alert on anomalies

## Tenant Context Structure

```typescript
interface TenantContext {
  tenantId: string;
  organizationId: string;
  userId: string;
  roles: string[];
  permissions: string[];
  locale: string;
  timezone: string;
}
```

## Alternatives Considered

### Separate Database per Tenant
- **Rejected because**: High operational complexity, difficulty managing hundreds/thousands of databases, connection pool exhaustion, and expensive maintenance at scale.

### Separate Schema per Tenant
- **Rejected because**: MongoDB doesn't have traditional schemas per database. This would simulate the separate database approach with all its complexity.

### Tenant ID in JWT Token
- **Rejected as supplementary**: While tenant info can be in JWT, we also need server-side tenant validation against the database for security.

### Hybrid (Shared + Isolated)
- **Rejected for now**: Starting with shared database keeps things simple. Can migrate isolated databases per tenant in the future if needed.

## Implementation Guidelines

1. **Never trust the client-provided tenant ID**: Validate tenant membership against the authenticated user
2. **Always filter by tenant**: Repository queries must include tenant filter
3. **Audit tenant access**: Log all tenant access for security compliance
4. **Graceful tenant deactivation**: When a tenant is deactivated, soft-delete their data
5. **Cross-tenant admin**: System administrators can access multiple tenants with explicit permissions

## Related ADRs
- ADR-001: Modular Monolith Architecture
- ADR-002: MongoDB Atlas for Primary Data Store
