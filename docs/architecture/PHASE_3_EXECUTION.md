# Phase 3 — execution

Branch: `feat/crm-customer-vertical`; base `codex/core-maturation`; PR #3. Starting head `f22d5bc`, clean nested checkout `erp/erp-dev`.

## Plan and constraints

Implement company authorization → CRM → inventory/catalogs → dependent sales/purchasing where contracts suffice. Connect web/mobile to actual persistence. Preserve sessions/IAM and public module boundaries. Use existing Node/Express/Mongoose, React/React Native and shared packages; no new dependencies. User instruction supersedes the older CRM document's full-gate requirement: prepare tests, statically review, leave final builds/tests to the user. No Atlas operations, APK, emulator, full test/build/lint/typecheck/check, merge or deployment.

- [ ] Company persistence, explicit access, registered permissions, transactional audit and test fixtures.
- [ ] CRM customer operations and client screens; prepare isolation/concurrency tests.
- [ ] Inventory product/warehouse/stock operations and client screens; prepare idempotency/negative-stock tests.
- [ ] Connect dependent domains through public application interfaces only where business contracts are defined.
- [ ] OpenAPI, static integration review, user test plan, incremental commits and draft PR update.

## Ownership and decisions

CRM owns Customer; Master Data currently owns global countries only. Company is an existing shared contract without persistence. Implement its authoritative record in platform tenancy and require an active explicit company membership in addition to live tenant IAM. Creating a company requires `tenancy.company.write` and grants its creator access atomically. Grant/revoke membership requires `tenancy.company.membership.write` plus existing company access. No implicit ADMIN bypass or arbitrary header authorization. Branch-scoped business operations are not yet supported.

Sales and shared sales contracts disagree on status lifecycle. No order confirmation, reservation, fiscal calculation, payment, AR/AP or purchase-receipt transition may be invented from those enums alone. Inventory's existing nonnegative-stock invariant and explicit movement commands can be implemented independently. Names/emails are not assigned uniqueness where the customer domain has no such rule.

## Evidence

Implementation in progress. No phase-three tests executed; all new functionality is pending validation. Earlier core results are not evidence for these changes.
