# Development Guide

**Document**: DEVELOPMENT.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

This document provides comprehensive instructions for setting up the development environment, contributing code, and running the ERP Platform.

## Prerequisites

### Required Software
- **Node.js**: >= 22.12.0 (CI: Node 22; Windows validation: Node 24.18 / npm 11.16)
- **npm**: >= 10.0.0
- **MongoDB Atlas** connection string (or local MongoDB)
- **Redis**: Local or cloud instance
- **Git**: Version control system

### Recommended IDE
- **VS Code** with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Vitest
  - MongoDB
  - GitLens

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/ErickRFM/erp-dev.git
cd erp-dev
```

### 2. Install Dependencies
```bash
npm ci --ignore-scripts --no-audit
npm run deps:prepare
npm run build
```

### 3. Configure Environment
```bash
cp .env.example services/api/.env
# Edit services/api/.env with your own development URI and random JWT_SECRET
```

### 4. Set Up Database
```bash
# MongoDB Atlas connection string
# Add privately to services/api/.env only if using Atlas development:
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/erp_dev
MONGODB_DB_NAME=erp_dev

# Redis
REDIS_URL=redis://localhost:6379
```

### 5. Seed Development Data
```bash
npm run seed:dev
```

### 6. Start Development
```bash
# Start all services
npm run dev

# Start API only
npm run dev:api

# Start web only
npm run dev:web

# Start mobile only
npm run dev:mobile
```

### 7. Verify Health
```bash
curl http://localhost:3000/health
# Expected: { "status": "ok", ... }; /health/ready separately checks Mongo readiness
```

### Reproducible scripts and validation

`npm ci --ignore-scripts --no-audit` installs exactly the lock without lifecycle scripts. `npm run deps:prepare` enables only the reviewed exact versions esbuild 0.28.2 and mongodb-memory-server 10.4.3. Review provenance and update this command when changing either locked version. npm 11 `allowScripts` warnings are advisory by default, so a warning alone does **not** establish that a script was blocked. The two-command policy works with npm 10 CI and npm 11 locally. Husky is optional (`npm run prepare`), not part of the selected dependency rebuild. Never mix npm and pnpm against the same node_modules tree.

The API development/seed scripts load `services/api/.env`; the worker reads exported environment variables, not this file. Web uses `VITE_API_URL` (Vite environment); Android uses `ERP_API_URL` at Gradle build time. `CORS_ORIGIN` is the API's comma-separated exact origin allowlist; `CORS_ORIGIN_WEB` is not consumed. Refresh tokens are opaque, so `JWT_REFRESH_SECRET` is obsolete. Password hashing uses the existing PBKDF2 implementation, not `BCRYPT_ROUNDS`.

```sh
npm run check
npm run lint
npm run typecheck
npm test -- --force
npm run bundle:android -w @erp/mobile
```

Tests start real ephemeral MongoDB processes, including replica sets for outbox/inbox transactions. API tests override inherited Mongo URIs and never load the development `.env`. Start a **local test Redis** at `redis://127.0.0.1:6379` for Redis integration; CI supplies Redis 7 and fails if absent. Without Redis, the conditional Redis test is unverified even when other tests pass. `npm audit --json` returns nonzero for findings; do not use `audit fix --force`.

The seed refuses production and database names outside `erp_dev` / `erp_test*`; destructive demo reset additionally requires `SEED_DEV=true`. Use a new test database when verifying the seed. Default seed is idempotent and does not delete unrelated records. Native build/device validation is documented separately in `ANDROID_DEVELOPMENT.md`.

## Project Structure

```
erp/
├── apps/
│   ├── web/              # React web application
│   └── mobile/           # React Native mobile application
├── packages/             # Shared libraries
│   ├── api-client/
│   ├── auth/
│   ├── contracts/
│   ├── design-tokens/
│   ├── localization/
│   ├── permissions/
│   ├── ui/
│   ├── utils/
│   └── validation/
├── services/
│   └── api/              # Core API service
│       ├── src/
│       │   ├── bootstrap/
│       │   ├── config/
│       │   ├── modules/    # 13 business modules
│       │   ├── platform/   # 11 platform modules
│       │   └── shared/
│       ├── package.json
│       └── tsconfig.json
├── config/               # Application configuration
├── scripts/              # Development scripts
├── docs/                 # Documentation
├── openapi/              # OpenAPI specifications
├── package.json          # Root workspace config
├── tsconfig.base.json    # Base TypeScript config
└── turbo.json            # Turborepo pipeline config
```

## Development Commands

### Package Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in parallel |
| `npm run dev:api` | Start API service with hot reload |
| `npm run dev:web` | Start web application |
| `npm run dev:mobile` | Start mobile development server |
| `npm run build` | Build all packages and services |
| `npm run lint` | Lint all packages and services |
| `npm run typecheck` | Type-check all packages and services |
| `npm run test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run security:audit` | Run npm security audit |

### Turbo Pipeline
```bash
# Build a specific package
npx turbo run build --filter=@erp/api

# Run tests for all packages
npx turbo run test

# Lint changed files
npx turbo run lint --since=main
```

