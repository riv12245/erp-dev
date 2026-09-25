import mongoose from 'mongoose';
import type { FinancialObligationDTO, FinancialPaymentDTO } from '@erp/contracts/finance';
import type { CompanyScope } from '../../../platform/tenancy/company-access.js';
import { TenantScopedRepository } from '../../../platform/tenancy/tenant-scoped-repository.js';
import { AppError } from '../../../shared/errors/app-error.js';

export interface ObligationRow extends Omit<FinancialObligationDTO, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey: string;
  fingerprint: string;
}

export interface PaymentRow extends Omit<FinancialPaymentDTO, 'createdAt'> {
  createdAt: Date;
  idempotencyKey: string;
  fingerprint: string;
}

const obligationSchema = new mongoose.Schema<ObligationRow>(
  {
    obligationId: { type: String, required: true },
    number: { type: String, required: true },
    tenantId: { type: String, required: true },
    companyId: { type: String, required: true },
    type: { type: String, enum: ['receivable', 'payable'], required: true },
    partyId: { type: String, required: true },
    referenceId: { type: String, required: true },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, required: true, default: 0 },
    remainingAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
      required: true,
      default: 'PENDING',
    },
    dueDate: { type: String },
    description: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
  },
  { collection: 'financial_obligations', timestamps: true, versionKey: false, strict: 'throw' }
);

obligationSchema.index({ tenantId: 1, companyId: 1, obligationId: 1 }, { unique: true });
obligationSchema.index({ tenantId: 1, companyId: 1, idempotencyKey: 1 }, { unique: true });
obligationSchema.index({ tenantId: 1, companyId: 1, createdAt: -1, obligationId: 1 });

const paymentSchema = new mongoose.Schema<PaymentRow>(
  {
    paymentId: { type: String, required: true },
    obligationId: { type: String, required: true },
    tenantId: { type: String, required: true },
    companyId: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    reference: { type: String, required: true },
    note: { type: String },
    createdBy: { type: String, required: true },
    idempotencyKey: { type: String, required: true },
    fingerprint: { type: String, required: true },
  },
  { collection: 'financial_payments', timestamps: { createdAt: true, updatedAt: false }, versionKey: false, strict: 'throw' }
);

paymentSchema.index({ tenantId: 1, companyId: 1, paymentId: 1 }, { unique: true });
paymentSchema.index({ tenantId: 1, companyId: 1, idempotencyKey: 1 }, { unique: true });
paymentSchema.index({ tenantId: 1, companyId: 1, obligationId: 1, createdAt: -1 });

export function obligationModel(connection: mongoose.Connection): mongoose.Model<ObligationRow> {
  return (connection.models.FinancialObligation as mongoose.Model<ObligationRow>) ??
    connection.model<ObligationRow>('FinancialObligation', obligationSchema);
}

export function paymentModel(connection: mongoose.Connection): mongoose.Model<PaymentRow> {
  return (connection.models.FinancialPayment as mongoose.Model<PaymentRow>) ??
    connection.model<PaymentRow>('FinancialPayment', paymentSchema);
}

export function obligationDto(row: ObligationRow): FinancialObligationDTO {
  return {
    obligationId: row.obligationId,
    number: row.number,
    tenantId: row.tenantId,
    companyId: row.companyId,
    type: row.type,
    partyId: row.partyId,
    referenceId: row.referenceId,
    currency: row.currency,
    amount: row.amount,
    paidAmount: row.paidAmount,
    remainingAmount: row.remainingAmount,
    status: row.status,
    dueDate: row.dueDate,
    description: row.description,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

export function paymentDto(row: PaymentRow): FinancialPaymentDTO {
  return {
    paymentId: row.paymentId,
    obligationId: row.obligationId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    amount: row.amount,
    paymentMethod: row.paymentMethod,
    reference: row.reference,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
  };
}

export class FinanceRepository extends TenantScopedRepository {
  private readonly obligations;
  private readonly payments;

  constructor(connection: mongoose.Connection, private readonly scope: CompanyScope) {
    const model = obligationModel(connection);
    super(model as unknown as mongoose.Model<unknown>, scope);
    this.obligations = model;
    this.payments = paymentModel(connection);
    if (!scope.companyId || !scope.userId) throw AppError.forbidden('Company scope required');
  }

  private filter(extra: Record<string, unknown>) {
    return this.tenantFilter({ $and: [{ companyId: this.scope.companyId }, extra] });
  }

  oneObligation(extra: Record<string, unknown>, session?: mongoose.ClientSession) {
    return this.obligations.findOne(this.filter(extra)).session(session ?? null).exec();
  }

  onePayment(extra: Record<string, unknown>, session?: mongoose.ClientSession) {
    return this.payments.findOne(this.filter(extra)).session(session ?? null).exec();
  }

  async insertObligation(
    data: Omit<ObligationRow, 'createdAt' | 'updatedAt' | 'tenantId' | 'companyId' | 'createdBy' | 'updatedBy'>,
    session: mongoose.ClientSession
  ) {
    const rows = await this.obligations.create(
      [
        {
          ...data,
          tenantId: this.requireTenantId(),
          companyId: this.scope.companyId,
          createdBy: this.scope.userId,
          updatedBy: this.scope.userId,
        },
      ],
      { session }
    );
    return rows[0]!;
  }

  async insertPayment(
    data: Omit<PaymentRow, 'createdAt' | 'tenantId' | 'companyId' | 'createdBy'>,
    session: mongoose.ClientSession
  ) {
    const rows = await this.payments.create(
      [
        {
          ...data,
          tenantId: this.requireTenantId(),
          companyId: this.scope.companyId,
          createdBy: this.scope.userId,
        },
      ],
      { session }
    );
    return rows[0]!;
  }

  updateObligationBalance(
    obligationId: string,
    version: number,
    paidAmount: number,
    remainingAmount: number,
    status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED',
    session: mongoose.ClientSession
  ) {
    return this.obligations
      .findOneAndUpdate(
        this.filter({ obligationId, version }),
        {
          $set: {
            paidAmount,
            remainingAmount,
            status,
            updatedBy: this.scope.userId,
          },
          $inc: { version: 1 },
        },
        { new: true, session }
      )
      .exec();
  }

  async listObligations(page: number, limit: number, type?: string, status?: string) {
    const filter = this.filter({
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    });
    const [items, total] = await Promise.all([
      this.obligations.find(filter).sort({ createdAt: -1, obligationId: 1 }).skip((page - 1) * limit).limit(limit),
      this.obligations.countDocuments(filter),
    ]);
    return { items: items.map(obligationDto), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listPaymentsForObligation(obligationId: string, session?: mongoose.ClientSession) {
    const items = await this.payments.find(this.filter({ obligationId })).session(session ?? null).sort({ createdAt: -1 }).exec();
    return items.map(paymentDto);
  }
}
