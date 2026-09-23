import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import type { Product, StockAvailability } from '@erp/contracts/inventory';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { AuditService } from '../../../platform/audit/audit-service.js';
import { getAuditModel } from '../../../platform/audit/audit-model.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { InventoryRepository, inventoryModel, type InventoryKind, type InventoryRow } from '../infrastructure/inventory-repository.js';
import { object, text, identifier, number, productInput, nextStockBalance } from '../domain/inventory.js';
export interface MovementInput {
    productId: string;
    warehouseId: string;
    type: 'inbound' | 'outbound' | 'adjustment';
    quantity: number;
    reason: string;
    idempotencyKey: string;
    referenceId?: string | null;
}
export function serialize(row: InventoryRow) {
    const { _id, tenantId: _tenant, fingerprint: _fingerprint, ...rest } = row;
    return { ...rest, id: _id, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export class InventoryService {
    constructor(private readonly connection: mongoose.Connection) {
    }
    private repo(scope: CompanyScope, kind: InventoryKind) {
        return new InventoryRepository(this.connection, scope, kind);
    }
    async initialize(): Promise<void> {
        await Promise.all([...(['product', 'warehouse', 'stock', 'movement'] as const).map(kind => inventoryModel(this.connection, kind).init()), getAuditModel(this.connection).init()]);
    }
    private async transaction<T>(work: (session: mongoose.ClientSession) => Promise<T>, session?: mongoose.ClientSession): Promise<T> {
        if (session) {
            if (!session.inTransaction())
                throw AppError.validation('An active transaction is required');
            return work(session);
        }
        await this.initialize();
        return this.connection.transaction(work);
    }
    private audit(scope: CompanyScope, action: string, entityType: string, after: InventoryRow, session: mongoose.ClientSession, correlationId?: string) {
        return new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId, actorId: scope.userId, action, entityType, entityId: after._id, after: serialize(after), correlationId }, session);
    }
    async getProduct(scope: CompanyScope, id: string, session?: mongoose.ClientSession): Promise<Product> {
        const row = await this.repo(scope, 'product').one({ _id: identifier(id, 'productId') }, session);
        if (!row)
            throw AppError.notFound('Product not found');
        return serialize(row) as unknown as Product;
    }
    async requireActiveProduct(scope: CompanyScope, productId: string, session?: mongoose.ClientSession) {
        const row = await this.getProduct(scope, productId, session);
        if (!row.isActive)
            throw AppError.conflict('Product is inactive');
        return row;
    }
    async createProduct(scope: CompanyScope, input: unknown, correlationId?: string) {
        return this.writeCatalog(scope, 'product', productInput(input), undefined, undefined, correlationId);
    }
    async patchProduct(scope: CompanyScope, id: string, input: unknown, correlationId?: string) {
        const data = productInput(input, true);
        return this.writeCatalog(scope, 'product', data, id, (input as {
            expectedVersion: number;
        }).expectedVersion, correlationId);
    }
    private async writeCatalog(scope: CompanyScope, kind: 'product' | 'warehouse', data: Record<string, unknown>, id?: string, expectedVersion?: number, correlationId?: string) {
        try {
            return await this.transaction(async (session) => {
                const repo = this.repo(scope, kind);
                let row;
                if (id) {
                    identifier(id, 'id');
                    if (!await repo.one({ _id: id }, session))
                        throw AppError.notFound(`${kind} not found`);
                    row = await repo.update({ _id: id, version: expectedVersion }, { $set: data, $inc: { version: 1 } }, session);
                    if (!row)
                        throw AppError.conflict('Version conflict');
                }
                else
                    row = await repo.insert(data, session);
                await this.audit(scope, id ? 'update' : 'create', `inventory.${kind}`, row, session, correlationId);
                return serialize(row);
            });
        }
        catch (error) {
            if ((error as {
                code?: number;
            }).code === 11000)
                throw AppError.conflict(`Duplicate ${kind === 'product' ? 'SKU' : 'warehouse code'}`);
            throw error;
        }
    }
    async getWarehouse(scope: CompanyScope, id: string) {
        const row = await this.repo(scope, 'warehouse').one({ _id: identifier(id, 'warehouseId') });
        if (!row)
            throw AppError.notFound('Warehouse not found');
        return serialize(row);
    }
    private warehouseInput(input: unknown, patch = false) {
        const data = object(input, ['name', 'code', 'location', 'type', 'capacity', 'isActive', ...(patch ? ['expectedVersion'] : [])]);
        const result: Record<string, unknown> = patch ? {} : { location: '', type: 'main', capacity: 0, isActive: true };
        for (const key of ['name', 'code'])
            if (!patch || key in data)
                result[key] = text(data[key], key);
        if (typeof result.code === 'string')
            result.code = result.code.toUpperCase();
        if ('location' in data) {
            if (typeof data.location !== 'string' || data.location.length > 1000)
                throw AppError.validation('Invalid location');
            result.location = data.location.trim();
        }
        if ('type' in data) {
            if (!['main', 'regional', 'local', 'dropship'].includes(data.type as string))
                throw AppError.validation('Invalid warehouse type');
            result.type = data.type;
        }
        if ('capacity' in data)
            result.capacity = number(data.capacity, 'capacity');
        if ('isActive' in data) {
            if (typeof data.isActive !== 'boolean')
                throw AppError.validation('Invalid isActive');
            result.isActive = data.isActive;
        }
        if (patch && (!Number.isSafeInteger(data.expectedVersion) || (data.expectedVersion as number) < 0 || (data.expectedVersion as number) >= Number.MAX_SAFE_INTEGER || !Object.keys(result).length))
            throw AppError.validation('Valid expectedVersion and changes required');
        return result;
    }
    createWarehouse(scope: CompanyScope, input: unknown, correlationId?: string) {
        return this.writeCatalog(scope, 'warehouse', this.warehouseInput(input), undefined, undefined, correlationId);
    }
    patchWarehouse(scope: CompanyScope, id: string, input: unknown, correlationId?: string) {
        return this.writeCatalog(scope, 'warehouse', this.warehouseInput(input, true), id, (input as {
            expectedVersion: number;
        }).expectedVersion, correlationId);
    }
    async list(scope: CompanyScope, kind: InventoryKind, query: unknown) {
        const data = object(query, kind === 'product' || kind === 'warehouse' ? ['page', 'limit', 'q'] : ['page', 'limit', 'productId', 'warehouseId']);
        for (const key of ['page', 'limit'])
            if (data[key] !== undefined && (typeof data[key] !== 'string' || !/^[1-9]\d*$/.test(data[key] as string)))
                throw AppError.validation('Invalid pagination');
        const page = data.page === undefined ? 1 : Number(data.page);
        const limit = data.limit === undefined ? 50 : Number(data.limit);
        if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
            throw AppError.validation('Invalid pagination');
        const filter: Record<string, unknown> = {};
        for (const key of ['productId', 'warehouseId'])
            if (data[key] !== undefined)
                filter[key] = identifier(data[key], key);
        if (data.q !== undefined) {
            const q = text(data.q, 'q').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [{ name: { $regex: q, $options: 'i' } }, { [kind === 'warehouse' ? 'code' : 'sku']: { $regex: q, $options: 'i' } }];
        }
        const result = await this.repo(scope, kind).list(filter, page, limit);
        return { ...result, items: result.items.map(row => kind === 'stock' ? this.availability(row) : serialize(row)) };
    }
    private availability(row: Pick<InventoryRow, 'companyId' | 'productId' | 'warehouseId' | 'onHand'>): StockAvailability {
        return { companyId: row.companyId, productId: row.productId, warehouseId: row.warehouseId, onHand: row.onHand, available: row.onHand, reserved: 0, reservationsSupported: false };
    }
    async getAvailability(scope: CompanyScope, productId: string, warehouseId: string, session?: mongoose.ClientSession) {
        await this.requireActiveProduct(scope, productId, session);
        const warehouse = await this.repo(scope, 'warehouse').one({ _id: identifier(warehouseId, 'warehouseId'), isActive: true }, session);
        if (!warehouse)
            throw AppError.notFound('Active warehouse not found');
        const stock = await this.repo(scope, 'stock').one({ productId, warehouseId }, session);
        return this.availability(stock ?? { companyId: scope.companyId, productId, warehouseId, onHand: 0 });
    }
    async recordMovement(scope: CompanyScope, input: MovementInput, correlationId?: string, session?: mongoose.ClientSession) {
        const raw = object(input, ['productId', 'warehouseId', 'type', 'quantity', 'reason', 'idempotencyKey', 'referenceId']);
        const data = { productId: identifier(raw.productId, 'productId'), warehouseId: identifier(raw.warehouseId, 'warehouseId'), type: text(raw.type, 'type') as MovementInput['type'], quantity: raw.quantity as number, reason: text(raw.reason, 'reason', 1000), idempotencyKey: text(raw.idempotencyKey, 'idempotencyKey', 200), referenceId: raw.referenceId == null ? null : text(raw.referenceId, 'referenceId') };
        if (!['inbound', 'outbound', 'adjustment'].includes(data.type) || typeof data.quantity !== 'number' || !Number.isFinite(data.quantity) || data.quantity === 0 || (data.type !== 'adjustment' && data.quantity < 0))
            throw AppError.validation('Invalid movement');
        const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
        const perform = async (tx: mongoose.ClientSession) => {
            const movements = this.repo(scope, 'movement');
            const previous = await movements.one({ idempotencyKey: data.idempotencyKey }, tx);
            if (previous) {
                if (previous.fingerprint !== fingerprint)
                    throw AppError.conflict('Idempotency key reused with different movement');
                return serialize(previous);
            }
            const available = await this.getAvailability(scope, data.productId, data.warehouseId, tx);
            const nextOnHand = nextStockBalance(available.onHand, data);
            const stocks = this.repo(scope, 'stock');
            const key = { productId: data.productId, warehouseId: data.warehouseId };
            const existing = await stocks.one(key, tx);
            if (existing) {
                const updated = await stocks.update({ ...key, onHand: existing.onHand }, { $set: { onHand: nextOnHand }, $inc: { version: 1 } }, tx);
                if (!updated)
                    throw AppError.conflict('Stock changed concurrently');
            }
            else
                await stocks.insert({ ...key, onHand: nextOnHand }, tx);
            const movement = await movements.insert({ ...data, skuId: data.productId, fingerprint }, tx);
            await this.audit(scope, 'movement', 'inventory.stock', movement, tx, correlationId);
            return serialize(movement);
        };
        try {
            return await this.transaction(perform, session);
        }
        catch (error) {
            if (!session && (error as {
                code?: number;
            }).code === 11000)
                return this.transaction(perform);
            throw error;
        }
    }
    reserveStock(): never {
        throw new AppError(501, 'INVENTORY_RESERVATION_UNSUPPORTED', 'Stock reservations are not supported');
    }
}
