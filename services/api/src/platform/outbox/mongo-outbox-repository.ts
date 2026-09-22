// One persisted contract and implementation for both API producers and worker delivery.
export { MongoOutboxRepository, getOutboxModel, eventToOutboxRecord } from '@erp/outbox';
export type { OutboxRecord, OutboxClaim, OutboxRepository, OutboxDocument } from '@erp/outbox';
