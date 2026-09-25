import mongoose from 'mongoose';
import type { PurchaseOrderDTO } from '@erp/contracts/shared';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { TenantScopedRepository } from '../../../platform/tenancy/tenant-scoped-repository.js';
import { AppError } from '../../../shared/errors/app-error.js';

export interface PurchaseOrderRow extends Omit<PurchaseOrderDTO, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey: string;
  fingerprint: string;
}

const lineSchema = new mongoose.Schema(
  { lineId: String, itemId: String, description: String, quantity: Number, unitPrice: Number, subtotal: Number },
  { _id: false }
);

const schema = new mongoose.Schema<PurchaseOrderRow>(
  {
    orderId: { type: String, required: true },
    number: { type: String, required: true },
    tenantId: { type: String, required: true },
    companyId: { type: String, required: true },
    supplierId: { type: String, required: true },
    warehouseId: { type: String, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'], required: true },
    lines: { type: [lineSchema], required: true },
    subtotal: { type: Number, required: true },
    version: { type: Number, required: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
  },
  { collection: 'purchase_orders', timestamps: true, versionKey: false, strict: 'throw' }
);

schema.index({ tenantId: 1, companyId: 1, orderId: 1 }, { unique: true });
schema.index({ tenantId: 1, companyId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ tenantId: 1, companyId: 1, createdAt: -1, orderId: 1 });

export function purchaseOrderModel(connection: mongoose.Connection): mongoose.Model<PurchaseOrderRow> {
  return (connection.models.PurchaseOrder as mongoose.Model<PurchaseOrderRow>) ??
    connection.model<PurchaseOrderRow>('PurchaseOrder', schema);
}

export function purchaseOrderDto(row: PurchaseOrderRow): PurchaseOrderDTO {
  return {
    orderId: row.orderId,
    number: row.number,
    tenantId: row.tenantId,
    companyId: row.companyId,
    supplierId: row.supplierId,
    warehouseId: row.warehouseId,
    currency: row.currency,
    status: row.status,
    lines: row.lines.map((line: { lineId: string; itemId: string; description: string; quantity: number; unitPrice: number; subtotal: number }) => ({
      lineId: line.lineId,
      itemId: line.itemId,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      subtotal: line.subtotal,
    })),
    subtotal: row.subtotal,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

export class PurchaseOrderRepository extends TenantScopedRepository {
  private readonly orders;
  constructor(connection: mongoose.Connection, private readonly scope: CompanyScope) {
    const model = purchaseOrderModel(connection);
    super(model as unknown as mongoose.Model<unknown>, scope);
    this.orders = model;
    if (!scope.companyId || !scope.userId) throw AppError.forbidden('Company scope required');
  }

  private filter(extra: Record<string, unknown>) {
    return this.tenantFilter({ $and: [{ companyId: this.scope.companyId }, extra] });
  }

  one(extra: Record<string, unknown>, session?: mongoose.ClientSession) {
    return this.orders.findOne(this.filter(extra)).session(session ?? null).exec();
  }

  async insert(
    data: Omit<PurchaseOrderRow, 'createdAt' | 'updatedAt' | 'tenantId' | 'companyId' | 'createdBy' | 'updatedBy'>,
    session: mongoose.ClientSession
  ) {
    const rows = await this.orders.create(
      [
        {
          ...data,
          tenantId: this.requireTenantId(),
          companyId: this.scope.companyId,
          createdBy: this.scope.userId,
          updatedBy: this.scope.userId,
        },
      ],
      { session }
    );
    return rows[0]!;
  }

  updateStatus(
    orderId: string,
    version: number,
    fromStatus: string,
    toStatus: string,
    session: mongoose.ClientSession
  ) {
    return this.orders
      .findOneAndUpdate(
        this.filter({ orderId, version, status: fromStatus }),
        { $set: { status: toStatus, updatedBy: this.scope.userId }, $inc: { version: 1 } },
        { new: true, session }
      )
      .exec();
  }

  async list(page: number, limit: number, status?: string, supplierId?: string) {
    const filter = this.filter({ ...(status ? { status } : {}), ...(supplierId ? { supplierId } : {}) });
    const [items, total] = await Promise.all([
      this.orders.find(filter).sort({ createdAt: -1, orderId: 1 }).skip((page - 1) * limit).limit(limit),
      this.orders.countDocuments(filter),
    ]);
    return { items: items.map(purchaseOrderDto), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
