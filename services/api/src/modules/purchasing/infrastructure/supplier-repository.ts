import mongoose from 'mongoose';
import type { SupplierListQuery, CreateSupplierRequest, UpdateSupplierRequest } from '@erp/contracts/shared';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { TenantScopedRepository } from '../../../platform/tenancy/tenant-scoped-repository.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { getSupplierModel } from './supplier-model.js';

export class SupplierRepository extends TenantScopedRepository {
  private readonly suppliers;
  constructor(connection: mongoose.Connection, private readonly scope: CompanyScope) {
    const model = getSupplierModel(connection);
    super(model as unknown as mongoose.Model<unknown>, scope);
    if (!scope.companyId || !scope.userId) throw AppError.forbidden('Company scope required');
    this.suppliers = model;
  }
  private filter(extra: Record<string, unknown> = {}) {
    return this.tenantFilter({ $and: [{ companyId: this.scope.companyId }, extra] });
  }
  async get(supplierId: string, session?: mongoose.ClientSession) {
    return this.suppliers.findOne(this.filter({ supplierId })).session(session ?? null).exec();
  }
  async list(query: SupplierListQuery & { page: number; limit: number }) {
    if (!Number.isSafeInteger(query.page) || query.page < 1 || query.page > 1000000 || !Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 100) throw AppError.validation('Invalid pagination');
    const extra: Record<string, unknown> = {};
    if (query.status) extra.status = query.status;
    if (query.search) {
      const regex = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      extra.$or = [{ name: { $regex: regex, $options: 'i' } }, { email: { $regex: regex, $options: 'i' } }];
    }
    const filter = this.filter(extra);
    const [items, total] = await Promise.all([
      this.suppliers.find(filter).sort({ createdAt: -1, supplierId: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).exec(),
      this.suppliers.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
  async insert(input: CreateSupplierRequest, session: mongoose.ClientSession) {
    const rows = await this.suppliers.create([{
      ...input, tenantId: this.requireTenantId(), companyId: this.scope.companyId,
      supplierId: crypto.randomUUID(), status: 'active', version: 1,
      createdBy: this.scope.userId, updatedBy: this.scope.userId,
    }], { session });
    return rows[0]!;
  }
  async patch(supplierId: string, input: UpdateSupplierRequest, session: mongoose.ClientSession) {
    const { expectedVersion, ...updates } = input;
    return this.suppliers.findOneAndUpdate(this.filter({ supplierId, version: expectedVersion }), {
      $set: { ...updates, updatedBy: this.scope.userId }, $inc: { version: 1 },
    }, { new: true, runValidators: true, session }).exec();
  }
}
