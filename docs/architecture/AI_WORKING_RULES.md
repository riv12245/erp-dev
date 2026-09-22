# AI Working Rules

**Document**: AI_WORKING_RULES.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

These are the 16 mandatory rules that AI assistants must follow when working with the ERP Platform codebase. Adherence to these rules ensures consistency, quality, and maintainability across all contributions, whether from human developers or AI systems.

## The 16 Rules

### Rule 1: Always Read Before Writing

**Statement**: Never write to a file without first reading its current contents.

**Rationale**: Overwriting files without reading them first can cause accidental data loss, break existing patterns, and introduce inconsistencies.

**Action**:
1. Use the Read tool to examine the file before any edit
2. Understand the file's purpose, structure, and conventions
3. If the file does not exist, confirm the target directory exists
4. When creating new files, check if similar files already exist

**Example**:
```
✅ Read the file first, then edit
❌ Write to a file without reading it
```

### Rule 2: Never Generate Fabricated Information

**Statement**: Never create documentation, configuration, or code that contains fabricated URLs, file paths, package names, or technical details that don't exist in the project.

**Rationale**: Fabricated information leads to broken references, incorrect documentation, and wasted debugging time.

**Action**:
1. Only reference files, packages, and APIs that exist in the project
2. If information is uncertain, state that clearly
3. Verify all URLs, paths, and package names against the actual project structure
4. When in doubt, search the codebase before asserting facts

**Example**:
```
✅ Use actual file paths from the project
❌ Invent URLs like "https://example.com/api/docs"
```

### Rule 3: Always Create Files with Write Tool, Never Bash Redirects

**Statement**: Always use the Write tool to create files. Never use bash commands with redirects (`>`) to create or overwrite files.

**Rationale**: The Write tool provides proper encoding handling, path validation, and content verification. Bash redirects in PowerShell can cause unexpected behavior and encoding issues.

**Action**:
1. Use the Write tool for all file creation and modification
2. Never use `echo > file`, `cat > file`, or similar bash redirects
3. For batch operations, use multiple Write calls in parallel
4. Verify the file was written correctly after creation

**Example**:
```
✅ Write tool for all file creation
❌ echo "content" > file.txt
```

### Rule 4: Always Verify File Structure After Creation

**Statement**: After creating files, verify the directory structure exists and the files are accessible.

**Rationale**: Missing directories cause Write tool failures, and unverified files may not be where they should be.

**Action**:
1. Ensure parent directories exist before writing files
2. Create directories with bash mkdir if needed
3. Verify file creation by reading the file after writing
4. Check for TypeScript compilation errors after creating configuration files

**Example**:
```
✅ Create dirs first, then write, then verify
❌ Assume directories exist and write fails silently
```

### Rule 5: Respect the Existing Project Structure and Architecture

**Statement**: Never alter the project structure, naming conventions, or architectural patterns without explicit instruction.

**Rationale**: The existing structure follows deliberate decisions documented in the ADRs. Changing it without cause introduces inconsistency and confusion.

**Action**:
1. Follow the existing directory structure under `apps/`, `packages/`, `services/`
2. Maintain the hexagonal architecture pattern (domain/application/infrastructure/presentation)
3. Respect the module boundaries defined in MODULE_BOUNDARIES.md
4. Use the existing naming conventions and code patterns
5. When adding new modules, follow the established structure

**Example**:
```
✅ Create new module under services/api/src/modules/
❌ Move files to different directories without instruction
```

### Rule 6: TypeScript Strict Mode Compliance

**Statement**: All code must comply with TypeScript strict mode as defined in `tsconfig.base.json`.

**Rationale**: Strict mode ensures type safety, catches bugs at compile time, and maintains code quality across the entire codebase.

**Action**:
1. Always specify types for function parameters and return values
2. Never use `any` type; use `unknown` instead
3. Handle all possible null/undefined cases
4. Use explicit return statements in all code paths
5. Ensure no unused variables or parameters
6. Run `tsc --noEmit` to verify before committing

**Example**:
```
✅ function getUser(id: string): User | undefined { ... }
❌ function getUser(id) { return null } // No types
```

