# Foundation stabilization execution

## Core maturation — 2026-09-22

Authoritative continuation from clean `dde9d4c` (`main` and `origin/main`, fetched and verified). Working branch: `codex/core-maturation`. No production operations or deployment authorized. This section is the single issue/execution ledger for the current phase; historical evidence below remains historical.

| ID | Priority / evidence | Impact | Correction and validation | State |
|---|---|---|---|---|
| C01 | P1: reproducible install and `test/seed.test.ts` | Incomplete baseline evidence | Clean npm ci + selected reviewed scripts passed; real-Mongo seed passes empty/repeated/reset safety cases; protected demo IDs/unrelated memberships | resuelta |
| C02 | P0: `platform/auth` had no persisted session | No revocation/restoration | Hash-only Mongo sessions, CAS rotation/reuse family revoke, immediate access checks and global user epoch; 7 real HTTP/Mongo tests including process restart | resuelta |
| C03 | P1: both auth stores had only memory | No secure restoration/concurrent refresh policy | HttpOnly web / Android Keystore ciphertext; single-flight, epoch fences, offline intent, logout-all; 23 client tests including 3 real HTTP/Mongo, native APK compiles | resuelta; device runtime pending C10 |
| C04 | P1: durable inbox receipt had no processing contract | Receipt mistaken for business completion | Separate tenant/event/consumer state, fenced claims/retries and transactional effects; real replica-set rollback/concurrency/crash recovery tests. No invented consumers | resuelta; business subscription decisions pending |
| C05 | P1: config defaults, parser/rate errors, startup/shutdown | Unsafe defaults and unreliable failure handling | Explicit secrets, validated TTL/numbers/origins, correlated JSON 400/413/429, awaited listen/drain and worker cleanup; regression tests | resuelta |
| C06 | P1: OpenAPI drift and base repository update/pagination | Contract and data-integrity risk | 40 OpenAPI operations; shared credential bounds; protected update metadata and 1–100 query bound; tenant foreign-ID tests; additive index/rollout guidance | resuelta |
| C07 | P1: final exact-source validation and delivery | Unverifiable release claims | Four distinct reviews and final gates; authorized branch/PR publication without deployment | en curso |
| C08 | P1: GitHub checks have zero executed steps | Remote CI cannot validate code | Run 35797825875 (dde9d4c), check 106981100753 and prior run 35796127245 explicitly cite failed payments/spending limit. Account owner must resolve billing; no control bypass | bloqueada externamente |
| C09 | P1: npm audit lock reports 20 entries | Mobile transitive exposure remains | Fresh authorized audit: 13 moderate, 7 high, 0 critical. No compatible safe in-range fix established; no force or incompatible override applied | pendiente: native-stack migration |
| C10 | P1: no Redis executable/runtime, no connected Android device | Remaining integration coverage | Loopback Redis ECONNREFUSED; conditional test not passed. APK compiled but no installation/Keystore runtime evidence. Node cookie-jar tests do not certify browser cookie enforcement | bloqueada por entorno |

Decisions: preserve actual `{data, meta?, correlationId}` / `{error, correlationId}` envelopes over the historical examples in AI_WORKING_RULES. Reuse existing validation instead of installing Joi/Celebrate merely to satisfy stale examples. Preserve explicit global identity/reference-data and internal system processing exceptions to tenant-scoped business storage. No general architecture rewrite.

Session design: Mongo session is authoritative on every authenticated request (revocation effective immediately for subsequent checks). Opaque high-entropy refresh tokens are stored only as hashes. Rotation is a single-document compare-and-swap; known reused credentials revoke that session family, including competing refreshes. Absolute expiry is bounded and old tokens do not prolong it. Web uses HttpOnly SameSite=Strict cookie scoped to `/api/v1/auth`, Secure in production, exact allowed Origin validation on cookie operations; configured deployment is same-site local development. Native uses explicit body transport without browser Origin and encrypted Android Keystore storage. Cross-site web deployment needs an explicit transport/CSRF redesign, not relaxed defaults.

### Evidence and four reviews

1. **Structure/contracts:** traced all implemented routes and model usages, preserved actual envelopes, updated refresh/logout/logout-all and error responses in OpenAPI. Removed obsolete env examples. The repository check is structural, not full OpenAPI schema certification. No tenant data/permission cache exists in current API; business references in skeleton modules cannot be meaningfully certified yet.
2. **Security/integrity:** independent read-only session review found the new login maximum did not match registration. Reproduced then fixed shared email/password bounds; boundary login test passes. Tenant repository now rejects protected metadata/operator updates and unlimited pagination. Session hashes, active membership and role changes are checked against real Mongo. Additive indexes are documented; no production migration or destructive index synchronization ran.
3. **Failures/concurrency:** red/green tests cover same-token refresh races, known reuse versus guesses, immediate/all-session revocation, expired sessions, late client responses, storage failures, inbox rollback/lease expiry, concurrent effects and worker partial startup cleanup. The real two-process API restart test exposed early return from listen; fixed and verified. Lifecycle driver doubles are unit evidence only.
4. **Use/integration:** shared controllers exercise native/web transports over loopback HTTP + Mongo; Node supplies a cookie jar but does not emulate browser security. Android Metro bundle and x86_64 debug APK compile, including Keystore Kotlin module. No device is attached. Debug APK needs Metro; it is not a release/offline standalone app.

