# ADR-006: Role-Based Access Control (RBAC) Policies

**Status**: Accepted  
**Date**: September 21, 2026  
**Deciders**: Platform Engineering Team  
**Domain**: Security, Authorization

## Context

The ERP Platform requires a robust authorization system to manage access to resources across different modules and tenants. Users have different roles with varying levels of access. We needed a flexible, scalable authorization model that supports complex permission hierarchies while remaining simple to manage.

Key requirements:
- Define roles with specific permissions
- Assign roles to users
- Support tenant-scoped permissions
- Enforce permissions at the API level
- Support role hierarchies and inheritance
- Audit all access decisions
- Support both system-level and tenant-level permissions

## Decision

We will implement **Role-Based Access Control (RBAC)** with the following structure:

### RBAC Model
- **Permissions**: Atomic units of access (e.g., `users:read`, `users:write`, `tenants:admin`)
- **Roles**: Collections of permissions with a name and description
- **Users**: Assigned one or more roles
- **Tenants**: Permissions are scoped to tenants; system roles apply globally

### Permission Structure
Permissions follow the pattern `resource:action` and may include conditions:
```typescript
interface Permission {
  id: string;
  name: string;           // e.g., "Manage Users"
  resource: string;       // e.g., "users"
  action: string;         // e.g., "read", "write", "delete", "admin"
  conditions?: object;    // Optional conditional access
  isActive: boolean;
}
```

### Role Structure
- **System Roles**: Built-in roles available across all tenants (Admin, Manager, User, Viewer)
- **Custom Roles**: Created per-tenant by administrators
- **Role Hierarchy**: Higher roles inherit permissions from lower roles
- **Tenant Scoping**: Roles are associated with a specific tenant

### Access Control Flow
1. User authenticates and receives JWT with role/permission claims
2. Middleware extracts user permissions from JWT and database
3. Each request is checked against required permissions
4. If authorized, request proceeds; if not, `403 Forbidden` is returned
5. All access decisions are logged in the audit trail

### Default Roles
| Role | System | Permissions |
|------|--------|-------------|
| `super_admin` | Yes | All permissions across all tenants |
| `admin` | Yes | All permissions within a tenant |
| `manager` | Yes | Read and write permissions, no admin |
| `user` | Yes | Read and limited write permissions |
| `viewer` | Yes | Read-only permissions |

## Consequences

### Positive
- **Fine-grained access control**: Precise permission management
- **Simplicity**: RBAC is well-understood and easy to implement
- **Scalability**: Permissions scale well with growing modules
- **Auditability**: All access decisions can be logged
- **Flexibility**: Custom roles per tenant
- **Performance**: Permission checks are fast with indexed lookups

### Negative
- **Role explosion**: Too many roles can become unmanageable
- **Permission sprawl**: Permissions can become scattered and inconsistent
- **Static model**: RBAC doesn't handle complex authorization logic well
- **Assignment complexity**: Managing user-role-permission mappings at scale

### Mitigations
- Regular role and permission audits
- Use conditions for complex authorization logic
- Implement permission hierarchies to reduce role count
- Provide admin UI for role management
- Use groups/teams for bulk permission assignment

## Implementation Details

### Permission Check Middleware
```typescript
// Decorator-based permission check
@RequirePermission('users:write')
async updateUser(req, res) { ... }

// Middleware validates permission against JWT claims
function checkPermission(permission: string): Middleware { ... }
```

### Database Schema
- **permissions** collection: All available permissions
- **roles** collection: Role definitions with permission references
- **user_roles** collection: User-role assignments (tenant-scoped)
- **role_permissions** collection: Role-permission mappings

### JWT Claims
JWT tokens include:
```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "roles": ["admin", "manager"],
  "permissions": ["users:read", "users:write", "tenants:admin"]
}
```

## Alternatives Considered

### Attribute-Based Access Control (ABAC)
- **Rejected as primary**: ABAC is more flexible but more complex. RBAC provides the right balance of simplicity and control for ERP use cases.

### Policy-Based Access Control (PBAC)
- **Rejected as primary**: PBAC (like OPA) adds significant complexity. Can be explored for specific use cases like fiscal period enforcement.

### ACL (Access Control Lists)
- **Rejected because**: ACLs don't scale well for enterprise applications with many users and resources.

### Hybrid RBAC-ABAC
- **Rejected for now**: Start with RBAC, add ABAC elements if needed for specific scenarios like conditional access based on time, location, or resource state.

## Security Considerations

1. **Deny by default**: All actions denied unless explicitly permitted
2. **Least privilege**: Users should only have permissions they need
3. **Regular reviews**: Periodic permission audits
4. **Separation of duties**: Critical operations require multiple roles
5. **Emergency access**: Break-glass procedures documented and logged
6. **Audit trail**: All access control decisions are logged

## Related ADRs
- ADR-001: Modular Monolith Architecture
- ADR-003: Multi-Tenant Strategy
- ADR-007: TypeScript Strict Mode
