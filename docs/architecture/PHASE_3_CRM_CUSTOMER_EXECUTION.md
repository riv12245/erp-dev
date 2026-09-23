# Phase 3 — CRM customer vertical slice (execution ledger)

**Base:** `codex/core-maturation` at `a25872eec7ddc07a9448396100e787369adf1aff`. **Working branch:** `feat/crm-customer-vertical`. This branch builds on open PR #2; it is not merged into `main`. No production deployment or database migration is authorized by this document.

## Verified starting point (repository inspection)

- `services/api/src/modules/crm/index.ts` exports `Customer`, `Deal`, and `registerCrmRoutes`, but registers only `GET /crm/health` with `status: skeleton`. Customer CRUD is **not implemented**.
- The global `protectedApi` in `services/api/src/app.ts` installs tenant-context and authenticated-session middleware before registering business modules.
- `platform/iam/authorization.ts` provides `requirePermission`, which reads effective server-side IAM permissions. New CRM operations must use it, not hard-code ADMIN.
- `platform/tenancy/tenant-scoped-repository.ts` provides mandatory tenant-scoped create/read/update/delete operations, guarded pagination (1–100), and optimistic update support. Reuse or extend its public contract rather than querying another tenant's records.
- `master-data/countries` is **global reference data**; it cannot establish business tenant-isolation coverage. CRM customers must be tenant-scoped.
- The present CRM `Customer` interface requires `companyId`. Company-management routes remain roadmap: resolve and document the authoritative company ownership and authorization rule before accepting a caller-supplied `companyId`. Do not use an arbitrary default or silently weaken the type.

## Execution order — finish one gate before starting the next

| Gate | Work | Acceptance evidence |
| --- | --- | --- |
| 0 — Review | Verify Git worktree, base PR head, current tests, existing CRM and company models, actual API contracts and permissions. | Baseline recorded; unrelated changes preserved. |
| 1 — Contract | Establish ownership of Customer vs. any shared master-data customer; define company/branch binding and required IAM grants; write exact request/response/errors in OpenAPI. | No duplicate entity or speculative route; contract reviewed against real code. |
| 2 — Backend | Implement tenant-scoped Customer create/list/get (and only minimal updates needed), strict validation and bounded pagination, customer identifier and lifecycle handling. Separate route, application service, domain rules, repository, and model according to current conventions. | Real Mongo-backed HTTP tests for create/read and proper error envelopes; zero cross-tenant results. |
| 3 — Authorization | Check active membership, tenant/header/session match, `crm.customer.read` / `crm.customer.write` or established equivalent, and authorized company scope. | Missing JWT 401; insufficient grant 403; foreign tenant and foreign company blocked; no unauthorized write. |
| 4 — Clients | Connect the existing shared API client to a minimal customer list/create screen on web and mobile without moving business rules to the UI. | Actual API integration, empty/loading/error/success states; test on both surfaces. |
| 5 — Review | Audit module boundaries, tests, docs, and Git diff; run all available gates. | `npm run check`, lint, typecheck, build, tests; record exact passed/skipped/failed outputs; review before PR. |

### Minimum real-Mongo test matrix

- ACME creates and reads its customer; list count and pagination agree with persisted data.
- GLOBAL cannot read, update, delete, or enumerate ACME's customer, even when supplying a known customer ID or mismatched header.
- No JWT / expired or revoked session => 401; missing tenant => expected tenant-context error; insufficient permission / inactive membership => 403.
- Company binding does not grant access from a caller-provided company ID alone. Test any allowed multi-company membership or explicitly identify this as a blocker.
- Validation rejects malformed IDs, empty/oversized names, invalid email, unsafe update operators, and unbounded list limits.
- Update semantics use the repository's version/tenant checks; retry behavior and duplicate constraints are documented.

## Release and branching gates

- PR #2 is already published. Its GitHub checks showed **failure without executed job steps** at inspection time, and its description attributes the block to the account's spending limit/billing. Local tests passed; they are not a substitute for remote CI. Do not bypass branch protection or describe an unrun workflow as green.
- PR #2 reports one Redis test skipped, Android Keystore not tested on device, and 20 npm-audit findings. Preserve these in the release checklist; do not use `audit fix --force`.
- Create a **draft stacked PR** from this branch into `codex/core-maturation` after implementation and local tests; do not target `main` until PR #2 is merged and the branch is rebased.
- Never commit `.env`, token values, database URIs, or user passwords. Rotate the previously disclosed Atlas credential before production use.

**Current state:** execution plan committed; no CRM feature or test is claimed complete by this document.
