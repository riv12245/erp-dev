import mongoose from 'mongoose';

export interface CompanyAttributes {
  id: string;
  tenantId: string;
  name: string;
  taxId: string;
  registrationNumber: string;
  defaultCurrency: string;
  defaultTimezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const companySchema = new mongoose.Schema<CompanyAttributes>({
  id: { type: String, required: true }, tenantId: { type: String, required: true },
  name: { type: String, required: true }, taxId: { type: String, required: true },
  registrationNumber: { type: String, required: true }, defaultCurrency: { type: String, required: true },
  defaultTimezone: { type: String, required: true }, isActive: { type: Boolean, default: true },
  version: { type: Number, default: 0 },
}, { collection: 'companies', timestamps: true, versionKey: false });
companySchema.index({ tenantId: 1, id: 1 }, { unique: true });

export interface CompanyMembershipAttributes {
  tenantId: string;
  companyId: string;
  userId: string;
  status: 'active' | 'disabled';
}
const accessSchema = new mongoose.Schema<CompanyMembershipAttributes>({
  tenantId: { type: String, required: true }, companyId: { type: String, required: true },
  userId: { type: String, required: true }, status: { type: String, enum: ['active', 'disabled'], required: true },
}, { collection: 'company_memberships', timestamps: true });
accessSchema.index({ tenantId: 1, companyId: 1, userId: 1 }, { unique: true });
accessSchema.index({ tenantId: 1, userId: 1, status: 1 });

export function getCompanyModel(connection: mongoose.Connection): mongoose.Model<CompanyAttributes> {
  return (connection.models.Company as mongoose.Model<CompanyAttributes> | undefined)
    ?? connection.model<CompanyAttributes>('Company', companySchema);
}
export function getCompanyMembershipModel(connection: mongoose.Connection): mongoose.Model<CompanyMembershipAttributes> {
  return (connection.models.CompanyMembership as mongoose.Model<CompanyMembershipAttributes> | undefined)
    ?? connection.model<CompanyMembershipAttributes>('CompanyMembership', accessSchema);
}
