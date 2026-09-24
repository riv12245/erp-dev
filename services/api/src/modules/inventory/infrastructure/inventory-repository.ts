import mongoose from 'mongoose';
import { TenantScopedRepository } from '../../../platform/tenancy/tenant-scoped-repository.js';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { AppError } from '../../../shared/errors/app-error.js';
export type InventoryKind = 'product' | 'warehouse' | 'stock' | 'movement';
export interface InventoryRow extends Record<string, unknown> {
    _id: string;
    tenantId: string;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    onHand: number;
    productId: string;
    warehouseId: string;
    fingerprint: string;
}
export function inventoryModel(connection: mongoose.Connection, kind: InventoryKind): mongoose.Model<unknown> {
    const name = `Inventory_${kind}`;
    if (connection.models[name])
        return connection.models[name] as mongoose.Model<unknown>;
    const base = { _id: { type: String, default: () => crypto.randomUUID() }, tenantId: { type: String, required: true }, companyId: { type: String, required: true }, version: { type: Number, default: 0 } };
    const fields = kind === 'product' ? { name: String, sku: String, description: String, category: String, subcategory: String, unitOfMeasure: String, costPrice: Number, sellingPrice: Number, taxRate: Number, weight: Number, dimensions: mongoose.Schema.Types.Mixed, isActive: Boolean }
        : kind === 'warehouse' ? { name: String, code: String, location: String, type: String, capacity: Number, isActive: Boolean }
            : kind === 'stock' ? { productId: String, warehouseId: String, onHand: Number }
                : { productId: String, skuId: String, warehouseId: String, type: String, quantity: Number, reason: String, referenceId: String, idempotencyKey: String, fingerprint: String };
    const schema = new mongoose.Schema({ ...base, ...fields }, { timestamps: true, versionKey: false, collection: `inventory_${kind}s` });
    if (kind === 'product')
        schema.index({ tenantId: 1, companyId: 1, sku: 1 }, { unique: true });
    if (kind === 'warehouse')
        schema.index({ tenantId: 1, companyId: 1, code: 1 }, { unique: true });
    if (kind === 'stock')
        schema.index({ tenantId: 1, companyId: 1, productId: 1, warehouseId: 1 }, { unique: true });
    if (kind === 'movement')
        schema.index({ tenantId: 1, companyId: 1, idempotencyKey: 1 }, { unique: true });
    schema.index({ tenantId: 1, companyId: 1, createdAt: -1, _id: 1 });
    return connection.model(name, schema) as unknown as mongoose.Model<unknown>;
}
export class InventoryRepository extends TenantScopedRepository {
    constructor(connection: mongoose.Connection, private readonly scope: CompanyScope, kind: InventoryKind) {
        super(inventoryModel(connection, kind), scope);
        if (!scope.companyId || !scope.userId)
            throw AppError.forbidden('Company scope required');
    }
    private scoped(extra: Record<string, unknown> = {}) {
        return this.tenantFilter({ $and: [{ companyId: this.scope.companyId }, extra] });
    }
    async one(extra: Record<string, unknown>, session?: mongoose.ClientSession): Promise<InventoryRow | null> {
        return await this.model.findOne(this.scoped(extra)).session(session ?? null).lean().exec() as unknown as InventoryRow | null;
    }
    async insert(data: Record<string, unknown>, session?: mongoose.ClientSession): Promise<InventoryRow> {
        const docs = await this.model.create([{ ...data, tenantId: this.requireTenantId(), companyId: this.scope.companyId }], { session });
        return docs[0]!.toObject() as unknown as InventoryRow;
    }
    async update(extra: Record<string, unknown>, update: Record<string, unknown>, session?: mongoose.ClientSession): Promise<InventoryRow | null> {
        return await this.model.findOneAndUpdate(this.scoped(extra), update, { new: true, session }).lean().exec() as unknown as InventoryRow | null;
    }
    async list(extra: Record<string, unknown>, page: number, limit: number) {
        const filter = this.scoped(extra);
        const [items, total] = await Promise.all([this.model.find(filter).sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean().exec(), this.model.countDocuments(filter)]);
        return { items: items as unknown as InventoryRow[], total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}
