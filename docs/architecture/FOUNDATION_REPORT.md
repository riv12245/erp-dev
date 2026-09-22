# Foundation Report

**Document**: FOUNDATION_REPORT.md  
**Version**: 1.1.0  
**Last Updated**: September 21, 2026  
**Status**: Active

> This report describes the foundation **as built and verified** in this repository, not an aspirational
> design. Every statistic below was produced by running the tooling in the repo (`npm run check`,
> `npx turbo run typecheck build test`).

## Executive Summary

The ERP Platform is a modular-monolith monorepo built with npm workspaces + Turborepo. The foundation
phase is complete: the API, worker, shared packages, two frontends, a real CI pipeline, a validated
OpenAPI contract, and a native Kotlin client all exist, compile, and are covered by automated checks
and tests. Remaining work is business-module feature depth and operational hardening (Docker,
migrations, E2E), not foundation scaffolding.

## Section 1: Platform Overview

### 1.1 Key Statistics (verified)

- **Business modules**: 13 (`bookings, crm, eshop, field-service, finance, hr, inventory, logistics,
  master-data, production, projects, purchasing, sales`)
- **Platform modules**: 8 (`audit, auth, events, iam, observability, outbox, tenancy, workflow`)
- **Shared packages**: 10 (`api-client, auth, contracts, design-tokens, localization, permissions,
  shared, ui, utils, validation`)
- **Services**: 2 (`@erp/api`, `@erp/worker`) — **Apps**: 2 (`@erp/web`, `@erp/mobile`)
- **Other deliverable**: native Kotlin client under `clients/kotlin-android`
- **Automated checks**: `check:architecture` (66 API files, 0 warnings), `check:imports` (123 files,
  0 cycles), `check:tenant-scope` (0 violations) — all green
- **Workspace pipeline**: `npx turbo run typecheck build test` — 35 tasks, all green
- **OpenAPI**: `openapi/erp-api.yaml` (OpenAPI 3.1) parses, all 188 `$ref`s resolve (verified), and
  documents 22 paths + `components.{schemas,responses,parameters,requestBodies,securitySchemes}`
- **Languages**: TypeScript (strict) throughout; Kotlin for the native client
- **Database**: MongoDB via Mongoose (connection string driven; `MONGO_URI`, not Atlas-specific)
- **Queue/worker**: Redis via ioredis for worker delivery (optional; worker tests skip otherwise)
- **Build orchestrator**: Turborepo 2.x, npm workspaces
- **Testing**: Vitest (JS/TS) + kotlin.test (Kotlin)

## Section 2: Architecture Assessment

### 2.1 Modular Monolith

A single deployable Express API with strict internal layering, enforced mechanically:

- **Layers per module**: `application/` (services/use cases), `domain/` (models, domain events),
  `infrastructure/` (Mongoose repositories), plus `routes`.
- **Platform vs modules vs shared**: `platform/` (auth, tenancy, audit, outbox, events, iam,
  workflow, observability) provides cross-cutting infrastructure; `shared/` provides errors,
  serializers, middleware, types; business modules sit on top.
- **Enforcement**: `scripts/check-architecture.mjs` bans forbidden dependencies (e.g. `shared/`
  importing business modules); `check-imports.mjs` detects cycles (>0 tolerated in the graph);
  `check-tenant-scope.mjs` verifies every repository enforces a tenant filter or declares an
  exemption (master data / global reference data).
- **Module extraction readiness**: modules are isolated behind repository/application-service
  boundaries and communicate via domain events + outbox, but other modules still import them
  directly through their routers — readiness is high, extraction is a documented future decision,
  not a current state.

### 2.2 Multi-Tenancy

- Tenant context middleware resolves `x-tenant-id` per request; protected routes return
  `401 TENANT_CONTEXT_MISSING` when missing.
- Repositories use a shared `TenantScopedRepository` base with `tenantFilter`.
- Asset isolation modes are modeled on the tenant document (`isolationMode`, plan) and enforced at
  the query layer.

### 2.3 Messaging

- `platform/events` defines domain events with an in-memory bus for local dispatch.
- `platform/outbox` persists outgoing events to MongoDB and the worker relays them (RabbitMQ /
  Redis delivery); worker integration tests require a live broker and otherwise self-skip.

## Section 3: Technology Assessment

### 3.1 TypeScript

Strict mode throughout, `verbatimModuleSyntax`-style ESM, project references-free turbo dependency
graph with `@erp/*` alias to `packages/*/src/index.js`. Type checks across all workspaces pass.
No blanket "no `any`" guarantee is claimed; ESLint must be treated as advisory (see lint config per
workspace).

### 3.2 Authentication (as built)

- **Passwords**: PBKDF2-SHA256 via the Web Crypto API, per-user random salt, configurable iteration
  count; serialized as `pbkdf2-sha256:<iterations>:<salt>:<hash>` (`@erp/auth`).
- **JWT**: dependency-free HS256 sign/verify with `iat`/`exp`, `@erp/auth`.
- **Sessions**: single access token; **no refresh tokens / rotation** (roadmap).
- **Brute-force**: per-account failed-attempt counter with 15-minute lockout and `locked` status.
- **MFA**: not implemented (roadmap).

### 3.3 API

Express + Mongoose, `helmet`, `cors`, global rate limiting, JSON body limits, correlation IDs on
every request/response, a shared error envelope, and a read-only audit endpoint. The API currently
exposes auth (register/login/me), tenants (context/profile), master data (countries), audit, health
and status; the business-module routes are scaffolding.

