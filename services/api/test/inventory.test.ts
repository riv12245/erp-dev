import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { InventoryService, validateMovementAllowed, nextStockBalance } from '../src/modules/inventory/index.js';
import type { CompanyScope } from '../src/platform/tenancy/company-access.js';
import { AuditService } from '../src/platform/audit/audit-service.js';
describe('Inventory atomic ledger and scoped catalog', () => {
    let mongo: MongoMemoryReplSet;
    let connection: mongoose.Connection;
    let service: InventoryService;
    const scope: CompanyScope = { tenantId: 'inventory-test', companyId: 'company-a', userId: 'actor', locale: 'en', timezone: 'UTC' };
    beforeAll(async () => {
        mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        connection = await mongoose.createConnection(mongo.getUri(), { dbName: 'inventory_test' }).asPromise();
        service = new InventoryService(connection);
        await service.initialize();
    });
    afterAll(async () => {
        await connection?.close();
        await mongo?.stop();
    });
    async function fixture() {
        const product = await service.createProduct(scope, { name: 'Widget', sku: crypto.randomUUID(), unitOfMeasure: 'piece' });
        const warehouse = await service.createWarehouse(scope, { name: 'Main', code: crypto.randomUUID() });
        return { productId: product.id, warehouseId: warehouse.id };
    }
    it('prevents negative adjustments and transfer-out underflow', () => {
        expect(() => validateMovementAllowed(2, { type: 'adjustment', quantity: -3 })).toThrow();
        expect(() => validateMovementAllowed(2, { type: 'transfer-out', quantity: 3 })).toThrow();
    });
    it('uses exact six-decimal quantities and rejects precision excess and overflow', () => {
        expect(nextStockBalance(0.3, { type: 'outbound', quantity: 0.1 })).toBe(0.2);
        expect(nextStockBalance(0.2, { type: 'outbound', quantity: 0.2 })).toBe(0);
        expect(nextStockBalance(0.1 + 0.2, { type: 'outbound', quantity: 0.3 })).toBe(0);
        expect(() => nextStockBalance(0, { type: 'inbound', quantity: 0.0000001 })).toThrow('six decimal');
        expect(() => nextStockBalance(0, { type: 'inbound', quantity: 1.0000001 })).toThrow('six decimal');
        expect(() => nextStockBalance(0, { type: 'inbound', quantity: 10_000_000_000 })).toThrow('safe scaled');
        expect(() => nextStockBalance(9_000_000_000, { type: 'inbound', quantity: 10_000_000 })).toThrow('safe scaled');
    });
    it('persists 0.3 minus 0.1 minus 0.2 as zero without a false shortage', async () => {
        const refs = await fixture();
        for (const [type, quantity] of [['inbound', 0.3], ['outbound', 0.1], ['outbound', 0.2]] as const) {
            await service.recordMovement(scope, { ...refs, type, quantity, reason: 'Decimal regression', idempotencyKey: crypto.randomUUID() });
        }
        expect((await service.getAvailability(scope, refs.productId, refs.warehouseId)).onHand).toBe(0);
    });
    it('serializes competing fractional outbound movements exactly', async () => {
        const refs = await fixture();
        await service.recordMovement(scope, { ...refs, type: 'inbound', quantity: 0.3, reason: 'Initial', idempotencyKey: crypto.randomUUID() });
        const results = await Promise.allSettled([1, 2].map(() => service.recordMovement(scope, { ...refs, type: 'outbound', quantity: 0.2, reason: 'Concurrent fraction', idempotencyKey: crypto.randomUUID() })));
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect((await service.getAvailability(scope, refs.productId, refs.warehouseId)).onHand).toBe(0.1);
    });
    it('scopes SKU uniqueness and rejects stale edits and unknown fields', async () => {
        const sku = crypto.randomUUID();
        const row = await service.createProduct(scope, { name: 'Part', sku, unitOfMeasure: 'piece' });
        await expect(service.createProduct(scope, { name: 'Part', sku, unitOfMeasure: 'piece' })).rejects.toThrow('Duplicate');
        await service.createProduct({ ...scope, companyId: 'company-b' }, { name: 'Part', sku, unitOfMeasure: 'piece' });
        await expect(service.getProduct({ ...scope, companyId: 'company-b' }, row.id)).rejects.toThrow('not found');
        await expect(service.getProduct({ ...scope, tenantId: 'other' }, row.id)).rejects.toThrow('not found');
        await service.patchProduct(scope, row.id, { expectedVersion: 0, name: 'Edited' });
        await expect(service.patchProduct(scope, row.id, { expectedVersion: 0, name: 'Stale' })).rejects.toThrow('Version');
        await expect(service.createProduct(scope, { name: 'X', sku: 'x', unitOfMeasure: 'piece', tenantId: 'escape' })).rejects.toThrow('Unknown');
    });
    it('replays one movement and rejects reuse with changed input', async () => {
        const refs = await fixture();
        const input = { ...refs, type: 'inbound' as const, quantity: 8, reason: 'Opening count', idempotencyKey: crypto.randomUUID() };
        const first = await service.recordMovement(scope, input);
        const replay = await service.recordMovement(scope, input);
        expect(replay.id).toBe(first.id);
        await expect(service.recordMovement(scope, { ...input, quantity: 9 })).rejects.toThrow('Idempotency');
        expect((await service.getAvailability(scope, refs.productId, refs.warehouseId)).onHand).toBe(8);
    });
    it('allows only one competing outbound and never negative stock', async () => {
        const refs = await fixture();
        await service.recordMovement(scope, { ...refs, type: 'inbound', quantity: 5, reason: 'Initial', idempotencyKey: crypto.randomUUID() });
        const results = await Promise.allSettled([1, 2].map(() => service.recordMovement(scope, { ...refs, type: 'outbound', quantity: 4, reason: 'Delivery', idempotencyKey: crypto.randomUUID() })));
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        expect((await service.getAvailability(scope, refs.productId, refs.warehouseId)).onHand).toBe(1);
    });
    it('rolls back balance and ledger when audit fails', async () => {
        const refs = await fixture();
        const spy = vi.spyOn(AuditService.prototype, 'record').mockRejectedValueOnce(new Error('audit failure'));
        await expect(service.recordMovement(scope, { ...refs, type: 'inbound', quantity: 3, reason: 'Initial', idempotencyKey: crypto.randomUUID() })).rejects.toThrow('audit failure');
        spy.mockRestore();
        expect((await service.getAvailability(scope, refs.productId, refs.warehouseId)).onHand).toBe(0);
        expect((await service.list(scope, 'movement', { productId: refs.productId })).total).toBe(0);
    });
    it('rejects inactive products, malformed pagination, and reservations', async () => {
        const refs = await fixture();
        await service.patchProduct(scope, refs.productId, { expectedVersion: 0, isActive: false });
        await expect(service.recordMovement(scope, { ...refs, type: 'inbound', quantity: 1, reason: 'Inactive', idempotencyKey: crypto.randomUUID() })).rejects.toThrow('inactive');
        await expect(service.list(scope, 'product', { page: ['1'] })).rejects.toThrow('pagination');
        expect(() => service.reserveStock()).toThrow('not supported');
    });
});
