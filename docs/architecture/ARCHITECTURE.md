# Architecture Documentation

**Document**: ARCHITECTURE.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

The ERP Platform is a modular monolith application designed for enterprise resource planning. It combines the simplicity of a monolithic deployment with the modularity of microservices, enabling rapid development while maintaining clear domain boundaries.

## Architectural Principles

### 1. Modular Monolith
The application is structured as a single deployable unit but organized into clearly defined modules. Each module has its own domain logic, application layer, infrastructure, and presentation layer. Modules communicate through well-defined interfaces and domain events.

### 2. Domain-Driven Design (DDD)
- **Bounded Contexts**: Each business module represents a bounded context with its own ubiquitous language
- **Aggregates**: Domain entities are organized around aggregates that enforce consistency boundaries
- **Domain Events**: State changes are captured as domain events for cross-module communication
- **Ubiquitous Language**: Shared vocabulary defined within each module

### 3. Hexagonal Architecture (Ports & Adapters)
Each module follows the hexagonal pattern:
- **Domain Layer**: Core business logic, entities, value objects, domain events, repository interfaces
- **Application Layer**: Use cases, application services, DTOs, input/output boundaries
- **Infrastructure Layer**: Database implementations, external service clients, message brokers
- **Presentation Layer**: REST controllers, GraphQL resolvers, API handlers

### 4. Multi-Tenancy
All data is scoped to a tenant. Tenant context is propagated through request headers and thread-local storage. Each tenant has isolated data, users, roles, and configurations.

### 5. Event-Driven Architecture
Domain events are published when state changes occur. The outbox pattern ensures reliable event delivery. Events are consumed by other modules to trigger downstream actions.

### 6. CQRS (Command Query Responsibility Segregation)
Read and write operations are separated. Commands create/modify state, queries retrieve state. This separation allows independent optimization of read and write paths.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Clients                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Web App │  │ Mobile   │  │  API     │                  │
│  │  (React) │  │(React Native)│ Client │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
└───────┼──────────────┼──────────────┼──────────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway / Load Balancer                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   ERP API Service (Express)                  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Platform Modules                        │   │
│  │  Auth │ IAM │ Tenancy │ Audit │ Workflow │ Docs    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Business Modules                        │   │
│  │  CRM │ Finance │ HR │ Inventory │ Sales │ etc.     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Shared Infrastructure                   │   │
│  │  Errors │ Middleware │ Validators │ Types │ Helpers │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│  MongoDB   │ │   Redis    │ │ PostgreSQL │
│  (Primary  │ │  (Cache &  │ │  (If used  │
│   Store)   │ │   Queue)   │ │   for PG)  │
└────────────┘ └────────────┘ └────────────┘
```

### Module Structure

Every module follows this directory structure:

```
module-name/
├── domain/
│   ├── entities/          # Domain entities
│   ├── repositories/      # Repository interfaces
│   ├── services/          # Domain services
│   ├── events/            # Domain events
│   └── value-objects/     # Value objects
├── application/
│   ├── handlers/          # Command/query handlers
│   ├── services/          # Application services
│   ├── dto/               # Data transfer objects
│   └── ports/             # Port interfaces
├── infrastructure/
│   ├── persistence/       # Database implementations
│   ├── external/          # External service clients
│   └── messaging/         # Message handling
├── presentation/
│   ├── controllers/       # HTTP controllers
│   ├── routes/            # Route definitions
│   ├── middleware/        # Module-specific middleware
│   └── validators/        # Request validators
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Domain Layer

#### Entities
Entities are the core business objects with identity and lifecycle. Each entity has:
- A unique identifier (UUID)
- Business invariants enforced within aggregate boundaries
- State transitions governed by domain rules

#### Value Objects
Value objects represent concepts without identity:
- Immutable by design
- Equality based on attributes, not identity
- Examples: Address, Money, Email, DateRange

#### Domain Events
Events capture something meaningful that happened in the domain:
- Published when aggregate state changes
- Carried in the outbox for reliable delivery
- Consumed by other modules to trigger reactions