### 3.4 Observability

- `platform/observability` implements structured logging + request correlation. **No OpenTelemetry
  code exists** — prior documentation references to OTLP/OpenTelemetry are aspirational.

## Section 4: Security Assessment

| Area | Status |
|------|--------|
| Transport hardening | helmet, cors allow-list, rate limiting, `app.disable('x-powered-by')` |
| Auth | PBKDF2-SHA256 + HS256 JWT + brute-force lockout + account statuses |
| Multi-tenancy | middleware-enforced tenant resolution; tenant-scoped repositories (mechanically checked) |
| Input validation | custom `@erp/validation` (regex/type/format validators); **Joi is not used** |
| Audit | append-only `audit` collection with read endpoint |
| Secrets | env-driven config; `.env.*local` gitignored; no committed credentials |
| npm audit | 29 advisories (21 moderate, 7 high, 1 critical) at last check — **remediation backlog open** |

**Roadmap**: MFA, refresh-token rotation, field-level encryption, formal compliance (SOC 2/GDPR
artifacts), SCA gate in CI (currently `continue-on-error`).

## Section 5: Testing Assessment (as built)

| Suite | Runner | Tests | State |
|-------|--------|-------|-------|
| API service | Vitest + mongodb-memory-server | 8 files / 46 | green |
| Worker | Vitest | 3 files / 13 (+2 skip without broker/redis) | green |
| Shared packages | Vitest | 14 files / 67 (`auth`, `permissions`, `validation`, `utils`, `localization`) | green |
| Kotlin client | kotlin.test | 10 | green |

- CI runs the full `turbo run typecheck build test` pipeline plus `npm run check` and an OpenAPI
  parse validation on every push/PR.
- **Not present (roadmap)**: E2E (Playwright/Detox), performance/load, and enforced coverage
  thresholds; `test:integration`/`test:e2e` turbo tasks exist in root scripts but no workspace
  defines them yet.

## Section 6: Documentation Assessment

- **OpenAPI 3.1**: `openapi/erp-api.yaml` reconciled with the implemented surface (status, me,
  master-data/countries added; reuse of `components.parameters`/`requestBodies` fixed); README
  distinguishes implemented endpoints from contractual roadmap (companies, users CRUD, roles,
  permissions, refresh/logout).
- **ADRs**: 7 ADRs (monolith, MongoDB, tenancy, RN web, outbox, RBAC, strict TS).
- **Architecture docs**: ARCHITECTURE, MODULE_BOUNDARIES, TENANCY, OUTBOX, EVENTS, DATABASE,
  SECURITY, TEST_STRATEGY, DEVELOPMENT, FRONTEND_ARCHITECTURE, NATIVE_ANDROID, INITIAL_AUDIT.

## Section 7: CI/CD and Developer Tooling

- **CI** (`.github/workflows/ci.yml`): 6 jobs — repo checks (architecture/imports/tenant-scope +
  OpenAPI parse), lint, typecheck, build (+artifact upload), tests (with a MongoDB service for the
  worker), and a non-blocking `npm audit` job. No `|| true` gates remain.
- **Dev scripts** (root `npm run`): `check`, `check:architecture|imports|tenant-scope`, `seed:dev`
  (idempotent tenant/user seeder; `--reset` supported), plus `typecheck`, `lint`, `build`, `test`
  through turbo.
- **Kotlin client**: Gradle Kotlin DSL + version catalog, JVM 17 bytecode, verified `gradle build`.

## Section 8: Risks and Roadmap

### 8.1 Open Risks

1. **npm audit**: 1 critical + 7 high advisories unaddressed.
2. **Business module depth**: 13 module routers are scaffolding; no money/stock-critical logic yet.
3. **No Docker / no migrations machinery**: deployment and schema evolution not yet documented or
   tooled (worker/API rely on a reachable MongoDB).
4. **Mobile native layer**: `apps/mobile` has no `android/` gradle project; the Kotlin client exists
   as a standalone library; NATIVE_ANDROID.md is partially aspirational.
5. **Observability**: logging + correlation only; no OTel, metrics, or dashboards.
6. **Lint**: ci lint job runs, but per-workspace ESLint configs vary in strictness; `@erp/shared`
   has no lint task.
7. **Auth roadmap items** (refresh rotation, MFA, logout/refresh endpoints) are contractually
   documented but not implemented.

### 8.2 Recommended Next Steps

1. Clear the npm audit backlog (upgrade transitive deps; then fail CI on `audit-level=high`).
2. Add Docker Compose (MongoDB + Redis + api + worker + web) — biggest confidence multiplier for
   running the foundation.
3. Add a lightweight migration path (Mongo change-stream/migration scripts) and a `db:migrate`
   turbo task.
4. Fill in one full reference business module end-to-end (e.g. sales order lifecycle) to validate
   the module template before deepening the rest.
5. Implement refresh-token rotation + logout to close the auth contract the OpenAPI already
   promises, then wire `test:integration`/`test:e2e`.
6. Land the mobile `android/` gradle scaffold and consume `clients/kotlin-android` from it.

## Conclusion

The foundation is real, mechanical, and verified: 126 JS/TS tests + 10 Kotlin tests green, 35 turbo
tasks green, three structural checks green, a working seeder, an OpenAPI contract that matches the
code, a functioning CI pipeline, and a compilable Kotlin client. The platform is ready for
business-module feature work; operational concerns (Docker, migrations, audit backlog, HTTP contract
closures) are the immediate follow-ups rather than scaffolding gaps.