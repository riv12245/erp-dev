# Module Directory

**Document**: docs/modules/README.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

This directory contains documentation for all modules in the ERP Platform. Modules are organized into platform modules and business modules, each with its own documentation covering architecture, interfaces, and implementation details.

## Module Categories

### Platform Modules
Platform modules provide shared infrastructure and cross-cutting concerns.

| Module | Description | Documentation |
|--------|-------------|---------------|
| **auth** | Authentication and authorization | [See docs](#auth) |
| **iam** | Identity and access management | [See docs](#iam) |
| **tenancy** | Multi-tenant infrastructure | [See docs](#tenancy) |
| **audit** | Audit logging and compliance | [See docs](#audit) |
| **workflow** | Workflow automation engine | [See docs](#workflow) |
| **feature-flags** | Feature flag management | [See docs](#feature-flags) |
| **notifications** | Notification delivery | [See docs](#notifications) |
| **localization** | Multi-language support | [See docs](#localization) |
| **documents** | Document management | [See docs](#documents) |
| **integrations** | Third-party integrations | [See docs](#integrations) |
| **observability** | Monitoring and tracing | [See docs](#observability) |

### Business Modules
Business modules implement domain-specific ERP functionality.

| Module | Description | Documentation |
|--------|-------------|---------------|
| **master-data** | Core reference data | [See docs](#master-data) |
| **crm** | Customer relationship management | [See docs](#crm) |
| **sales** | Sales management | [See docs](#sales) |
| **inventory** | Inventory management | [See docs](#inventory) |
| **finance** | Financial management | [See docs](#finance) |
| **hr** | Human resources management | [See docs](#hr) |
| **procurement** | Procurement management | [See docs](#procurement) |
| **manufacturing** | Manufacturing operations | [See docs](#manufacturing) |
| **logistics** | Logistics and shipping | [See docs](#logistics) |
| **projects** | Project management | [See docs](#projects) |
| **analytics** | Business intelligence | [See docs](#analytics) |
| **assets** | Asset management | [See docs](#assets) |
| **service** | Service and support | [See docs](#service) |

## Module Documentation Template

Each module should have the following documentation:

```
modules/{module-name}/
├── README.md           # Module overview and setup
├── ARCHITECTURE.md     # Module architecture details
├── API.md              # API endpoints and contracts
├── EVENTS.md           # Domain events
├── SCHEMAS.md          # Database schemas
└── TESTING.md          # Testing guidelines
```

### Module README Contents
1. Module description and purpose
2. Dependencies (platform and business modules)
3. Installation and setup instructions
4. Configuration options
5. Key interfaces and contracts
6. Related ADRs

### Module Architecture
1. Domain model description
2. Aggregates and entities
3. Repository interfaces
4. Application services
5. Infrastructure implementations
6. Presentation layer (controllers/routes)

## Module Interaction Guidelines

### Communication Patterns
- **Direct calls**: Only within platform modules
- **Domain events**: Between business modules
- **Shared data**: Through master-data module
- **Cross-module queries**: Through API layer only

### Dependency Rules
- Platform modules can depend on each other
- Business modules depend on platform modules
- Business modules communicate via domain events only
- No business module directly calls another business module

## Adding a New Module

1. Create the module directory structure following the hexagonal pattern
2. Add module documentation to this directory
3. Update `MODULE_BOUNDARIES.md` with the new module
4. Register the module in the module registry
5. Add module to the dependency graph
6. Create ADR if the module represents a significant architectural decision
7. Write comprehensive tests

## Related Documents
- [Architecture Documentation](../ARCHITECTURE.md)
- [Module Boundaries](../MODULE_BOUNDARIES.md)
- [Events Documentation](../EVENTS.md)
