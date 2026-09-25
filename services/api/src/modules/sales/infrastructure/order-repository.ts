import mongoose from 'mongoose';
import type { DraftSalesOrderDTO } from '@erp/contracts/sales';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { TenantScopedRepository } from '../../../platform/tenancy/tenant-scoped-repository.js';
import { AppError } from '../../../shared/errors/app-error.js';
export interface OrderRow extends Omit<DraftSalesOrderDTO, 'createdAt' | 'updatedAt'> { createdAt: Date; updatedAt: Date; idempotencyKey: string; fingerprint: string }
const line = new mongoose.Schema({ lineId: String, itemId: String, description: String, quantity: Number, unitPrice: Number, subtotal: Number }, { _id: false });
const schema = new mongoose.Schema<OrderRow>({
  orderId: { type: String, required: true }, number: { type: String, required: true },
  tenantId: { type: String, required: true }, companyId: { type: String, required: true },
  customerId: { type: String, required: true }, warehouseId: { type: String, required: true },
  currency: { type: String, required: true }, status: { type: String, enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'], required: true },
  lines: { type: [line], required: true }, subtotal: { type: Number, required: true },
  total: { type: mongoose.Schema.Types.Mixed, default: null }, taxAmount: { type: mongoose.Schema.Types.Mixed, default: null },
  pricingStatus: { type: String, enum: ['tax-policy-required'], required: true }, version: { type: Number, required: true },
  createdBy: { type: String, required: true }, updatedBy: { type: String, required: true },
  idempotencyKey: { type: String, required: true }, fingerprint: { type: String, required: true },
}, { collection: 'sales_orders', timestamps: true, versionKey: false, strict: 'throw' });
schema.index({ tenantId: 1, companyId: 1, orderId: 1 }, { unique: true });
schema.index({ tenantId: 1, companyId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ tenantId: 1, companyId: 1, createdAt: -1, orderId: 1 });
export function orderModel(connection: mongoose.Connection): mongoose.Model<OrderRow> { return connection.models.SalesOrder as mongoose.Model<OrderRow> ?? connection.model<OrderRow>('SalesOrder', schema); }
export function orderDto(row: OrderRow): DraftSalesOrderDTO {
  return { orderId: row.orderId, number: row.number, tenantId: row.tenantId, companyId: row.companyId, customerId: row.customerId,
    warehouseId: row.warehouseId, currency: row.currency, status: row.status,
    lines: row.lines.map(line => ({ lineId: line.lineId, itemId: line.itemId, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, subtotal: line.subtotal })),
    subtotal: row.subtotal, total: null, taxAmount: null, pricingStatus: 'tax-policy-required', version: row.version,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), createdBy: row.createdBy, updatedBy: row.updatedBy };
}
export class OrderRepository extends TenantScopedRepository {
  private readonly orders;
  constructor(connection: mongoose.Connection, private readonly scope: CompanyScope) {
    const model = orderModel(connection); super(model as unknown as mongoose.Model<unknown>, scope); this.orders = model;
    if (!scope.companyId || !scope.userId) throw AppError.forbidden('Company scope required');
  }
  private filter(extra: Record<string, unknown>) { return this.tenantFilter({ $and: [{ companyId: this.scope.companyId }, extra] }); }
  one(extra: Record<string, unknown>, session?: mongoose.ClientSession) { return this.orders.findOne(this.filter(extra)).session(session ?? null).exec(); }
  async insert(data: Omit<OrderRow, 'createdAt' | 'updatedAt' | 'tenantId' | 'companyId' | 'createdBy' | 'updatedBy'>, session: mongoose.ClientSession) {
    const rows = await this.orders.create([{ ...data, tenantId: this.requireTenantId(), companyId: this.scope.companyId, createdBy: this.scope.userId, updatedBy: this.scope.userId }], { session }); return rows[0]!;
  }
  cancel(orderId: string, version: number, session: mongoose.ClientSession) {
    return this.orders.findOneAndUpdate(this.filter({ orderId, version, status: 'DRAFT' }), { $set: { status: 'CANCELLED', updatedBy: this.scope.userId }, $inc: { version: 1 } }, { new: true, session }).exec();
  }
  confirm(orderId: string, version: number, session: mongoose.ClientSession) {
    return this.orders.findOneAndUpdate(this.filter({ orderId, version, status: 'DRAFT' }), { $set: { status: 'CONFIRMED', updatedBy: this.scope.userId }, $inc: { version: 1 } }, { new: true, session }).exec();
  }
  async list(page: number, limit: number, status?: string, customerId?: string) {
    const filter = this.filter({ ...(status ? { status } : {}), ...(customerId ? { customerId } : {}) });
    const [items, total] = await Promise.all([this.orders.find(filter).sort({ createdAt: -1, orderId: 1 }).skip((page - 1) * limit).limit(limit), this.orders.countDocuments(filter)]);
    return { items: items.map(orderDto), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
