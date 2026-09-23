# Phase 3 — user validation plan

**Status:** code and regression tests authored; no phase-three tests, builds, lint, typecheck, APK, emulator or Atlas checks were executed by the agent. Static source review is not runtime approval. PR #3 stays draft until the owner validates it.

## 1. Prepare the checkout

Use the nested clone, not its parent repository. Preserve local changes before pulling.

```powershell
Set-Location C:\Users\erik5\OneDrive\Escritorio\erp\erp-dev
git status --short
git switch feat/crm-customer-vertical
git pull --ff-only origin feat/crm-customer-vertical
git log -1 --oneline
```

For a new checkout: `git clone --branch feat/crm-customer-vertical https://github.com/ErickRFM/erp-dev.git`. PR base is `codex/core-maturation`, not main.

## 2. Environment variables

Create `services/api/.env` from root `.env.example` only if it does not already exist; never overwrite private configuration. Generate a fresh JWT secret locally using the template's command and put it in the file without sharing it. Set `NODE_ENV=development`, `MONGODB_DB_NAME=erp_dev`, a **local replica-set** `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CORS_ORIGIN` and rate limits. Web `VITE_API_URL` must point to that API. Android defaults to `http://10.0.2.2:3000`; use the existing `ERP_API_URL` Gradle option for a physical device. Keep web/API same-site for the existing refresh cookie policy.

No real tokens, passwords, production Mongo URIs, certificates or fiscal credentials belong in this plan or Git. The automated API harness replaces inherited Mongo settings with disposable loopback MongoDB.

## 3. Dependencies and database

Use Node >=22.12 and npm >=10 (repository packageManager npm 11.16.0). Do not mix pnpm/yarn installs. Automated replica-set tests use existing `mongodb-memory-server`; its MongoDB binary may need a first-run download. Manual business flows require a MongoDB replica set or compatible sharded cluster: standalone MongoDB cannot atomically save audit and business data. Redis/worker is not needed for these synchronous business flows.

For an installed local MongoDB, start a **new development data directory** in one terminal, then initialize it once in another:

```powershell
$erpMongoData = Join-Path $env:LOCALAPPDATA 'erp-dev-mongo'
New-Item -ItemType Directory -Path $erpMongoData -Force
mongod --replSet rs0 --bind_ip 127.0.0.1 --port 27017 --dbpath $erpMongoData
```

```powershell
mongosh --host 127.0.0.1 --port 27017 --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"
```

Use an existing replica set as configured instead of reinitializing it. Additive collections/indexes are listed in the execution log. In environments with automatic indexes disabled, provision/review those indexes before enabling traffic; do not use destructive syncIndexes.

## 4. Install and build

Run from repository root, after configuring your local environment:

```powershell
npm ci --ignore-scripts --no-audit
npm run deps:prepare
npm run build
```

Build shared workspace packages before API/client tests because workspace imports resolve their `dist` exports. No external dependency was added; API now explicitly depends on the existing `@erp/contracts` workspace. Do not reuse the parent repository's old built packages as validation of this clone.

## 5. Architecture and OpenAPI

```powershell
npm run check
```

This checks boundaries, imports, tenant-scoped conventions and YAML references/statuses. Cross-module synchronous access is allowed only via the owning module's public `index`; Sales uses CRM/Inventory application services, never their private models. Structural checks do not prove security or full OpenAPI response conformance.

## 6. Lint and typecheck

```powershell
npm run lint
npm run typecheck
```

Fix reported failures before promoting PR #3 out of draft. Record the exact command and commit; never infer a pass from files being generated.

## 7. Unit and shared-client tests

```powershell
npm test --workspace @erp/web -- test/business-runtime.test.ts test/business-refresh.test.ts
```

The prepared client tests cover API envelopes/paths, form conversion, rejected inputs, idempotency options and stale-session handling. They do not mount a browser or certify Android interaction. Pure domain regressions also live alongside the inventory and sales suites in section 8. Review new refresh/permission regression cases before running the broader web suite.

## 8. API integration

```powershell
npm test --workspace @erp/api -- test/company-access.test.ts test/crm-customers.test.ts test/inventory.test.ts test/inventory-http.test.ts test/sales-orders.test.ts test/purchasing-suppliers.test.ts
```

All business writes use disposable local replica-set databases. Fixtures explicitly provision tenant/company memberships and real permissions; no ADMIN bypass exists. Suites cover persistence, input validation, company/tenant isolation, optimistic concurrency, atomic audit rollback, stock bounds, idempotency and Sales public-module references. Do not point these tests at Atlas.

## 9. Broader regression and E2E

After the targeted cases pass:

```powershell
npm test
npm run test:e2e --workspace @erp/api
```

The existing E2E script checks core IAM/seed/health, not a browser/native end-to-end business journey. The new Sales HTTP suite crosses CRM → Sales → Inventory over the API and real Mongo; manual web/Android steps below complete the client flow. Redis-dependent tests may skip without Redis; a skip is not a pass. No complete automated browser or native business E2E suite is claimed.

## 10. Manual web flow

