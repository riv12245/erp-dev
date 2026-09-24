# Durable Outbox delivery

`@erp/outbox` owns the persisted event envelope, Mongo schema and repository. Both API and worker use collection `outbox` in `MONGODB_DB_NAME` (default `erp_dev`) through `MONGODB_URI`. `MONGO_URI` remains a worker compatibility fallback only.

## Guarantees

- Each claim uses one atomic `findOneAndUpdate`, a random claim token, worker owner and expiring lease. Attempts increment on claim, including crashes.
- Publication and failure acknowledgements compare event, tenant, owner, claim token and live lease. An expired owner cannot alter the new owner's result.
- Retry delays grow exponentially and are capped. Exhausted events remain `failed` for inspection; they are never silently deleted.
- `append(record, session)` joins the caller's MongoDB business transaction. Merely calling `append` without a session does not make another business write atomic.
- The worker polls continuously and awaits active delivery on shutdown. It claims one event at a time to avoid leasing an entire waiting batch.
- The default publisher writes an idempotent durable envelope to `event_inbox`, preserving tenant and correlation ID. Outbox `published` means delivered to this inbox. Business outcomes live in per-consumer records; delivery alone never implies business handling. No sales/finance side effect is simulated.
- Restart after delivery but before acknowledgement is safe for this inbox: its unique `(tenantId,eventId)` index prevents duplicate inserts. Future external consumers still require their own idempotency and transaction strategy.

## Durable consumption

`event_inbox` retains the original delivered envelope. Its `pending` field is a delivery-era marker, not an aggregate claim that every consumer has completed. The separate `event_inbox_consumptions` collection records one subscription outcome per unique `(tenantId,eventId,consumerId)`. This separation preserves old inbox documents and permits multiple consumers without replacing the delivery deduplication index.

Consumers explicitly register a stable consumer ID, exact event name/version and a Mongo transaction handler. No business consumers are installed by default. Unsupported envelopes remain available for future registration. Bounded fan-out materializes missing consumption records from retained envelopes; a crash during fan-out is safe to retry. Renaming a consumer ID deliberately creates a new subscription and replays retained matching envelopes, so IDs must be treated as durable contracts.

Composition roots call `InboxProcessor.getInstance().register({ consumerId, eventName, eventVersion, handle })` before `Worker.start()`. Registration during execution or duplicate consumer IDs is rejected. Worker shutdown waits for active deliveries/transactions and stops taking subsequent batch claims; partial startup failure attempts cleanup of all components before disconnecting Mongo. Worker failure records use bounded classifications rather than arbitrary exception messages that could contain credentials or payloads.

Mongo connection failures close the allocated connection before returning a sanitized error; asynchronous driver errors and startup logs omit raw exceptions. The fallback worker identity is generated once per process. Retry budgets, delays, polling intervals and concurrency settings must be safe integers within the supported timer range; intervals/budgets require positive values, while retry delay may be zero. All worker configuration is validated before worker resources start. `connection.test.ts` and `config.test.ts` cover these contracts with unit tests; connection lifecycle doubles are not live Mongo integration evidence.

Consumption states are `pending`, `processing`, `retrying`, `succeeded`, and terminal `failed`. Attempts increment when an atomic claim succeeds, including attempts abandoned by crashes. Each claim carries an owner, random fencing token and lease. Failed execution retains its last error and exponentially delayed availability; exhaustion retains the record and failure timestamp. Expired final attempts become terminal failures on the next consumer poll.

The repository runs the consumer callback and success transition in one MongoDB transaction on the same connection. It checks ownership before running the callback and again before success, so stale owners cannot commit effects. Consumers must use the supplied session for **every** database effect, must scope effects with the supplied envelope's tenant, and must tolerate transaction callback replay. Network calls, email delivery, other database connections, and unsessioned writes are not permitted inside these callbacks: instead append an outgoing event with the same session and perform external delivery with the destination's durable idempotency key. This is a transactional Mongo guarantee, not an exactly-once guarantee for arbitrary external systems.

`metrics(consumerId, tenantId?)` reports durable counts by state, including terminal failures. Operational queries may intentionally span tenants; every ownership transition includes tenant/event/consumer and the full ownership fence. Event and correlation IDs remain available for worker logs and incident inspection. No automatic replay or deletion of terminal records is performed.

## Existing data

The former worker used collection `outboxes` with incompatible `id/eventType` fields. The worker now reads the API's `outbox` collection. No historical data is deleted or guessed during migration. Inspect any existing `outboxes` documents before mapping them; missing tenant/correlation metadata requires an explicit recovery decision.

The new consumption collection is additive; the existing inbox unique index is unchanged. Ensure the unique consumption index and claim indexes are installed before enabling consumers. Publisher initialization also creates the event name/version/receipt ordering index used for fan-out. Replica-set or sharded MongoDB transactions are required; standalone MongoDB cannot provide transactional consumption. Retained inbox history is replayed when a new consumer registers. Terminal failures require explicit operational review; there is no implicit reset/replay endpoint. Worker clocks must be synchronized for lease expiration, and handlers must finish inside the configured lease. Fan-out inserts a bounded batch but examines retained matching history; monitor its query cost before enabling high-volume retention.

## Validation

`services/worker/tests/outbox.test.ts` exercises API envelope delivery, two workers, lease fencing, crash recovery, durable deduplication, failed delivery, retry exhaustion, transactional rollback and continuous polling using a MongoDB replica set. `services/api/test/outbox.test.ts` verifies atomic claims, unique event IDs and a delegate failure that remains retryable.

`services/worker/tests/inbox.test.ts` exercises transactional effects rollback, concurrent claims and duplicate execution, independent tenant/consumer deduplication, backoff, expired-owner fencing, crash exhaustion, polling and graceful stop against a real local MongoDB replica set. `services/worker/tests/worker-lifecycle.test.ts` verifies cleanup after partial startup using isolated lifecycle doubles (it is not Mongo integration evidence).

Local validation on September 22, 2026 successfully ran MongoDB replica-set integration tests. The existing Redis publication test was not executed because Redis is unavailable locally; its conditional skip is not evidence of a passing Redis integration. CI requires Redis and rejects its absence.