### API Development
```bash
# Start API in development mode (tsx watch)
npm run dev:api

# Run unit tests for API
npx vitest run --filter=@erp/api

# Run type check
npx tsc --noEmit --project services/api/tsconfig.json
```

### Web Development
```bash
# Start web dev server
npm run dev:web

# Build web for production
npx turbo run build --filter=@erp/web
```

### Mobile Development
```bash
# Start Metro bundler
npx react-native start

# Run on Android
npx react-native run-android

# Run on iOS
npx react-native run-ios
```

## Coding Standards

### TypeScript
- **Strict mode**: All strict TypeScript options enabled
- **No `any`**: Use proper types or `unknown`
- **Explicit types**: Function parameters and return types
- **Imports**: Use `@erp/*` aliases for workspace imports
- **Naming**: PascalCase for types, camelCase for functions/variables

### Code Style
- **Prettier**: Automatic code formatting
- **ESLint**: All rules enforced, zero warnings/errors
- **Imports**: Sorted imports, no unused imports
- **Comments**: Minimal comments; code should be self-documenting
- **Documentation**: JSDoc for public APIs only

### File Organization
```
service/
├── domain/
│   ├── entities/
│   ├── repositories/
│   ├── services/
│   ├── events/
│   └── value-objects/
├── application/
│   ├── handlers/
│   ├── services/
│   ├── dto/
│   └── ports/
├── infrastructure/
│   ├── persistence/
│   ├── external/
│   └── messaging/
├── presentation/
│   ├── controllers/
│   ├── routes/
│   └── middleware/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Testing in Development

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npx vitest

# Run specific test file
npx vitest run tests/unit/user.test.ts

# Run tests with coverage
npx vitest run --coverage

# Run integration tests
npx vitest run --config vitest.integration.config.ts
```

### Test Workflow
1. Write test first (TDD)
2. Run test to see it fail
3. Implement minimal code to pass
4. Run test to see it pass
5. Refactor code
6. Run all tests to ensure no regressions
7. Commit changes

## Debugging

### Node.js Debugging
- **VS Code**: Use built-in Node.js debugger
- **Chrome DevTools**: `node --inspect` flag
- **console.log**: Structured logging with pino
- **Debug logging**: `LOG_LEVEL=debug` in `.env.local`

### MongoDB Debugging
- **MongoDB Compass**: GUI for querying and inspecting data
- **mongosh**: CLI for MongoDB shell access
- **Query logging**: Enable Mongoose debug mode
- **Slow query logging**: MongoDB profiler for slow queries

### React Debugging
- **React DevTools**: Browser extension for React component inspection
- **Redux DevTools**: State management debugging
- **Flipper**: React Native debugging
- **React Profiler**: Performance profiling

### API Debugging
- **Postman**: Test API endpoints
- **curl**: Command-line API testing
- **Built-in structured JSON logger**: Request-level correlation IDs
- **OpenTelemetry**: Roadmap (not yet implemented)

## Git Workflow

### Branch Strategy
```
main          → Production-ready code
develop       → Integration branch
feature/*     → Feature branches
bugfix/*      → Bug fix branches
hotfix/*      → Hotfix branches
release/*     → Release preparation
```

### Commit Messages
```
<type>(<scope>): <subject>

<body>

<footer>
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Run all tests and linting locally
4. Push branch and open PR
5. Code review by at least one team member
6. CI/CD pipeline runs automatically
7. Merge to `develop` after approval
8. Release branch when ready for production

## Environment Configuration

### Development (`.env.local`)
```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=erp_dev
JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=15m
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

### Production (`.env.production`)
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=erp_prod
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=15m
CORS_ORIGIN=https://erp.local
LOG_LEVEL=error
```

### Testing (`.env.test`)
```bash
NODE_ENV=test
PORT=3000
MONGODB_URI=mongodb://localhost:27017/erp_test
MONGODB_DB_NAME=erp_test
JWT_SECRET=test-secret
LOG_LEVEL=debug
```

## Docker Development

### Local Development with Docker
```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec api npx tsx scripts/migrate.ts

# Seed data
docker-compose exec api npx tsx scripts/seed-dev.ts

# View logs
docker-compose logs -f api
```

### Docker Compose Configuration
```yaml
services:
  api:
    build: ./services/api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongo:27017/erp_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
  mongo:
    image: mongo:8
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

## Contributing Guide

### Before Contributing
1. Read this document
2. Read relevant ADRs
3. Set up development environment
4. Run all tests to ensure green

### Making Changes
1. Create a feature branch
2. Write tests for new functionality
3. Implement the feature
4. Ensure all tests pass
5. Ensure linting passes
6. Update documentation if needed
7. Update OpenAPI spec if adding API endpoints
8. Create a pull request

### Code Review Checklist
- [ ] Tests added and passing
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Backward compatibility maintained
- [ ] Commit message follows convention

## Related Documents
- [Architecture Documentation](ARCHITECTURE.md)
- [Test Strategy](TEST_STRATEGY.md)
- [Security Documentation](SECURITY.md)
- [AI Working Rules](AI_WORKING_RULES.md)
