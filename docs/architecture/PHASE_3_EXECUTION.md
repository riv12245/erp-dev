# Phase 3 — execution

Branch: `feat/crm-customer-vertical`; base `codex/core-maturation`; PR #3. Starting head `f22d5bc`, clean nested checkout `erp/erp-dev`.

## Plan and constraints

Implement company authorization → CRM → inventory/catalogs → dependent sales/purchasing where contracts suffice. Connect web/mobile to actual persistence. Preserve sessions/IAM and public module boundaries. Use existing Node/Express/Mongoose, React/React Native and shared packages; no new dependencies. User instruction supersedes the older CRM document's full-gate requirement: prepare tests, statically review, leave final builds/tests to the user. No Atlas operations, APK, emulator, full test/build/lint/typecheck/check, merge or deployment.

- [x] Company persistence, explicit access, registered permissions, transactional audit and test fixtures authored.
- [x] CRM customer operations and client screens; isolation/concurrency tests prepared.
- [x] Inventory product/warehouse/stock operations and client screens; idempotency/negative-stock tests prepared.
- [x] Sales draft → CRM/Inventory public application interfaces; supplier catalog and clients authored.
- [x] OpenAPI, static integration review, user test plan and incremental commits prepared; PR remains draft.
- [ ] Owner runtime validation, full gates and device evidence. These boxes do not mean tests passed.

## Ownership and decisions

CRM owns Customer; Master Data currently owns global countries only. Company is an existing shared contract without persistence. Implement its authoritative record in platform tenancy and require an active explicit company membership in addition to live tenant IAM. Creating a company requires `tenancy.company.write` and grants its creator access atomically. Grant/revoke membership requires `tenancy.company.membership.write` plus existing company access. No implicit ADMIN bypass or arbitrary header authorization. Branch-scoped business operations are not yet supported.

Sales and shared sales contracts disagree on status lifecycle. No order confirmation, reservation, fiscal calculation, payment, AR/AP or purchase-receipt transition may be invented from those enums alone. Inventory's existing nonnegative-stock invariant and explicit movement commands can be implemented independently. Names/emails are not assigned uniqueness where the customer domain has no such rule.

## Evidence

No phase-three tests executed; all new functionality is pending validation. Earlier core results are not evidence for these changes. No full npm test/build/lint/typecheck/check, Atlas operation, audit query, emulator or APK build was run. Only inexpensive static checks were used: OpenAPI YAML/references/operation classification (64 operations, 471 resolved refs), architecture boundaries (93 API files, no violations/warnings), TypeScript syntax parsing (72 phase-three source files, no syntax diagnostics; not typechecking), and Git whitespace review. A structural OpenAPI comparison confirmed no old paths/schemas were removed; existing changes are limited to companies and the stock error code. Runtime and compilation remain unverified.

## Implemented blocks (authored and statically reviewed; pending tests)

| Block | Main files | Operations / connections | Prepared tests |
|---|---|---|---|
| Company authorization | `platform/tenancy/company-{model,access,service}.ts`, `company.routes.ts`, `platform/iam/business-permissions.ts`, `scripts/seed-dev.ts` | Active persisted company + explicit company membership + live tenant IAM. Company creation atomically grants creator access; permissioned member grant/revoke. Supported ISO currency/timezone validation. Existing audit service accepts the transaction session. | `test/company-access.test.ts`: onboarding, denied access, foreign user, protected fields, rollback |
| CRM | `modules/crm/{domain,application,infrastructure,presentation}`, `packages/contracts/src/shared/crm.ts` | Create/list/detail/allowed PATCH/status, name/email search, pagination, UUIDs, version, metadata-only correlated audit. Public `CustomerService.requireActiveCustomer` used by Sales. | `test/crm-customers.test.ts`: persistence, company/tenant isolation, permission revocation, literal search, stale/concurrent writes, audit failure |
| Catalogs / Inventory | `modules/inventory/{domain,application,infrastructure,presentation}`, `packages/contracts/src/inventory` | Product/SKU/warehouse create/read/edit, uniqueness within company, immutable movements + stock + audit in one transaction, idempotent replay/conflict, nonnegative balance. Existing unit enum reused; category remains descriptive text; country data unchanged/global. Public active-product and availability queries used by Sales. | `test/inventory.test.ts`, `test/inventory-http.test.ts`: HTTP RBAC/scope, SKU uniqueness, stale writes, idempotency, concurrent withdrawals, fractional arithmetic, rollback |
| Sales drafts | `modules/sales/{domain,application,infrastructure,presentation}`, `packages/contracts/src/sales/draft.ts` | Actual customer/product/warehouse references, idempotent draft creation, company currency, line/subtotal computation, list/filter/detail, versioned DRAFT→CANCELLED. Inventory queried through public service; no reservation or stock reduction. Historical detail survives inactive references with nullable availability. | `test/sales-orders.test.ts`: integrated references, concurrent replay/cancel, MXN/JPY/KWD precision, stale/inactive refs, audit rollback |
| Purchasing supplier catalog | `modules/purchasing/{domain,application,infrastructure,presentation}`, `packages/contracts/src/shared/supplier.ts` | Supplier create/list/search/detail/edit/status; contact fields, scope/version/audit. Public `SupplierService.requireActiveSupplier` for future purchasing workflows. No duplicate master-data identity. | `test/purchasing-suppliers.test.ts`: permissions, isolation, validation, concurrent versions and audit rollback |
| Web and mobile | Both `features/business/BusinessScreen.tsx`, CRM/Inventory/Sales/Purchasing wrappers, dashboard/navigation, permission provider and auth store; `packages/api-client/src/business.ts` | Actual API calls, authorized company selection/create, search/filter/pagination, detail/forms, confirmations, loading/empty/error states. `/auth/me` supplies effective permissions. Pending movement/order body and key survive same-session token rotation. No Kotlin/Expo change. | `apps/web/test/business-runtime.test.ts`, `business-refresh.test.ts`: 13 prepared cases; real shared client/store with mocked HTTP. Component/browser/device rendering remains manual validation. |