#### Repository Interfaces
Define the contract for data access:
- Pure TypeScript interfaces
- Implementation varies by infrastructure (MongoDB, Redis, etc.)
- Enable unit testing with mocks

### Application Layer

#### Use Cases
Application services orchestrate domain logic:
- Receive commands/queries from the presentation layer
- Load aggregates through repository interfaces
- Execute domain logic
- Persist changes through repositories
- Publish domain events

#### Commands and Queries
- **Command**: Request to create/modify state (e.g., CreateUserCommand)
- **Query**: Request to retrieve state (e.g., GetUserQuery)
- Each has its own handler with specific input/output types

#### DTOs (Data Transfer Objects)
- Shape data for the presentation layer
- Validate input before passing to domain
- Separate internal models from external contracts

### Infrastructure Layer

#### Persistence
- Mongoose models for MongoDB document mapping
- Repository implementations for data access
- Connection management and pooling
- Index definitions for query optimization

#### External Services
- Third-party API clients
- Email/SMS notification services
- Payment gateway integrations
- File storage services

#### Messaging
- Event bus for domain events
- Outbox pattern implementation
- Message serialization and deserialization
- Dead letter queue handling

### Presentation Layer

#### Controllers
- Express route handlers
- Parse and validate request input
- Call application layer services
- Format responses according to the standard format
- Handle errors and return appropriate HTTP status codes

#### Middleware
- Authentication middleware (JWT validation)
- Tenant resolution middleware (x-tenant-id header)
- Request logging and correlation ID propagation
- Rate limiting middleware
- Error handling middleware

## Data Flow

### Request Flow
1. **Client** sends HTTP request with Authorization header and x-tenant-id
2. **Express** receives request through router
3. **Middleware** chain:
   - Request logging (pino-http)
   - CORS validation
   - Rate limiting
   - JWT authentication
   - Tenant resolution
   - Request context setup (correlationId, requestId)
4. **Controller** validates input using Joi/Celebrate
5. **Application Service** processes the command/query
6. **Domain** executes business logic
7. **Repository** persists changes to MongoDB
8. **Domain Events** published to outbox
9. **Response** formatted and returned to client

### Event Flow
1. **Domain** state change triggers domain event
2. **Event** is stored in the outbox table/collection
3. **Outbox Worker** polls for new events
4. **Event Publisher** publishes to message broker
5. **Subscribers** consume events and execute reactions
6. **Acknowledgment** removes event from outbox

## Module Dependencies

### Platform Module Dependency Graph
```
Tenancy ──┬──► Auth
          ├──► IAM
          ├──► Audit
          ├──► Feature Flags
          ├──► Notifications
          └──► Localization

IAM ──────► Auth
IAM ──────► Users
Auth ─────► Users
Audit ────► (all modules)
Workflow ──► (all modules)
```

### Business Module Dependency Guidelines
- Business modules can depend on platform modules
- Business modules should NOT directly depend on other business modules
- Cross-module communication happens through domain events
- Shared data through master-data module

## Multi-Tenancy Architecture

### Tenant Resolution
1. Request arrives with `x-tenant-id` header
2. Middleware resolves tenant context
3. Tenant context stored in request context
4. All subsequent operations scoped to tenant

### Data Isolation
- Every document in MongoDB includes `tenantId` field
- All queries automatically filter by tenantId
- Tenant-level access control enforced at the middleware layer
- Cross-tenant access requires explicit admin privileges

### Tenant Configuration
- Each tenant has its own subscription plan
- Feature flags are tenant-scoped
- Settings are per-tenant
- Resource limits (users, storage) enforced per tenant

## Security Architecture

### Authentication
- JWT-based authentication with access and refresh tokens
- Access tokens: short-lived (15 minutes default)
- Refresh tokens: long-lived (7 days default)
- Token rotation on refresh
- Secure token storage on client side

### Authorization
- Role-Based Access Control (RBAC)
- Permissions assigned to roles
- Users assigned one or more roles
- Permission checks enforced at controller level
- Tenant-scoped permissions

