import mongoose from 'mongoose';
import type { Customer, CustomerListQuery, CustomerListResult } from '@erp/contracts/shared';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { AuditService, getAuditModel } from '../../../platform/audit/index.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { customerDto, getCustomerModel } from '../infrastructure/customer-model.js';
import { customerId, customerInput } from '../domain/customer-domain.js';
import { CustomerRepository } from '../infrastructure/customer-repository.js';

export class CustomerService {
  constructor(private readonly connection: mongoose.Connection) {}
  async get(scope: CompanyScope, id: string, session?: mongoose.ClientSession): Promise<Customer> {
    const row = await new CustomerRepository(this.connection, scope).get(customerId(id), session);
    if (!row) throw AppError.notFound('Customer not found');
    return customerDto(row);
  }
  async requireActiveCustomer(scope: CompanyScope, id: string, session?: mongoose.ClientSession): Promise<Customer> {
    const customer = await this.get(scope, id, session);
    if (customer.status !== 'active') throw AppError.conflict('Customer is not active');
    return customer;
  }
  async list(scope: CompanyScope, query: CustomerListQuery & { page: number; limit: number }): Promise<CustomerListResult> {
    const { items, total } = await new CustomerRepository(this.connection, scope).list(query);
    return { items: items.map(customerDto), total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
  }
  private async transaction<T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    await Promise.all([getCustomerModel(this.connection).init(), getAuditModel(this.connection).init()]);
    const session = await this.connection.startSession();
    try { return await session.withTransaction(() => work(session)); }
    finally { await session.endSession(); }
  }
  async create(scope: CompanyScope, body: unknown, correlationId?: string): Promise<Customer> {
    const input = customerInput(body);
    return this.transaction(async session => {
      const after = customerDto(await new CustomerRepository(this.connection, scope).insert(input, session));
      await new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId,
        actorId: scope.userId, correlationId, action: 'crm.customer.created', entityType: 'Customer', entityId: after.customerId,
        after: { version: after.version, status: after.status, fields: Object.keys(input) } }, session);
      return after;
    });
  }
  async update(scope: CompanyScope, id: string, body: unknown, correlationId?: string): Promise<Customer> {
    customerId(id);
    const input = customerInput(body, true);
    return this.transaction(async session => {
      const before = await this.get(scope, id, session);
      const row = await new CustomerRepository(this.connection, scope).patch(id, input, session);
      if (!row) throw AppError.conflict('Customer version is stale');
      const after = customerDto(row);
      await new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId,
        actorId: scope.userId, correlationId, action: 'crm.customer.updated', entityType: 'Customer', entityId: id,
        before: { version: before.version, status: before.status },
        after: { version: after.version, status: after.status, fields: Object.keys(input).filter(key => key !== 'expectedVersion') } }, session);
      return after;
    });
  }
}
