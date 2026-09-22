# ADR-007: TypeScript Strict Mode

**Status**: Accepted  
**Date**: September 21, 2026  
**Deciders**: Platform Engineering Team  
**Domain**: Development Standards

## Context

TypeScript provides a type system that can catch errors at compile time, reducing runtime bugs and improving code quality. The strict mode options in TypeScript enforce the most restrictive type checking rules. We needed to decide whether to enable strict mode across the entire codebase and what specific options to enable.

Key requirements:
- Maximum type safety to prevent runtime errors
- Consistent type checking across all packages and services
- Catch common programming errors at compile time
- Maintain developer productivity without excessive type annotations
- Support gradual migration of existing code to strict typing

## Decision

We will enable **all TypeScript strict mode options** across the entire codebase. The configuration in `tsconfig.base.json` includes:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedSideEffectImports": true,
  "exactOptionalPropertyTypes": false
}
```

Additionally, we explicitly disable `exactOptionalPropertyTypes` because:
- It would break common patterns with optional properties and default values
- It adds complexity for optional chaining patterns
- The benefit doesn't justify the migration cost for this project

## Enabled Strict Options

### `strict` (Enables All Strict Type-Checking Options)
The umbrella flag that enables all strict type-checking options. This is the foundation of our type safety strategy.

### `noUnusedLocals`
Reports errors on unused local variables. Prevents dead code accumulation and ensures variables are always used.

### `noUnusedParameters`
Reports errors on unused function parameters. Encourages clean function signatures.

### `noImplicitReturns`
Ensures all code paths in functions return a value or explicitly return `undefined`. Prevents undefined return bugs.

### `noFallthroughCasesInSwitch`
Reports errors when switch cases fall through without `break` or `return`. Prevents accidental logic errors.

### `noUncheckedSideEffectImports`
Ensures imports with side effects are explicitly checked. Prevents silent failures from missing imports.

## Consequences

### Positive
- **Fewer runtime errors**: Type checking catches many bugs at compile time
- **Better IDE support**: IntelliSense and autocomplete work more accurately
- **Self-documenting code**: Types serve as documentation
- **Safer refactoring**: Type checking catches breaking changes during refactoring
- **Team consistency**: Uniform type checking across all packages
- **Early bug detection**: Many bugs caught before code is committed

### Negative
- **More verbose code**: Requires more type annotations
- **Learning curve**: Team members new to TypeScript may struggle
- **Migration effort**: Existing code may require type annotations
- **Build failures**: Stricter rules mean more compile-time errors

### Mitigations
- Provide code examples and type patterns in the project
- Use `// @ts-expect-error` sparingly with explanations
- Start with strict mode for new code, migrate existing code gradually
- Use `as const` and `satisfies` for type-safe literals without verbosity
- Invest in TypeScript training for the team

## TypeScript Configuration Details

### Base Configuration (`tsconfig.base.json`)
- **Target**: ES2022 (modern Node.js runtime)
- **Module**: NodeNext with NodeNext resolution
- **Module Resolution**: NodeNext for modern resolution semantics
- **Strict**: All strict mode options enabled
- **Paths**: `@erp/*` aliases for workspace imports
- **Declaration**: Generate `.d.ts` files for published packages
- **Source Maps**: Enabled for debugging
- **No Emit**: In base config, overridden in service configs for compilation

### Per-Service Configuration
Each service overrides the base config with:
- `outDir`: Build output directory
- `rootDir`: Source directory
- `types`: Node.js type definitions
- `lib`: ES2022 and DOM libraries

## Code Quality Rules

### Type Patterns to Follow
1. Always type function parameters and return values
2. Use `unknown` instead of `any` for untyped data
3. Use `Record<string, T>` for dynamic objects
4. Use `Partial<T>`, `Pick<T, K>`, `Omit<T, K>` for object variations
5. Use union types for constrained values instead of enums (unless needed for iteration)
6. Use `DeepPartial<T>` for nested partial updates

### Patterns to Avoid
1. `any` type (except in specific compatibility scenarios)
2. Implicit `any` from untyped imports
3. `Object` type (use `Record<string, unknown>` instead)
4. Unnecessary type assertions (`as X` without justification)
5. `@ts-ignore` (use `@ts-expect-error` instead)

## Related ADRs
- ADR-001: Modular Monolith Architecture
- ADR-004: React Native Web
