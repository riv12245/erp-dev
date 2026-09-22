import mongoose from 'mongoose';
import type { TenantId } from '../../shared/types/index.js';

export interface TenantAttributes {
  readonly tenantId: TenantId;
  readonly name: string;
  readonly slug: string;
  readonly plan: 'standard' | 'enterprise' | 'high-isolation';
  readonly status: 'active' | 'suspended' | 'provisioning';
  readonly isolationMode: 'shared' | 'dedicated-database' | 'dedicated-cluster';
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export const tenantSchema = new mongoose.Schema<TenantAttributes>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['standard', 'enterprise', 'high-isolation'], default: 'standard' },
    status: { type: String, enum: ['active', 'suspended', 'provisioning'], default: 'active' },
    isolationMode: {
      type: String,
      enum: ['shared', 'dedicated-database', 'dedicated-cluster'],
      default: 'shared',
    },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, collection: 'tenants' },
);

export interface TenantDocument extends mongoose.Document, TenantAttributes {}

export function getTenantModel(connection: mongoose.Connection): mongoose.Model<TenantDocument> {
  return (connection.models.Tenant as unknown as mongoose.Model<TenantDocument>) ?? (connection.model('Tenant', tenantSchema) as unknown as mongoose.Model<TenantDocument>);
}