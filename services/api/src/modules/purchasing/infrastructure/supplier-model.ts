import mongoose from 'mongoose';
import type { Supplier } from '@erp/contracts/shared';

export interface SupplierAttributes extends Omit<Supplier, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
const schema = new mongoose.Schema<SupplierAttributes>({
  supplierId: { type: String, required: true },
  tenantId: { type: String, required: true },
  companyId: { type: String, required: true },
  name: { type: String, required: true, maxlength: 200 },
  email: { type: String, maxlength: 254 },
  phone: { type: String, maxlength: 50 },
  status: { type: String, enum: ['active', 'inactive'], required: true },
  version: { type: Number, required: true },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true },
}, { timestamps: true, versionKey: false, collection: 'purchasing_suppliers', strict: 'throw' });
schema.index({ tenantId: 1, companyId: 1, supplierId: 1 }, { unique: true });
schema.index({ tenantId: 1, companyId: 1, createdAt: -1, supplierId: 1 });
export function getSupplierModel(connection: mongoose.Connection): mongoose.Model<SupplierAttributes> {
  return (connection.models.PurchasingSupplier as mongoose.Model<SupplierAttributes> | undefined)
    ?? connection.model<SupplierAttributes>('PurchasingSupplier', schema);
}
export function supplierDto(row: SupplierAttributes): Supplier {
  return {
    supplierId: row.supplierId, tenantId: row.tenantId, companyId: row.companyId,
    name: row.name, email: row.email, phone: row.phone,
    status: row.status, version: row.version, createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(), createdBy: row.createdBy, updatedBy: row.updatedBy,
  };
}
