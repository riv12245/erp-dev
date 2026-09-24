# ERP-DEV Enterprise UX/UI — implementation and validation record

## Branch topology

- Base: feat/crm-customer-vertical (draft PR #3), itself based on codex/core-maturation (PR #2).
- UX branch: feat/ux-ui-enterprise (draft PR #4); **do not merge to main until the upstream PRs and integration gates are resolved**.
- No backend, database, production deployment, authorization-contract or migration changes were made in this UI branch.

## Implemented in this branch

- Shared semantic dark-charcoal/teal visual palette and updated shared Card/Button primitives.
- Authenticated web EnterpriseShell: desktop sidebar/collapse, responsive mobile navigation, keyboard module search (Ctrl/Cmd+K), tenant identity and logout, nested protected routes.
- Web home: live authorized-company list, module navigation and explicit draft-only business messaging; no fabricated metrics or placeholder business records.
- Web customer, inventory, sales-draft and supplier workspaces: API-driven company selector, resource tabs, pageable searchable table, native backend error/loading/empty states, status filters, and contextual editor/detail panels. Existing server-client services, request aborts, permission checks, write-confirmation and idempotency flow are retained.
- Finance explicitly marked unavailable rather than showing fabricated accounting/payment data.
- Native React Native dashboard, company list, functional module navigation, authenticated login, module headers, authorized-company chips and compact record cards. No Expo or new camera/scanning feature added.

## Known scope limitations

- Upstream sales supports drafts/cancellation only. No confirmed sales, final tax/total, stock reservation, invoicing or payment flow exists here.
- Finance, order receipts, global cross-module search, live financial KPIs, barcode-scanning camera, tablet split-view and complete dark-mode controls are **not implemented** in this branch.
- The company selector is currently per business workspace. It is not a global persisted company context. Requests remain scoped and reloaded on changing company.
- This UX branch is a functional visual evolution, **not** complete certification of every web/mobile route or a reproduction of every decorative element in the concept image.
- Modal focus trapping, user-testing, browser screenshots and device/APK behavior still require certification.

## Validation required before marking ready

Run on the exact PR head and record logs:

1. npm ci
2. npm run check
3. npm run typecheck
4. npm run lint
5. npm run build
6. npm run test
7. npm run bundle:android --workspace=@erp/mobile

Then confirm manually at minimum:
- Browser 360, 390, 768, 1366 and 1440 px: sidebar, overflow, table and keyboard navigation.
- Authenticated user: login/logout/refresh; no authenticated data leakage after switching tenant or company.
- CRM: customer CRUD and status; Purchasing: supplier CRUD/status; Inventory: product/warehouse CRUD and idempotent movements; Sales: draft create/cancel.
- API failure, authorization denial, empty records, disconnected/retry, fast company switching and in-flight write handling.
- Android emulator/device: app navigation, authorized company picker, list/detail/edit and session restoration.

## Current CI blocker

GitHub Actions for PR #4 has reported failure across jobs, with no completed steps in the queried Build/Typecheck jobs; the job log endpoint returned BlobNotFound. The repository code has therefore **not been certified** with a successful typecheck, build, integration suite, browser test or Android APK. Do not interpret these CI statuses as a compiler finding or as passing checks.

Keep PR #4 in draft and preserve upstream PR order until executable CI/device evidence is available.