### Data Protection
- Sensitive data encrypted at rest
- PII masked in logs
- Audit trails for all data modifications
- Input validation and sanitization
- SQL/NoSQL injection prevention

### Network Security
- HTTPS enforced in production
- CORS configured per environment
- Helmet for HTTP header security
- Global rate limiting (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`, default 100 per 15 min); per-tenant
  quotas and IP whitelisting are roadmap

## Observability Architecture

### Logging
- **Structured Logging**: All logs are JSON formatted
- **Logger**: Built-in structured logger in `platform/observability/logger.ts` (5 levels, `child()`
  context, tenant/user/correlation labels). Pino/Winston/Morgan are **not** used.
- **Correlation IDs**: Every request has a unique correlation ID propagated through responses and
  log entries
- **Log Levels**: debug, info, warn, error configured per environment

### Tracing
- **Status**: Not implemented. Correlation IDs provide request linkage; OpenTelemetry /
  OTLP-exported spans are roadmap, not current behavior.

### Metrics
- **Status**: Not implemented. Prometheus/metric endpoints are roadmap.

### Health Checks
- `/health` - Basic process liveness
- `/health/ready` - Dependency readiness
- `/health/live` - Container liveness probe
- `/api/v1/status` - Versioned API status probe

## Scalability Strategy

### Vertical Scaling
- Optimize database queries and indexing
- Increase server resources (CPU, RAM)
- Connection pooling for MongoDB and Redis

### Horizontal Scaling (Future)
- Stateless API servers behind load balancer
- Shared Redis for session/cache management
- MongoDB sharding for data volume
- Separate worker processes for outbox processing

### Caching Strategy
- Redis for session caching
- Redis for query result caching
- Cache invalidation on data changes
- TTL-based cache expiration

## Deployment Architecture

### Development
- Single Docker Compose or local services
- All services run locally with hot reload
- Environment-specific configuration via `.env.local`

### Production
- Containerized deployment (Docker)
- Orchestrated via Kubernetes or similar
- Horizontal pod autoscaling
- Health check probes configured
- Blue/green or rolling deployments
- CI/CD pipeline automated

### CI/CD Pipeline
- Source code changes trigger pipeline
- Run lint, typecheck, unit tests
- Build artifacts for all packages
- Run integration tests
- Deploy to staging environment
- Run e2e tests
- Deploy to production

## Technology Decisions Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | TypeScript | Type safety, shared types across stack |
| Runtime | Node.js >= 20 | Modern features, performance |
| Framework | Express | Mature ecosystem, middleware architecture |
| Database | MongoDB (via `MONGO_URI`) | Flexible schema, tenant-scoped collections |
| Cache/Queue | Redis (worker, optional) | Outbox relay delivery; not required by the API |
| ODM | Mongoose | Schema validation, rich query API |
| Auth | JWT (HS256) + PBKDF2-SHA256 | Dependency-free `@erp/auth`; brute-force lockout |
| Validation | `@erp/validation` | Custom validators; Joi is not used |
| Logging | Built-in structured logger | JSON, correlation IDs (no Pino/Winston) |
| Tracing | Not implemented | Correlation IDs only; OTel is roadmap |
| Testing | Vitest (+ kotlin.test) | Fast, Vite-native, TypeScript support |
| Build | Turborepo | Monorepo-aware pipeline execution |
| Mobile | React Native + Kotlin client | Cross-platform; native layer under `clients/kotlin-android` |
| Web | React (React Native Web) | Component-based, rich ecosystem |

## Glossary

- **Bounded Context**: A clearly defined boundary within which a particular model applies
- **Aggregate**: A cluster of domain objects treated as a single unit for data changes
- **Domain Event**: An event that represents something meaningful happening in the domain
- **CQRS**: Command Query Responsibility Segregation pattern
- **Outbox**: Pattern for reliably publishing domain events
- **Tenant**: An organization or customer using the ERP platform
- **Correlation ID**: Unique identifier tracing a request across services
- **Idempotency**: Property ensuring identical operations produce same result
- **RBAC**: Role-Based Access Control
