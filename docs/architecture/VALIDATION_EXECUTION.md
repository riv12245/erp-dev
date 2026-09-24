# Core and phase-three validation — 2026-09-24

Upstream baseline: PR #3 `59d6d1ff17068d6cb0ccf84dd306dd1fd323d33d`, including PR #2 `a25872eec7ddc07a9448396100e787369adf1aff`.

## Scope and decisions

The owner now requests continuing pending work in Git. This supersedes the earlier phase-three instruction to leave all execution to the owner. Validate existing contracts before adding commercial transitions whose policies are explicitly absent. Do not deploy or use production databases.

The isolated local checkout exactly matches every upstream blob. Its local reconstruction commits are not upstream history and must never be pushed. Publish only new changes with the actual upstream parent.

## Plan

1. Verify installation, build, static gates and available runtime suites.
2. Reproduce and correct defects; add focused regression evidence.
3. Review changes, publish to the existing work branch, and inspect CI. Integrate only when required validation and repository rules permit it.

## Evidence

- Clean `npm ci --ignore-scripts --no-audit --prefer-offline`: passed.
- `npm run build -- --force`: 14/14 tasks passed, no cached tasks.
- `npm run check`: passed; architecture emitted 259 path warnings on Linux. Investigate portability rather than treating warnings as actual violations.
- `npx --no-install turbo run lint typecheck --force`: 40/40 tasks passed, no cached tasks.
- Initial full `npm test -- --force --log-order=stream`: failed. 137 tests passed; 136 were skipped after failed setup or absent Redis. MongoDB download failed with `EAI_AGAIN fastdl.mongodb.org`. API 19 files, worker inbox/outbox and web session HTTP could not initialize their database. These are not successful integration tests. No production URI was used.

## Corrections and regression evidence

- Architecture checker: Windows-only path conversion produced 259 warnings on Linux; TSX files were not examined. Two new fixture checks failed before the fix. Native path resolution and TSX traversal now pass; warnings decreased to 51 actual deep imports. Public module entrypoints remain allowed and private module imports remain rejected. The fixture suite is part of `npm run check`.
- Sales precision: positive quantities/prices below numeric tolerance could silently become zero. Three quantity regressions and one price regression failed before the server fix. Shared web/mobile parsing also accepted excess precision; three client regressions failed before correction. Zero price remains supported; nonzero values below the supported unit are rejected. Existing MXN/JPY/KWD calculations remain unchanged.
- Domain coverage: customer/supplier validation, pagination, stock precision/underflow and sales arithmetic can now execute without a MongoDB fixture. These pure tests complement, and never replace, persistence/transaction suites.
- CI trigger: PR #3 targets `codex/core-maturation`, previously excluded by the `main`-only pull-request filter. Check every PR target and permit manual workflow dispatch. This does not fix billing/runner availability and does not weaken any job.

## Architecture and module alignment

Retain the actual `apps`, `packages`, `services/api` and `services/worker` layout; React Native/Android remains without Expo. The phase-three execution plan explicitly adopted public CRM/Inventory application interfaces. Older generic MODULE_BOUNDARIES/AI_WORKING_RULES text still describes event-only communication; do not silently expand synchronous coupling or rewrite that instruction to permit new dependencies. A reconciled architecture decision is a prerequisite for expanding cross-module writes.

| Area | Existing work to validate | Remaining prerequisite |
| --- | --- | --- |
| Auth/IAM/tenancy | Persisted sessions, live grants, companies/memberships | Real browser multi-tab and Android restore/revoke evidence |
| Events | Durable outbox and transactional inbox infrastructure | Redis verification, actual agreed consumers, recovery/retention policy |
| CRM | Customer create/list/detail/versioned changes | Contact relationship and deal/pipeline contracts |
| Inventory | Products, warehouses, stock ledger | Reservation/allocation/expiry and paired transfer contracts |
| Sales | Drafts and cancellation | Confirm/fulfill/tax/reversal contracts and module orchestration decision |
| Purchasing | Supplier catalog | Order lines, quantities/costs, approval and partial receipt contracts |
| Finance | Account/journal types and skeleton route | Recognition triggers, currency/account mapping, payment evidence |
| HR/Production/Projects/Logistics/Bookings/Field Service/Eshop | Skeletons | Authoritative domain and access contracts before operational endpoints |
| Platform workflow | Exported types/statuses | Actual execution engine; narrative documentation is not runtime evidence |

No tax policy, reservation, fiscal invoice, simulated payment or placeholder consumer was added. No deployment, database migration or merge was performed.

## Independent review

Read-only reviewer found no introduced critical/important defect and independently ran architecture fixtures (6), domain contracts (8), business runtime regressions (14), architecture scan and whitespace checks successfully. Suitable for publication, not merger without the integration gates.

Ruling: database transaction/isolation, Redis delivery/recovery, real browser/device behavior, native Windows execution and remote CI availability remain unverified. The reviewer explicitly did not certify these. Do not infer them from focused test results or reduce their gates; merging without them risks publishing unverified runtime behavior.

## Open dependencies

Purchase-order lines/receipts, reservations, confirmation, tax and finance recognition require the missing business contracts identified in PHASE_3_EXECUTION.md. Existing scaffolding is not a completed workflow.