### Rule 7: Follow the Standard API Response Format

**Statement**: All API responses must follow the standard success and error response formats defined in the OpenAPI specification.

**Rationale**: Consistent response formats make the API predictable, simplify client code, and enable automatic response handling.

**Action**:
1. Success responses: `{ success: true, data: {...}, correlationId: "..." }`
2. Error responses: `{ success: false, error: { code, message, details, correlationId } }`
3. Include `correlationId` in every response for tracing
4. Use the defined error codes from the ErrorDetail schema
5. Include meta/pagination information for list endpoints

**Example**:
```typescript
// ✅ Success
{ success: true, data: user, correlationId: "abc-123" }
// ✅ Error
{ success: false, error: { code: "NOT_FOUND", message: "...", correlationId: "abc-123" } }
```

### Rule 8: Always Include Correlation IDs

**Statement**: Every request and response must include a correlation ID for distributed tracing.

**Rationale**: Correlation IDs enable request tracing across services, debugging in production, and performance analysis.

**Action**:
1. Generate a UUID correlation ID for each incoming request
2. Propagate the correlation ID through all layers
3. Include correlation ID in all response objects
4. Log correlation ID with every log entry
5. Pass correlation ID through domain events

**Example**:
```typescript
const correlationId = uuid();
// Attach to request context, include in all responses
res.json({ success: true, data, correlationId });
```

### Rule 9: Never Skip Tests

**Statement**: Never commit code without associated tests, unless explicitly instructed otherwise.

**Rationale**: Untested code is unreliable and prone to regressions. Tests are a first-class requirement, not optional.

**Action**:
1. Write unit tests for all domain and application logic
2. Write integration tests for all repositories and controllers
3. Ensure all tests pass before committing
4. Include test files in the same directory structure as source files
5. Never use `test.skip` or `it.skip` in committed code
6. Aim for coverage targets defined in TEST_STRATEGY.md

**Example**:
```
✅ Every new function has a test file
❌ "I'll add tests later"
```

### Rule 10: Use the Design System and Shared Components

**Statement**: Always use shared UI components from `packages/ui` and design tokens from `packages/design-tokens`. Never create duplicate components.

**Rationale**: Reusing components ensures consistency, reduces maintenance burden, and prevents UI drift between applications.

**Action**:
1. Check `packages/ui` for existing components before creating new ones
2. Use design tokens for colors, spacing, typography, and shadows
3. Extend components rather than replacing them
4. Follow component API contracts defined in packages/ui
5. Use shared hooks from packages/ for common operations

**Example**:
```
✅ Use <Button variant="primary"> from packages/ui
❌ Create a custom Button component in each app
```

### Rule 11: Validate All Inputs with Joi/Celebrate

**Statement**: All incoming request data must be validated using Joi schemas via Celebrate middleware before any business logic executes.

**Rationale**: Input validation prevents invalid data from entering the system, protects against injection attacks, and provides clear error messages to clients.

**Action**:
1. Define Joi schemas for every request body, query parameter, and header
2. Use Celebrate middleware in all route handlers
3. Validate all inputs, including path parameters
4. Return appropriate validation error responses (code: VALIDATION_ERROR)
5. Never trust client-provided data without validation
6. Validate data at the controller layer AND the domain layer

**Example**:
```typescript
router.post('/users', celebrate({ body: userSchema }), createUser);
```

### Rule 12: Implement Multi-Tenancy Correctly

**Statement**: Every data operation must include tenant isolation. Never perform operations that could access or modify another tenant's data.

**Rationale**: Multi-tenant data isolation is a core security requirement. A leak of another tenant's data is a critical security incident.

**Action**:
1. Always include `tenantId` in database queries
2. Verify tenant ownership before allowing data access
3. Never expose tenant IDs to clients that shouldn't see them
4. Include tenantId in all audit logs
5. Use the TenantContext from request middleware for all operations
6. Test tenant isolation as part of integration tests

