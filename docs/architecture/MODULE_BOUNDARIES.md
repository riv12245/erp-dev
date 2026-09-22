# Module Boundaries

**Document**: MODULE_BOUNDARIES.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

This document defines the boundaries between modules in the ERP Platform. Each module has a clearly defined responsibility, interface, and dependency rules. Modules communicate through well-defined contracts and domain events.

## Module Categories

### Platform Modules
Platform modules provide shared infrastructure services used by business modules.

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| **auth** | Authentication, JWT management, session handling | iam, tenancy |
| **iam** | Identity management, user/role/permission CRUD | auth, tenancy |
| **tenancy** | Tenant management, tenant context resolution | - |
| **audit** | Audit logging, compliance tracking | All modules |
| **workflow** | Workflow engine, business process automation | All modules |
| **feature-flags** | Feature flag management | tenant |
| **notifications** | Notification delivery (email, SMS, push) | auth, audit |
| **localization** | Multi-language support, i18n | - |
| **documents** | Document management and storage | iam, audit |
| **integrations** | Third-party API integrations | audit |
| **observability** | Monitoring, tracing, logging | All modules |

### Business Modules
Business modules implement domain-specific ERP functionality.

| Module | Responsibility | Platform Dependencies |
|--------|---------------|----------------------|
| **master-data** | Core reference data (products, categories) | iam, localization |
| **crm** | Customer relationship management | iam, notifications |
| **sales** | Sales management and order processing | crm, finance, inventory |
| **inventory** | Inventory management and stock control | master-data, finance |
| **finance** | Financial management and accounting | inventory, sales, hr |
| **hr** | Human resources management | iam, finance |
| **procurement** | Purchasing and supplier management | inventory, finance |
| **manufacturing** | Manufacturing operations | inventory, hr |
| **logistics** | Shipping and logistics | inventory, finance |
| **projects** | Project management | hr, finance, inventory |
| **analytics** | Business intelligence and reporting | All modules |
| **assets** | Asset lifecycle management | finance, inventory |
| **service** | Service and support management | crm, finance |

## Dependency Rules

### Allowed Dependencies
1. **Business modules** can depend on **platform modules**
2. **Business modules** can depend on **other business modules** via domain events only
3. **Platform modules** can depend on other **platform modules**
4. **All modules** can depend on **shared packages**

### Forbidden Dependencies
1. Business modules must NOT directly import from other business modules
2. Platform modules must NOT depend on business modules
3. Circular dependencies between any modules are prohibited
4. Modules must NOT import from the `apps/` directory

### Dependency Enforcement
```
apps/web ──► packages/* ──► services/api ──► modules/
apps/mobile─► packages/* ──► services/api ──► modules/
```

- `apps/web` and `apps/mobile` depend only on `packages/*`
- `packages/*` depend only on other `packages/*`
- `services/api` depends on `packages/*`
- `services/api/modules/*` depend on `services/api/platform/*` and `packages/*`
- Cross-business-module communication only via events

## Module Communication Patterns

### Synchronous (Direct)
- Platform modules call each other via function calls
- Use dependency injection for testability
- Example: `auth` module calls `iam` module to verify user permissions

### Asynchronous (Events)
- Business modules communicate via domain events
- Events published to outbox, consumed by subscribers
- Example: `sales` module publishes `OrderCreated` event, `finance` and `inventory` modules react

### Event Schema
```typescript
interface DomainEvent {
  id: string;
  type: string;
  timestamp: Date;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  data: Record<string, unknown>;
  causationId?: string;
  correlationId?: string;
}
```

## Module Lifecycle

### Creating a New Module
1. Create directory under `modules/` or `platform/`
2. Define domain layer (entities, repositories, events)
3. Define application layer (handlers, services, DTOs)
4. Define infrastructure layer (persistence, external clients)
5. Define presentation layer (controllers, routes)
6. Add module to the dependency graph
7. Update module boundaries documentation
8. Add integration tests

### Module Registry
All modules are registered in a central module registry that:
- Defines module metadata (name, version, dependencies)
- Provides module initialization and shutdown hooks
- Manages module configuration
- Enables/disables modules via feature flags

## Data Ownership

### Module Data Ownership Rules
1. Each module owns its data collections/tables
2. Other modules can READ a module's data only through that module's API
3. A module can REFERENCE another module's data by ID only
4. No module should directly query another module's database collection

### Shared Data
- **Master Data**: Managed by `master-data` module
- **User Data**: Managed by `iam` module
- **Tenant Data**: Managed by `tenancy` module
- **Audit Data**: Managed by `audit` module

## Versioning and Compatibility

### Module Versioning
- Each module has a semantic version
- Breaking changes require version bump and migration guide
- Modules communicate via interfaces; interface changes are versioned
- Backward compatibility maintained within the same major version

### API Versioning
- API endpoints are versioned (`/api/v1/`)
- Module internal APIs are not versioned (internal to the service)
- Module interfaces (ports) are not versioned (internal contracts)

## Migration Guidelines

### Extracting a Module to a Microservice
1. Define clear module boundaries and interfaces
2. Implement module-level database access abstraction
3. Replace direct calls with event-based communication
4. Add module-specific configuration
5. Deploy module as separate service with backward compatibility
6. Route traffic to new service via API gateway
7. Monitor for errors and performance issues
8. Remove old module code from monolith
