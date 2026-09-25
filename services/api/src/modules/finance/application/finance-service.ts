import mongoose from 'mongoose';
import { createHash, randomUUID } from 'node:crypto';
import type { FinancialObligationDTO, FinancialPaymentDTO } from '@erp/contracts/finance';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { CompanyService } from '../../../platform/tenancy/company-service.js';
import { AuditService, getAuditModel } from '../../../platform/audit/index.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { CustomerService } from '../../crm/index.js';
import { SupplierService } from '../../purchasing/index.js';
import { currencyScale, identifier, object, parseCreateObligation, parseRecordPayment } from '../domain/finance-domain.js';
import { FinanceRepository, obligationModel, paymentModel, obligationDto } from '../infrastructure/finance-repository.js';

export interface ObligationDetail extends FinancialObligationDTO {
  readonly payments: readonly FinancialPaymentDTO[];
}

export class FinanceService {
  constructor(private readonly connection: mongoose.Connection) {}

  private repo(scope: CompanyScope) {
    return new FinanceRepository(this.connection, scope);
  }

  private async transaction<T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    await Promise.all([
      obligationModel(this.connection).init(),
      paymentModel(this.connection).init(),
      getAuditModel(this.connection).init(),
    ]);
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(() => work(session));
    } finally {
      await session.endSession();
    }
  }

  async createObligation(scope: CompanyScope, body: unknown, correlationId?: string): Promise<FinancialObligationDTO> {
    const input = parseCreateObligation(body);
    currencyScale(input.currency);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');

    const company = await new CompanyService(this.connection).getAuthorized(scope);
    if (input.currency !== company.defaultCurrency) {
      throw AppError.validation('Obligation currency must match company default currency');
    }

    const perform = async (session: mongoose.ClientSession) => {
      const repo = this.repo(scope);
      const previous = await repo.oneObligation({ idempotencyKey: input.idempotencyKey }, session);
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw AppError.conflict('Idempotency key reused with different obligation request');
        }
        return obligationDto(previous);
      }

      if (input.type === 'receivable') {
        await new CustomerService(this.connection).requireActiveCustomer(scope, input.partyId, session);
      } else {
        await new SupplierService(this.connection).requireActiveSupplier(scope, input.partyId, session);
      }

      const obligationId = randomUUID();
      const row = await repo.insertObligation(
        {
          obligationId,
          number: obligationId,
          type: input.type,
          partyId: input.partyId,
          referenceId: input.referenceId,
          currency: input.currency,
          amount: input.amount,
          paidAmount: 0,
          remainingAmount: input.amount,
          status: 'PENDING',
          dueDate: input.dueDate,
          description: input.description,
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
          entityType: 'FinancialObligation',
          entityId: obligationId,
          action: 'finance.obligation.created',
          correlationId,
          after: { version: 1, type: input.type, amount: input.amount, status: 'PENDING' },
        },
        session
      );

      return obligationDto(row);
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

  async recordPayment(
    scope: CompanyScope,
    obligationId: string,
    body: unknown,
    correlationId?: string
  ): Promise<ObligationDetail> {
    identifier(obligationId, 'obligationId');
    const input = parseRecordPayment(body);
    const fingerprint = createHash('sha256').update(JSON.stringify({ obligationId, ...input })).digest('hex');

    return this.transaction(async (session) => {
      const repo = this.repo(scope);
      const before = await repo.oneObligation({ obligationId }, session);
      if (!before) throw AppError.notFound('Financial obligation not found');
      if (before.status === 'PAID') throw AppError.conflict('Obligation is already fully paid');
      if (before.status === 'CANCELLED') throw AppError.conflict('Cannot record payment for cancelled obligation');

      const existingPayment = await repo.onePayment({ idempotencyKey: input.idempotencyKey }, session);
      if (existingPayment) {
        if (existingPayment.fingerprint !== fingerprint) {
          throw AppError.conflict('Idempotency key reused with different payment request');
        }
        const payments = await repo.listPaymentsForObligation(obligationId);
        return { ...obligationDto(before), payments };
      }

      if (input.amount > before.remainingAmount + 0.001) {
        throw AppError.validation(`Payment amount (${input.amount}) exceeds remaining balance (${before.remainingAmount})`);
      }

      const nextPaid = Math.round((before.paidAmount + input.amount) * 100) / 100;
      const nextRemaining = Math.round(Math.max(0, before.amount - nextPaid) * 100) / 100;
      const nextStatus = nextRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

      const paymentId = randomUUID();
      await repo.insertPayment(
        {
          paymentId,
          obligationId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          reference: input.reference,
          note: input.note,
          idempotencyKey: input.idempotencyKey,
          fingerprint,
        },
        session
      );

      const updatedRow = await repo.updateObligationBalance(
        obligationId,
        input.expectedVersion,
        nextPaid,
        nextRemaining,
        nextStatus,
        session
      );
      if (!updatedRow) throw AppError.conflict('Version conflict while recording payment');

      await new AuditService(this.connection).record(
        {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          actorId: scope.userId,
          action: 'finance.payment.recorded',
          entityType: 'FinancialPayment',
          entityId: paymentId,
          correlationId,
          before: { version: before.version, paidAmount: before.paidAmount, remainingAmount: before.remainingAmount, status: before.status },
          after: { version: updatedRow.version, paidAmount: updatedRow.paidAmount, remainingAmount: updatedRow.remainingAmount, status: updatedRow.status },
        },
        session
      );

      const payments = await repo.listPaymentsForObligation(obligationId, session);
      return { ...obligationDto(updatedRow), payments };
    });
  }

  async getObligation(scope: CompanyScope, id: string): Promise<ObligationDetail> {
    const repo = this.repo(scope);
    const row = await repo.oneObligation({ obligationId: identifier(id, 'obligationId') });
    if (!row) throw AppError.notFound('Financial obligation not found');
    const payments = await repo.listPaymentsForObligation(id);
    return { ...obligationDto(row), payments };
  }

  async listObligations(scope: CompanyScope, input: unknown) {
    const query = object(input, ['page', 'limit', 'type', 'status']);
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
    if (query.type !== undefined && !['receivable', 'payable'].includes(query.type as string)) {
      throw AppError.validation('Invalid obligation type');
    }
    if (
      query.status !== undefined &&
      !['PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'].includes(query.status as string)
    ) {
      throw AppError.validation('Invalid obligation status');
    }
    return this.repo(scope).listObligations(page, limit, query.type as string | undefined, query.status as string | undefined);
  }
}
