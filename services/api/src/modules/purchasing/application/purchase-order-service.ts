import mongoose from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import type { PurchaseOrderDTO } from '@erp/contracts/shared';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { CompanyService } from '../../../platform/tenancy/company-service.js';
import { AuditService, getAuditModel } from '../../../platform/audit/index.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { SupplierService } from '../application/supplier-service.js';
import { InventoryService } from '../../inventory/index.js';
import { currencyScale, expectedVersion, identifier, lineMinor, minorNumber, object, parsePurchaseOrder } from '../domain/purchase-order-domain.js';
import { PurchaseOrderRepository, purchaseOrderModel, purchaseOrderDto } from '../infrastructure/purchase-order-repository.js';

export class PurchaseOrderService {
  constructor(private readonly connection: mongoose.Connection) {}

  private repo(scope: CompanyScope) {
    return new PurchaseOrderRepository(this.connection, scope);
  }

  private async transaction<T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    await Promise.all([
      purchaseOrderModel(this.connection).init(),
      getAuditModel(this.connection).init(),
      new InventoryService(this.connection).initialize(),
    ]);
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(() => work(session));
    } finally {
      await session.endSession();
    }
  }

  async create(scope: CompanyScope, body: unknown, correlationId?: string): Promise<PurchaseOrderDTO> {
    const input = parsePurchaseOrder(body);
    const priceScale = currencyScale(input.currency);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');

    const company = await new CompanyService(this.connection).getAuthorized(scope);
    if (input.currency !== company.defaultCurrency) {
      throw AppError.validation('Purchase order currency must match company currency');
    }

    const perform = async (session: mongoose.ClientSession) => {
      const repo = this.repo(scope);
      const previous = await repo.one({ idempotencyKey: input.idempotencyKey }, session);
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw AppError.conflict('Idempotency key reused with different purchase order');
        }
        return purchaseOrderDto(previous);
      }

      await new SupplierService(this.connection).requireActiveSupplier(scope, input.supplierId, session);

      const inventory = new InventoryService(this.connection);
      const lines = [];
      let subtotalMinor = 0n;

      for (const line of input.lines) {
        const product = await inventory.requireActiveProduct(scope, line.itemId, session);
        await inventory.getAvailability(scope, line.itemId, input.warehouseId, session);
        const amount = lineMinor(line.quantity, line.unitPrice, priceScale);
        subtotalMinor += amount;
        lines.push({
          ...line,
          lineId: randomUUID(),
          description: product.name,
          subtotal: minorNumber(amount, priceScale),
        });
      }

      const orderId = randomUUID();
      const row = await repo.insert(
        {
          orderId,
          number: orderId,
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          currency: input.currency,
          lines,
          status: 'ORDERED',
          subtotal: minorNumber(subtotalMinor, priceScale),
          version: 1,
          idempotencyKey: input.idempotencyKey,
          fingerprint,
        },
        session
      );

      await new AuditService(this.connection).record(
        {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          actorId: scope.userId,
          entityType: 'PurchaseOrder',
          entityId: orderId,
          action: 'purchasing.order.created',
          correlationId,
          after: { version: 1, status: 'ORDERED', lineCount: lines.length },
        },
        session
      );

      return purchaseOrderDto(row);
    };

    try {
      return await this.transaction(perform);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return this.transaction(perform);
      }
      throw error;
    }
  }

  async get(scope: CompanyScope, id: string): Promise<PurchaseOrderDTO> {
    const row = await this.repo(scope).one({ orderId: identifier(id) });
    if (!row) throw AppError.notFound('Purchase order not found');
    return purchaseOrderDto(row);
  }

  async list(scope: CompanyScope, input: unknown) {
    const query = object(input, ['page', 'limit', 'status', 'supplierId']);
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (
      (query.page !== undefined && typeof query.page !== 'string') ||
      (query.limit !== undefined && typeof query.limit !== 'string') ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1000000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw AppError.validation('Invalid pagination');
    }
    if (
      query.status !== undefined &&
      !['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].includes(query.status as string)
    ) {
      throw AppError.validation('Invalid order status');
    }
    return this.repo(scope).list(
      page,
      limit,
      query.status as string | undefined,
      query.supplierId === undefined ? undefined : identifier(query.supplierId)
    );
  }

  async receiveGoods(scope: CompanyScope, id: string, body: unknown, correlationId?: string): Promise<PurchaseOrderDTO> {
    identifier(id);
    const version = expectedVersion(body);

    return this.transaction(async (session) => {
      const repo = this.repo(scope);
      const before = await repo.one({ orderId: id }, session);
      if (!before) throw AppError.notFound('Purchase order not found');
      if (before.status === 'RECEIVED') throw AppError.conflict('Purchase order has already been received');
      if (before.status === 'CANCELLED') throw AppError.conflict('Cancelled purchase order cannot receive goods');

      const inventory = new InventoryService(this.connection);
      for (const line of before.lines) {
        await inventory.recordMovement(
          scope,
          {
            productId: line.itemId,
            warehouseId: before.warehouseId,
            type: 'inbound',
            quantity: line.quantity,
            reason: `Goods receipt for PO ${before.number}`,
            idempotencyKey: `po_receipt_${id}_${line.itemId}_${line.lineId}`,
            referenceId: id,
          },
          correlationId,
          session
        );
      }

      const row = await repo.updateStatus(id, version, before.status, 'RECEIVED', session);
      if (!row) throw AppError.conflict('Version conflict while receiving goods');

      await new AuditService(this.connection).record(
        {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          actorId: scope.userId,
          action: 'purchasing.goods_receipt.created',
          entityType: 'PurchaseOrder',
          entityId: id,
          correlationId,
          before: { version: before.version, status: before.status },
          after: { version: row.version, status: row.status },
        },
        session
      );

      return purchaseOrderDto(row);
    });
  }

  async cancel(scope: CompanyScope, id: string, body: unknown, correlationId?: string): Promise<PurchaseOrderDTO> {
    identifier(id);
    const version = expectedVersion(body);

    return this.transaction(async (session) => {
      const repo = this.repo(scope);
      const before = await repo.one({ orderId: id }, session);
      if (!before) throw AppError.notFound('Purchase order not found');
      if (before.status === 'RECEIVED') throw AppError.conflict('Received purchase order cannot be cancelled');

      const row = await repo.updateStatus(id, version, before.status, 'CANCELLED', session);
      if (!row) throw AppError.conflict('Version conflict while cancelling purchase order');

      await new AuditService(this.connection).record(
        {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          actorId: scope.userId,
          action: 'purchasing.order.cancelled',
          entityType: 'PurchaseOrder',
          entityId: id,
          correlationId,
          before: { version: before.version, status: before.status },
          after: { version: row.version, status: row.status },
        },
        session
      );

      return purchaseOrderDto(row);
    });
  }
}
