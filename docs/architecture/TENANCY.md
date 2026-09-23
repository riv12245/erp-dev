> **Estado 2026-09-22:** el texto histórico de abajo describe objetivos de diseño, no una certificación de implementación. El estado actual está en [FOUNDATION_EXECUTION](FOUNDATION_EXECUTION.md), [SESSION_INTEGRATION](SESSION_INTEGRATION.md) y el [contrato API](../../openapi/README.md). JWT HS256 incluye sid; sesión e IAM se verifican en Mongo en cada petición; refresh rotativo y revocación están implementados. MFA y gestión IAM siguen pendientes. PBKDF2, registro sin tenant y roles demo ADMIN/SALES se conservan.

El repositorio base combina filtros con `$and`, fuerza tenant en escrituras, limita listados a 1–100 y protege metadatos de creación/versionado. La versión esperada impide sobrescrituras concurrentes. Pruebas Mongo verifican IDs ajenos en lectura, modificación y borrado. Usuarios/email son identidades globales; countries es referencia global, no un catálogo privado por tenant. Roles personalizados se resuelven por tenant; roles de sistema sólo con tenant nulo. Audit filtra tenant y añade índice `(tenantId,timestamp descendente)`. No hay caché de datos/autorización de tenant en la API actual; no se declara una prueba de claves de caché inexistentes. Las referencias empresa/sucursal siguen siendo contexto, no autorización independiente; los módulos de negocio aún no implementados deberán validar las referencias al introducirlas.

# Multi-Tenancy Architecture

**Document**: TENANCY.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

The ERP Platform operates as a multi-tenant system where multiple organizations (tenants) share the same application infrastructure while maintaining complete data isolation. This document describes the tenant architecture, data isolation strategy, and implementation details.

## Tenant Model

### What is a Tenant?
A tenant represents an organization or business entity using the ERP Platform. Each tenant has:
- Unique identifier (UUID)
- Legal name and domain
- Subscription plan
- Configuration settings
- Independent user management
- Isolated data

### Tenant Object
```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  subscription: {
    plan: 'FREE' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED';
    currentPeriodEnd: Date;
  };
  settings: Record<string, unknown>;
  maxUsers: number;
  currentUsers: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Tenant Resolution

### Header-Based Resolution
All requests include the `x-tenant-id` header:
```
GET /api/v1/users
x-tenant-id: abc123-def456
```

### Resolution Flow
1. Request arrives with `x-tenant-id` header
2. Authentication middleware validates the JWT token
3. Tenant resolution middleware verifies the tenant ID against the user's tenant membership
4. `TenantContext` is set in the request context
5. All downstream operations use the tenant context
6. Audit logs include the tenant ID

### Tenant Context
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

## Data Isolation

### Database Level
- **Shared MongoDB database**: All tenants share the same database
- **Tenant-scoped collections**: Every document includes a `tenantId` field
- **Automatic filtering**: Repository layer automatically filters by `tenantId`
- **Tenant indexes**: Composite indexes include `tenantId` for query optimization

### Query Filtering
All MongoDB queries automatically include the tenant filter:
```typescript
// In repository base class
async findByTenant(query: FilterQuery<T>): Promise<T[]> {
  return this.collection.find({ ...query, tenantId: this.tenantId }).toArray();
}
```

### Isolation Guarantees
1. **Read isolation**: Users can only read their tenant's data
2. **Write isolation**: Users can only write their tenant's data
3. **Cross-tenant access**: Only system administrators with explicit permissions can access multiple tenants
4. **Delete isolation**: When a tenant is deleted, their data is soft-deleted

### Data Access Patterns
| Operation | Pattern |
|-----------|---------|
| Find by ID | `{ _id, tenantId }` |
| List | Filter by `tenantId`, paginated |
| Search | Filter by `tenantId`, text search |
| Aggregations | Group by fields, filter by `tenantId` |
| Joins | `$lookup` within same tenant |

## Tenant Management

### Creating a Tenant
1. Admin creates tenant via `POST /api/v1/tenants`
2. System generates tenant ID and default configuration
3. Default roles and permissions are created
4. Subscription plan is set (default: FREE)
5. Tenant is marked as active
6. System sends welcome notification

### Tenant Lifecycle
```
Created → Active → ... → Suspended → Cancelled → Deleted (soft)
```

### Tenant Plans
| Feature | FREE | PRO | ENTERPRISE | CUSTOM |
|---------|------|-----|------------|--------|
| Max Users | 5 | 25 | Unlimited | Custom |
| Storage | 1GB | 10GB | Unlimited | Custom |
| API Rate Limit | 100/15min | 1000/15min | Custom | Custom |
| Support | Email | Priority | Dedicated | Custom |
| Feature Access | Basic | All | All + Premium | All + Custom |

### Tenant Settings
Each tenant can configure:
- Locale and timezone preferences
- Custom branding (logo, colors)
- Feature flags
- Notification preferences
- Integration settings
- Custom fields

## Cross-Tenant Administration

### System Administrators
System administrators can manage all tenants but must explicitly request access to each tenant. Access is logged and audited.

### Super Admin Role
The `super_admin` role has cross-tenant privileges:
- View all tenants
- Create/modify/delete any tenant
- Access any user across all tenants
- System-level configuration

### Access Control for Cross-Tenant Operations
1. Explicit permission required
2. Additional audit logging
3. Approval workflows for sensitive operations
4. IP whitelisting for admin access
5. Time-based restrictions (optional)

## Performance Considerations

### Data Volume
- Each tenant's data is separated by `tenantId`
- Indexes include `tenantId` for optimal query performance
- Data retention policies per subscription tier
- Regular archiving of inactive tenant data

### Query Optimization
- All queries filtered by `tenantId`
- Covered indexes for common query patterns
- Read replicas for analytics queries
- Caching strategies per tenant

### Connection Management
- Connection pooling shared across tenants
- Per-tenant rate limiting
- Resource quotas enforced at the middleware level
- Monitoring per tenant resource usage

## Security Considerations

### Data Isolation Guarantees
1. **Application layer**: All queries include tenant filter
2. **Database layer**: MongoDB access control lists restrict by tenant (optional)
3. **Middleware layer**: Tenant resolution before any data access
4. **Testing**: Automated tests verify tenant isolation

### Tenant-Specific Encryption
- Encryption keys can be tenant-specific
- Key management per tenant subscription level
- Secure key rotation procedures

### Compliance
- Data residency requirements per tenant region
- GDPR compliance for personal data
- SOC 2 compliance for enterprise tenants
- Audit trails for all cross-tenant access

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [ADR-003: Multi-Tenant Strategy](ADR/ADR-003-multi-tenant-strategy.md)
- [Security Documentation](SECURITY.md)
