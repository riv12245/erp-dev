import mongoose from 'mongoose';
import type { Customer } from '@erp/contracts/shared';

export interface CustomerAttributes extends Omit<Customer, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}
const schema = new mongoose.Schema<CustomerAttributes>({
  customerId: { type: String, required: true },
  tenantId: { type: String, required: true },
  companyId: { type: String, required: true },
  type: { type: String, enum: ['company', 'individual'], required: true },
  name: { type: String, required: true, maxlength: 200 },
  email: { type: String, maxlength: 254 },
  phone: { type: String, maxlength: 50 },
  taxId: { type: String, maxlength: 100 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], required: true },
  version: { type: Number, required: true },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true },
}, { timestamps: true, versionKey: false, collection: 'crm_customers', strict: 'throw' });
schema.index({ tenantId: 1, companyId: 1, customerId: 1 }, { unique: true });
schema.index({ tenantId: 1, companyId: 1, createdAt: -1, customerId: 1 });
export function getCustomerModel(connection: mongoose.Connection): mongoose.Model<CustomerAttributes> {
  return (connection.models.CrmCustomer as mongoose.Model<CustomerAttributes> | undefined)
    ?? connection.model<CustomerAttributes>('CrmCustomer', schema);
}
export function customerDto(row: CustomerAttributes): Customer {
  return {
    customerId: row.customerId, tenantId: row.tenantId, companyId: row.companyId,
    type: row.type, name: row.name, email: row.email, phone: row.phone, taxId: row.taxId,
    status: row.status, version: row.version, createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(), createdBy: row.createdBy, updatedBy: row.updatedBy,
  };
}
