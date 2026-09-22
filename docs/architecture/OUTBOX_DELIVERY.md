# Durable Outbox delivery

`@erp/outbox` owns the persisted event envelope, Mongo schema and repository. Both API and worker use collection `outbox` in `MONGODB_DB_NAME` (default `erp_dev`) through `MONGODB_URI`. `MONGO_URI` remains a worker compatibility fallback only.

## Guarantees

- Each claim uses one atomic `findOneAndUpdate`, a random claim token, worker owner and expiring lease. Attempts increment on claim, including crashes.
- Publication and failure acknowledgements compare event, tenant, owner, claim token and live lease. An expired owner cannot alter the new owner's result.
- Retry delays grow exponentially and are capped. Exhausted events remain `failed` for inspection; they are never silently deleted.
- `append(record, session)` joins the caller's MongoDB business transaction. Merely calling `append` without a session does not make another business write atomic.
- The worker polls continuously and awaits active delivery on shutdown. It claims one event at a time to avoid leasing an entire waiting batch.
- The default publisher writes an idempotent durable envelope to `event_inbox`, preserving tenant and correlation ID. Outbox `published` means delivered to this inbox. Inbox `pending` explicitly means business handling has not run. No sales/finance side effect is simulated.
- Restart after delivery but before acknowledgement is safe for this inbox: its unique `(tenantId,eventId)` index prevents duplicate inserts. Future external consumers still require their own idempotency and transaction strategy.

## Existing data

The former worker used collection `outboxes` with incompatible `id/eventType` fields. The worker now reads the API's `outbox` collection. No historical data is deleted or guessed during migration. Inspect any existing `outboxes` documents before mapping them; missing tenant/correlation metadata requires an explicit recovery decision.

## Validation

`services/worker/tests/outbox.test.ts` exercises API envelope delivery, two workers, lease fencing, crash recovery, durable deduplication, failed delivery, retry exhaustion, transactional rollback and continuous polling using a MongoDB replica set. `services/api/test/outbox.test.ts` verifies atomic claims, unique event IDs and a delegate failure that remains retryable.

Local environment limitation: mongod 7.0.24 starts but exits with `open: Operation not permitted` before opening its storage engine. Mongo integration validation is performed in GitHub Actions; no mock is substituted for these tests.