Only after confirming `.env` points to your intended **local development** replica set:

```powershell
npm run seed:dev
npm run dev:api
```

In a second terminal: `npm run dev:web`. Use the configured development login. The seed updates demo grants but creates no companies; existing business data is not reset. Create a company through the UI (ISO currency and timezone required); only its creator receives access. For another active tenant user, a company manager uses the documented PUT membership endpoint with `tenancy.company.membership.write`; never send a fabricated company header as an access grant.

1. CRM: create customer, search name/email, paginate, load detail, edit, deactivate/reactivate. Reload page and confirm persistence. Duplicate names/emails are allowed because no uniqueness rule exists.
2. Inventory: create product with unique SKU and unit, edit/version, create warehouse, post inbound movement, inspect balance/history, post outbound and signed adjustment. No stock-edit form exists on products. Product categories remain descriptive strings; countries remain global.
3. Sales: select the actual customer/product/warehouse, enter quantity and draft unit price, create draft, read its subtotal and informational stock, list by customer, cancel with confirmation. Tax and final total must remain pending; stock must not change. Deactivate a referenced catalog entity and confirm historical detail remains readable with explicit unavailable availability.
4. Purchasing: create/search/detail/edit/deactivate supplier, reload and verify persistence. No purchase receipt/payment button is implied.
5. Verify empty/loading/error states, permissions load/retry, field validation, version-conflict reload and confirmation flows. Switch companies while a list/detail request is pending; the old result must not reappear.
6. Let an access token expire with an open movement/order form. Submit: refresh must preserve the immutable body/key and retry only once. Refresh must not remount the draft form. Close/reload after an uncertain write only after checking the ledger/order list; pending forms are not persisted across a page/process restart.

## 11. Manual Android flow

Follow [ANDROID_DEVELOPMENT.md](ANDROID_DEVELOPMENT.md) for Java 17, SDK 34, Metro and device setup. These are **owner-run commands**, not agent evidence:

```powershell
npm run dev:mobile
# Separate terminal after API/Metro are ready and emulator/device is connected:
npm run android --workspace @erp/mobile
```

Repeat the four business areas from section 10 through dashboard navigation. Verify scroll, selection/search, keyboard, confirmation, permission errors, company switching, foreground refresh, process restart, logout and offline logout. Keystore/runtime and native screen behavior need device evidence. No Kotlin change was required for these business flows.

## 12. Tenant and company isolation

Use tenant A/company A and tenant B/company B; also two companies inside tenant A with different company memberships. Reuse known customer/product/warehouse/supplier/order IDs across scopes. Expected: foreign company access 403; a foreign resource inside an otherwise authorized company 404; no mutation/list leakage. Token/header tenant mismatch 403; missing auth 401. An arbitrary `x-company-id` cannot grant access; a conflicting one is rejected. Business branch headers are rejected until branch authorization exists.

## 13. Insufficient permission

Prepare explicit read-only and no-access tenant roles. Company membership alone must not grant write permission; IAM permission alone must not grant company access. Disable company membership or tenant membership and repeat with the same token: the next request must fail. Verify UI hiding is convenience only by making the same request directly. Revocation does not cancel an already authorized in-flight transaction.

## 14. Concurrency and retries

- Two PATCH requests with the same expectedVersion: one persists, the other returns 409; repeat in CRM, supplier, product and warehouse.
- Competing outbound stock requests cannot produce a negative balance; test decimal sequence inbound 0.3, outbound 0.1, outbound 0.2 -> exactly zero.
- Same movement/order key and body, including concurrent attempts: one persisted business effect and original response on replay. Reuse key with a changed body -> 409. A network timeout is not proof of rollback.
- Failed audit persistence must roll back business data and ledger changes. Transactions require replica-set support.
- Draft cancel with stale version or already cancelled status -> 409. No fake release or financial posting occurs.
- Token-only refresh preserves pending operation keys; logout/account/tenant changes fence late responses and clear old company data.

## 15. Expected results and acceptance

Record actual pass/fail/skip per command, not an inferred aggregate. Successful implemented mutations survive reload and record one corresponding audit entry atomically. Stock quantity precision is bounded by the implementation's six-decimal technical contract; unsupported precision/overflow is rejected without partial writes. Sales draft subtotal uses currency minor units and line-level half-up rounding; taxAmount/total remain null. Final approval requires source checks, targeted suites, full regression and manual web/mobile results on the exact head.

## 16. Report errors

Report commit SHA, command/platform, expected vs actual behavior, sanitized response code/correlationId, test name and reproduction steps. Include whether Mongo is standalone/replica set and whether failure occurred before a test started. Do not share .env, JWTs, refresh cookies, passwords, Mongo URI or customer/supplier PII. A GitHub Actions billing failure before steps execute is an infrastructure block, not failing application tests.

## 17. Recommended order

Checkout/env → install/shared build → architecture/OpenAPI → lint/typecheck → targeted client/API suites → full regressions → local seed → manual web → Android/device → record evidence and review PR. Leave PR #3 draft on failure or incomplete validation. Do not merge or deploy as part of this plan.