**Example**:
```typescript
// ✅ Tenant-scoped query
const users = await User.find({ tenantId: request.tenantId });
// ❌ Tenant-unscoped query
const users = await User.find();
```

### Rule 13: Follow the Repository Pattern

**Statement**: All data access must go through repository interfaces defined in the domain layer. Never access the database directly from the application or presentation layer.

**Rationale**: The repository pattern provides testability, separation of concerns, and the ability to swap data sources without changing business logic.

**Action**:
1. Define repository interfaces in domain/repositories/
2. Implement repositories in infrastructure/persistence/
3. Inject repositories via dependency injection
4. Never use Mongoose directly in controllers or application services
5. Mock repositories in unit tests
6. Keep database logic contained in repository implementations

**Example**:
```typescript
// ✅ Through repository
const user = await userRepository.findById(id);
// ❌ Direct Mongoose access
const user = await UserModel.findById(id);
```

### Rule 14: Use Domain Events for Cross-Module Communication

**Statement**: Modules must communicate through domain events published via the outbox pattern. Never call another module's functions directly for cross-module communication.

**Rationale**: Direct module coupling breaks the modular monolith architecture, makes testing difficult, and prevents independent module evolution.

**Action**:
1. Define domain events in domain/events/
2. Emit events when aggregate state changes
3. Publish events to the outbox collection
4. Subscribe to events in the application layer
5. Keep event handlers idempotent
6. Never import from another module's application or presentation layer

**Example**:
```typescript
// ✅ Emit event
await eventBus.emit(new OrderCreatedEvent(orderId, tenantId));
// ❌ Direct call
await financeModule.processOrder(orderId);
```

### Rule 15: Always Update Documentation When Changing Code

**Statement**: Any change to the codebase must be accompanied by an update to the relevant documentation.

**Rationale**: Outdated documentation is worse than no documentation. It leads to confusion, incorrect implementations, and wasted time.

**Action**:
1. Update OpenAPI spec when adding/changing API endpoints
2. Update ADRs when changing architectural decisions
3. Update MODULE_BOUNDARIES.md when changing module structure
4. Update README files when changing project setup
5. Update JSDoc when changing public APIs
6. Update this document (AI_WORKING_RULES.md) if rules change

**Example**:
```
✅ Added new endpoint → Updated openapi/erp-api.yaml
❌ Added endpoint → Didn't update any documentation
```

### Rule 16: Prioritize Security in Every Decision

**Statement**: Security considerations must be part of every technical decision. Never implement a feature without considering its security implications.

**Rationale**: Security vulnerabilities in an ERP system can lead to data breaches, compliance violations, and significant financial and reputational damage.

**Action**:
1. Always validate and sanitize all inputs
2. Implement proper authentication and authorization for every endpoint
3. Use HTTPS in production, encrypt sensitive data at rest
4. Follow the principle of least privilege
5. Log all security-relevant events (auth, authorization, data changes)
6. Check for common vulnerabilities (OWASP Top 10)
7. Never hardcode secrets in code or configuration files
8. Use environment variables for all sensitive configuration
9. Implement rate limiting on all public endpoints
10. Perform security review before deploying any feature

**Example**:
```
✅ Before adding an endpoint: "Who can access this? What data does it expose? What's the worst-case if compromised?"
❌ "It works, ship it."
```

## Rule Enforcement

### During Development
- Rules are enforced through ESLint and TypeScript strict mode
- Pre-commit hooks verify rule compliance
- Code review checklist includes security and architecture checks

### During AI Interactions
- These rules are automatically applied to all AI-generated code
- Each rule is verified before any code or documentation is written
- When a rule seems to conflict with user instructions, the AI must flag the conflict

### Violation Handling
1. If a rule is violated, the AI must correct the violation immediately
2. Document the reason for the violation and the corrective action
3. If a rule cannot be followed due to a technical constraint, document the exception
4. Report rule violations to the team for process improvement

## Related Documents
- [Development Guide](DEVELOPMENT.md)
- [Test Strategy](TEST_STRATEGY.md)
- [Security Documentation](SECURITY.md)
- [Architecture Documentation](ARCHITECTURE.md)
