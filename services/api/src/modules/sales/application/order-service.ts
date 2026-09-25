import mongoose from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import type { DraftSalesOrderDTO, DraftSalesOrderDetail, DraftSalesOrderAvailability } from '@erp/contracts/sales';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { CompanyService } from '../../../platform/tenancy/company-service.js';
import { AuditService, getAuditModel } from '../../../platform/audit/index.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { CustomerService } from '../../crm/index.js';
import { InventoryService } from '../../inventory/index.js';
import { currencyScale, expectedVersion, identifier, lineMinor, minorNumber, object, parseDraft } from '../domain/order.js';
import { OrderRepository, orderModel, orderDto } from '../infrastructure/order-repository.js';

export class SalesOrderService {
  constructor(private readonly connection: mongoose.Connection) {}
  private repo(scope: CompanyScope) { return new OrderRepository(this.connection, scope); }
  private async transaction<T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    await Promise.all([orderModel(this.connection).init(), getAuditModel(this.connection).init(), new InventoryService(this.connection).initialize()]);
    const session = await this.connection.startSession();
    try { return await session.withTransaction(() => work(session)); } finally { await session.endSession(); }
  }
  async create(scope: CompanyScope, body: unknown, correlationId?: string): Promise<DraftSalesOrderDTO> {
    const input = parseDraft(body);
    const priceScale = currencyScale(input.currency);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const company = await new CompanyService(this.connection).getAuthorized(scope);
    if (input.currency !== company.defaultCurrency) throw AppError.validation('Draft currency must match company currency');
    const perform = async (session: mongoose.ClientSession) => {
      const repo = this.repo(scope);
      const previous = await repo.one({ idempotencyKey: input.idempotencyKey }, session);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw AppError.conflict('Idempotency key reused with different draft');
        return orderDto(previous);
      }
      await new CustomerService(this.connection).requireActiveCustomer(scope, input.customerId, session);
      const inventory = new InventoryService(this.connection);
      const lines = [];
      let subtotalMinor = 0n;
      for (const line of input.lines) {
        const product = await inventory.requireActiveProduct(scope, line.itemId, session);
        await inventory.getAvailability(scope, line.itemId, input.warehouseId, session);
        const amount = lineMinor(line.quantity, line.unitPrice, priceScale);
        subtotalMinor += amount;
        lines.push({ ...line, lineId: randomUUID(), description: product.name, subtotal: minorNumber(amount, priceScale) });
      }
      const orderId = randomUUID();
      const row = await repo.insert({ orderId, number: orderId, customerId: input.customerId, warehouseId: input.warehouseId,
        currency: input.currency, lines, status: 'DRAFT', subtotal: minorNumber(subtotalMinor, priceScale), total: null, taxAmount: null,
        pricingStatus: 'tax-policy-required', version: 1, idempotencyKey: input.idempotencyKey, fingerprint }, session);
      await new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId, actorId: scope.userId,
        entityType: 'SalesOrder', entityId: orderId, action: 'sales.order.created', correlationId,
        after: { version: 1, status: 'DRAFT', lineCount: lines.length } }, session);
      return orderDto(row);
    };
    try { return await this.transaction(perform); }
    catch (error) { if ((error as { code?: number }).code === 11000) return this.transaction(perform); throw error; }
  }
  async get(scope: CompanyScope, id: string): Promise<DraftSalesOrderDetail> {
    const row = await this.repo(scope).one({ orderId: identifier(id) });
    if (!row) throw AppError.notFound('Sales order not found');
    const inventory = new InventoryService(this.connection);
    const availability = await Promise.all([...new Set(row.lines.map(line => line.itemId))].map(async (itemId): Promise<DraftSalesOrderAvailability> => {
      try { return { itemId, availability: await inventory.getAvailability(scope, itemId, row.warehouseId), availabilityStatus: 'available' }; }
      catch (error) {
        if (error instanceof AppError && [404, 409].includes(error.statusCode)) return { itemId, availability: null, availabilityStatus: 'reference-inactive-or-missing' };
        throw error;
      }
    }));
    return { ...orderDto(row), availability };
  }
  async list(scope: CompanyScope, input: unknown) {
    const query = object(input, ['page', 'limit', 'status', 'customerId']);
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if ((query.page !== undefined && typeof query.page !== 'string') || (query.limit !== undefined && typeof query.limit !== 'string') || !Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw AppError.validation('Invalid pagination');
    if (query.status !== undefined && query.status !== 'DRAFT' && query.status !== 'CONFIRMED' && query.status !== 'CANCELLED') throw AppError.validation('Invalid order status');
    return this.repo(scope).list(page, limit, query.status as string | undefined, query.customerId === undefined ? undefined : identifier(query.customerId));
  }
  async confirm(scope: CompanyScope, id: string, body: unknown, correlationId?: string): Promise<DraftSalesOrderDTO> {
    identifier(id); const version = expectedVersion(body);
    return this.transaction(async session => {
      const repo = this.repo(scope); const before = await repo.one({ orderId: id }, session);
      if (!before) throw AppError.notFound('Sales order not found');
      if (before.status !== 'DRAFT') throw AppError.conflict('Only a current draft can be confirmed');
      const inventory = new InventoryService(this.connection);
      for (const line of before.lines) {
        await inventory.recordMovement(scope, {
          productId: line.itemId, warehouseId: before.warehouseId, type: 'outbound',
          quantity: line.quantity, reason: `Sales order confirmation ${before.number}`,
          idempotencyKey: `sales_confirm_${id}_${line.itemId}_${line.lineId}`, referenceId: id,
        }, correlationId, session);
      }
      const row = await repo.confirm(id, version, session);
      if (!row) throw AppError.conflict('Version conflict while confirming order');
      await new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId, actorId: scope.userId,
        action: 'sales.order.confirmed', entityType: 'SalesOrder', entityId: id, correlationId,
        before: { version: before.version, status: before.status }, after: { version: row.version, status: row.status } }, session);
      return orderDto(row);
    });
  }
  async cancel(scope: CompanyScope, id: string, body: unknown, correlationId?: string): Promise<DraftSalesOrderDTO> {
    identifier(id); const version = expectedVersion(body);
    return this.transaction(async session => {
      const repo = this.repo(scope); const before = await repo.one({ orderId: id }, session);
      if (!before) throw AppError.notFound('Sales order not found');
      const row = await repo.cancel(id, version, session);
      if (!row) throw AppError.conflict('Only a current draft can be cancelled');
      await new AuditService(this.connection).record({ tenantId: scope.tenantId, companyId: scope.companyId, actorId: scope.userId,
        action: 'sales.order.cancelled', entityType: 'SalesOrder', entityId: id, correlationId,
        before: { version: before.version, status: before.status }, after: { version: row.version, status: row.status } }, session);
      return orderDto(row);
    });
  }
}