Paths under `platform`, `modules` and API `test` above are relative to `services/api/src` / `services/api`; no second backend exists. All listed tests are **not executed**. `openapi/erp-api.yaml` reflects implemented operations and retains unrelated roadmap operations. The architecture checker now resolves cross-module destinations and accepts only their public index, while rejecting private model/repository imports.

## Review findings addressed

1. Inventory's original negative adjustment check was incorrect; domain arithmetic now uses safe integer micro-units, six-decimal quantity precision, overflow/round-trip guards and exact normalized balance assignment. Prepared regression: `0.3 - 0.1 - 0.2 = 0`; concurrent fractional withdrawals preserve the same invariant.
2. Frontend permissions previously remained empty. The provider now loads server-side IAM, hides interactions on hydration failure and fences previous-session results.
3. Token-only permission refresh could unmount forms and lose idempotency keys while a write still committed. Same-identity component state now survives the refresh; real identity/epoch changes still clear it. Only movements/orders with server-enforced keys opt into the shared client's single safe 401 retry. Other writes are not auto-replayed; error displays offer a read-only session refresh followed by explicit manual confirmation.

Independent bounded source reviews covered ledger/company/Sales and client session lifetimes. Findings were corrected in code and regression tests prepared; these are not test-pass claims.

## Numeric and consistency contracts

Stock is one SKU identity per product and a separate balance per product/warehouse. Quantities support six decimal places within safe integer micro-units (approximately 9.007 billion whole units); unsupported precision/overflow returns validation failure. Transactions serialize competing balance updates and atomically include movements/audit. Reservations are explicitly unsupported (`reserveStock` throws); `reserved: 0` is accompanied by `reservationsSupported: false`.

Sales prices are explicitly entered draft prices, not an implemented price-list/discount policy. Quantity precision is three decimals; price precision follows the company's currency minor units from Intl. Lines round half-up with integer arithmetic, then sum. UUID `number` is a draft reference, not legal numbering. `taxAmount` and `total` are null; `pricingStatus` states the missing tax policy. Product tax/price values are reference metadata only. Customer/product descriptions are not copied wholesale: the order stores the item ID, minimal line description at drafting time and entered quantity/price.

List counts and page rows use separate reads, not a snapshot. Authorization is checked for every request; revocation does not retroactively abort in-flight transactions. Form idempotency keys survive same-session refresh/retries, but are not durable across page reload/process death; inspect history after uncertain writes before starting another operation. Company list is capped at 100. CRM/supplier optional contact fields cannot yet be cleared via PATCH. No async business processing is needed for these flows, so no fictional Outbox/Inbox consumers were added.

## Additive persistence and deployment prerequisites

No live migration or database write was executed. New collections: `companies`, `company_memberships`, `crm_customers`, `purchasing_suppliers`, `inventory_products`, `inventory_warehouses`, `inventory_stocks`, `inventory_movements`, `sales_orders`. Confirm exact schema collection names and indexes before rollout. Company ID is unique per tenant; access unique by tenant/company/user; customers/suppliers/orders by tenant/company/entity ID; product SKU and warehouse code unique per tenant/company; balance unique by tenant/company/product/warehouse; movement and order keys unique per tenant/company. List indexes include scope and stable ordering. Replica-set transactions are required. Initialize collections and indexes before transactions, as services do locally; pre-provision when production auto-indexing is disabled. Do not delete or rewrite existing core data.

The development seed registers real implemented permissions and grants them to its existing tenant-scoped demo ADMIN roles; authorization never checks a role name. SALES demo grants remain unchanged. Seed does not create companies or grant company access to other users. API's explicit dependency on the existing `@erp/contracts` workspace is recorded in package.json/lock; no new external library was added.

## Remaining business scope and concrete next work

- CRM contacts: no separate contact relationship/primary-contact contract exists. Deals define stage IDs but no configured pipeline, stage transition or responsible assignment policy. Define these before adding those screens/endpoints.
- Inventory reservations/releases: decide warehouse allocation, expiration, partial fulfillment and cancellation semantics, then implement real persistence through Inventory's public application service. A draft currently cannot reserve.
- Purchasing orders/receipts: the existing PurchaseOrder type has status/supplier only, no line quantities/costs or partial receipt/approval contract. Next coherent block is a reviewed purchase-order line + receipt aggregate, idempotent receipt → Inventory public movement in the same transaction, followed by web/mobile receipt screens. Supplier identity is ready.
- Finance: actual contracts are ledger accounts/journals/fiscal periods, not AR/AP recognition/payment rules. No confirmed commercial event exists yet. Define recognition triggers, amounts/currency, account mapping and payment evidence before creating receivables/payables. No SAT, fiscal invoices, simulated bank payments or automatic paid status was added.
- HR/Production/Projects/Logistics/Bookings/Field Service/Eshop remain scaffolding. Inspected types reference departments, work centers, projects/resources, shipments/technicians or publication policies without their authoritative workflow/access contracts. No fake arrays/screens were added. Their implementation and the unfinished principal workflows are not claimed complete.
- Existing core concerns (CI billing block, native transitive advisories, Redis/device validation) were not re-audited and remain separate pending work.

Owner validation commands, expected outcomes and error reporting are in [PHASE_3_TEST_PLAN.md](PHASE_3_TEST_PLAN.md). PR #3 remains draft; no merge/deployment authorized or performed.