Windows installation: Node 24.18.0 / npm 11.16.0; repository requires Node >=22.12 and CI targets 22. A subagent accidentally ran pnpm during the initial npm installation and moved root dev dependencies. It was stopped, its generated workspace-local `.pnpm-store` removed after path verification, and a second isolated `npm ci --ignore-scripts --no-audit --no-fund` restored the lock tree and bins. No pnpm manifests/lock/store were retained. `npm run deps:prepare` executes only reviewed exact esbuild 0.28.2 and mongodb-memory-server 10.4.3. npm 11 allowScripts warnings are advisory, not proof scripts were blocked. CI uses the same portable two-step policy; this does not repair the account billing blocker.

Dependency review: affected transitive roots are `decode-uri-component@0.2.2` via React Navigation/query-string, `fast-xml-parser@4.5.7` via React Native CLI, and `image-size@1.2.1` via Metro. Current audit recommends breaking parent upgrades (navigation 7, CLI 20, RN 0.87/Metro 0.86+); no force fix/major override. Navigation's decoder may ship in the app; XML parsing and image inspection are principally native build/dev tools here. No direct API imports were found. Advisory references: [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [GHSA-gh4j-gqv2-49f6](https://github.com/advisories/GHSA-gh4j-gqv2-49f6), [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq). The audit metadata query was initially blocked by automatic review and then completed after explicit user approval; no pending audit permission remains.

Operations: auth_sessions has absolute-expiry checks plus purgeAt TTL seven days later; audit/event retention needs a business decision. New inbox consumers deliberately replay retained matching history and must join all effects to the supplied Mongo transaction. External effects require an outgoing outbox/idempotent destination. No business subscriptions were fabricated. Count statuses and oldest available/occurred timestamps for backlog age; inspect attempts, failedAt/lastError and expired processing leases for recovery. Audit listing now has a tenant/timestamp index. Review/back up staging data and build additive indexes before traffic; never drop old outboxes or deduplication records implicitly.

### Final local verification

The complete source tree passed `npm run build -- --force` (14 tasks), `npm run check` (architecture, imports, tenant scope, 40 OpenAPI operations / 229 refs), `npm run lint -- --force` and `npm run typecheck -- --force`. Full `npm test -- --force --output-logs=errors-only` exited 0 with 19 tasks: **222 passed, one Redis test unexecuted** (API 93, worker 37, web 23, auth 17, permissions 13, validation 9, utils 25, localization 5). The first final run exposed an obsolete literal name-validation error expectation; updated it for the documented 100-character bound, then repeated the entire suite successfully without cache. No production database was used.

Android `bundle:android` and `:app:assembleDebug -PreactNativeArchitectures=x86_64` passed. Local Java is OpenJDK 21.0.10 (Gradle build succeeded); CI remains Java 17. APK SHA-256: `47269c74494613afc567ed99b8b6198e4bf24ee43bdaca68bade05ad37267f71`. Required NDK 26.1.10909125, Build-Tools 34.0.0 and Platform 34 were provisioned automatically by Gradle under the existing accepted SDK licenses. Build artifacts remain ignored, outside Git. No Android device is connected.

Publication scope: the only GitHub workflow is CI; push/PR does not define deployment. Existing dependency audit remains nonblocking in workflow (not newly weakened). GitHub branch-protection API returns 403 requiring Pro/public repository; absence of retrieved protection data is not proof merging is safe. Publish a PR and leave it unmerged while CI cannot start. Final commit identifiers and PR are recorded in the delivery response; the committed source is rechecked before publication.

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
- The existing CI audit at run 35795053269 reports 20 affected dependency entries (7 high, 13 moderate, zero critical), down from 29 including one critical. Remaining chains are mobile navigation, native CLI XML parsing and Metro image parsing.
- Final code review found two React Native incompatibilities in the shared HTTP client: a browser-only DOMException check and URLSearchParams.set. Three regression tests reproduced them, then passed after platform-independent handling. Web/client tests now total 10. Local build, typecheck, lint and the Android JavaScript bundle were revalidated.
- Native CI exposed SDK setup requesting the removed `tools` package and an incorrect assumption that Android CLI dependencies were hoisted to the repository root. CI now installs explicit SDK packages and Gradle resolves the CLI from the mobile workspace. Run 35795428645 successfully compiled the x86_64 debug APK.
- API seed subprocess tests now run asynchronously with a 30-second bound, keeping the event loop available to drain the MongoMemoryServer process pipes. Production and unrelated-database refusal checks still exit with status 1. Full MongoDB CI validation is required for the final commit.
