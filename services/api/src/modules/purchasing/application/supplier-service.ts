import mongoose from 'mongoose';
import type { Supplier, SupplierListQuery, SupplierListResult } from '@erp/contracts/shared';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { AuditService, getAuditModel } from '../../../platform/audit/index.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { supplierDto, getSupplierModel } from '../infrastructure/supplier-model.js';
import { supplierId, supplierInput } from '../domain/supplier-domain.js';
import { SupplierRepository } from '../infrastructure/supplier-repository.js';

export class SupplierService {
  constructor(private readonly connection: mongoose.Connection) {}
  async get(scope: CompanyScope, id: string, session?: mongoose.ClientSession): Promise<Supplier> {
    const row = await new SupplierRepository(this.connection, scope).get(supplierId(id), session);
    if (!row) throw AppError.notFound('Supplier not found');
    return supplierDto(row);
  }
  async requireActiveSupplier(scope: CompanyScope, id: string, session?: mongoose.ClientSession): Promise<Supplier> {
    const supplier = await this.get(scope, id, session);
    if (supplier.status !== 'active') throw AppError.conflict('Supplier is not active');
    return supplier;
  }
  async list(scope: CompanyScope, query: SupplierListQuery & { page: number; limit: number }): Promise<SupplierListResult> {
    const { items, total } = await new SupplierRepository(this.connection, scope).list(query);
    return { items: items.map(supplierDto), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }
  private async transaction<T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    await Promise.all([getSupplierModel(this.connection).init(), getAuditModel(this.connection).init()]);
    const session = await this.connection.startSession();
    try { return await session.withTransaction(() => work(session)); }
    finally { await session.endSession(); }
  }
  async create(scope: CompanyScope, body: unknown, correlationId?: string): Promise<Supplier> {
    const input = supplierInput(body);
    return this.transaction(async session => {
      const after = supplierDto(await new SupplierRepository(this.connection, scope).insert(input, session));
      await new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId,
        actorId: scope.userId, correlationId, action: 'purchasing.supplier.created', entityType: 'Supplier', entityId: after.supplierId,
        after: { version: after.version, status: after.status, fields: Object.keys(input) } }, session);
      return after;
    });
  }
  async update(scope: CompanyScope, id: string, body: unknown, correlationId?: string): Promise<Supplier> {
    supplierId(id);
    const input = supplierInput(body, true);
    return this.transaction(async session => {
      const before = await this.get(scope, id, session);
      const row = await new SupplierRepository(this.connection, scope).patch(id, input, session);
      if (!row) throw AppError.conflict('Supplier version is stale');
      const after = supplierDto(row);
      await new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId,
        actorId: scope.userId, correlationId, action: 'purchasing.supplier.updated', entityType: 'Supplier', entityId: id,
        before: { version: before.version, status: before.status },
        after: { version: after.version, status: after.status, fields: Object.keys(input).filter(key => key !== 'expectedVersion') } }, session);
      return after;
    });
  }
}
