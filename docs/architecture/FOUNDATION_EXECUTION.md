# Foundation stabilization execution

## Goal and authority

Implement the user's Foundation/Core acceptance criteria on `ErickRFM/erp-dev`, starting at upstream `3f4b721c7e2152a0b99db4549da58446450a1739`. Preserve the modular monolith, strict TypeScript, tenant isolation and public API envelopes. Do not add business modules to mask missing infrastructure.

## Execution plan

1. Reproduce the build from the exact Git blobs. Remove generated compiler caches from version control and isolate build/typecheck state. Verify declarations exist, then run build, typecheck and lint.
2. Exercise web/mobile login against the shared API client. Keep token and tenant together, clear context on logout, and reject stale login results. Test URL configuration and request context changes.
3. Establish one persisted Outbox contract used by API and worker. Claim atomically with expiring ownership, bounded retries and fenced acknowledgements. Verify with actual MongoDB, two consumers, handler failure and lease recovery. Do not acknowledge unknown events as successfully consumed.
4. Run the complete existing test suites and architecture gates. Resolve dependency advisories where upgrades are compatible; document native Android and environment limits explicitly.
5. Review the resulting diff, publish coherent commits through the GitHub connection, verify CI, merge the reviewed PR with the user's authorization, and check main.

## Review focus

- Incremental compiler caches must not hide missing declarations on a clean checkout.
- A stale tenant or late login response must not restore a logged-out session.
- Worker failure must leave a durable retry, not lose the event.
- Expired owners must not acknowledge a new owner's event.
- Passing mocked examples must not be counted as MongoDB or native Android evidence.

## Evidence ledger

- Source recovery: 392 blobs fetched through the authorized GitHub connection and checked with Git blob SHA-1. Local Git is an isolated snapshot; its synthetic baseline commit will not be pushed. Remote commits will retain the real upstream parent.
- Initial CI: run 35791418840 failed build, typecheck, lint, tests and audit. Repo checks passed.
- Initial local install: `npm ci --ignore-scripts` succeeded, 1205 packages. No credentials are embedded in this copy.
- Ruling: execution proceeds directly under the user's instruction to continue and integrate; no additional phase approval is required.
- Ruling: user-specified API envelopes override the inconsistent `success` examples in AI_WORKING_RULES.md; preserve the actual contract `{data, meta?, correlationId}` / `{error, correlationId}`.
- CI run 35793451547 at c2da3f6 passed build, typecheck, lint, repository checks and tests. API: 74 tests; worker: 17 passed and one Redis test skipped. Dependency Audit failed and was nonblocking in the existing workflow; overall workflow success does not mean all security findings are resolved.
- Shared Outbox tests use MongoDB replica sets and cover concurrent consumers, retry, expired ownership, durable inbox deduplication and transaction rollback. The local sandbox cannot start mongod (`Operation not permitted`), so MongoDB evidence comes from GitHub Actions.
- Android JavaScript bundle and mobile TypeScript validation pass locally. Native compilation is added to CI; installation and physical-device login are not claimed.
- New CI provisions Redis and the worker event test asserts actual subscriber receipt. An API-client integration test exercises real HTTP login, tenant mismatch and missing authentication.
- Compatible dependency upgrades remove the known critical Vitest advisory. Native React Native/Metro transitive advisories remain. A fresh local audit was blocked by automatic approval review because it can disclose private dependency metadata; no security-clean claim is made.
