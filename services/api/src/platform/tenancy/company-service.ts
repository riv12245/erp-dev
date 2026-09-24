import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/app-error.js';
import type { TenantContext } from '../../shared/types/index.js';
import { getCompanyModel, getCompanyMembershipModel, type CompanyAttributes } from './company-model.js';
import { requireCompanyAccess, type CompanyScope } from './company-access.js';
import { getMembershipModel } from '../iam/membership.js';
import { getUserModel } from '../auth/user-model.js';
import { AuditService } from '../audit/audit-service.js';
import { getAuditModel } from '../audit/audit-model.js';

const fields = ['name', 'taxId', 'registrationNumber', 'defaultCurrency', 'defaultTimezone'] as const;
export type CompanyInput = Pick<CompanyAttributes, typeof fields[number]>;

export function parseCompanyInput(value: unknown): CompanyInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw AppError.validation('Company object required');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !fields.includes(key as typeof fields[number]))) throw AppError.validation('Unknown company field');
  const result: Record<string, string> = {};
  for (const key of fields) {
    const field = body[key];
    if (typeof field !== 'string' || !field.trim() || field.length > 200) throw AppError.validation(`Invalid ${key}`);
    result[key] = field.trim();
  }
  if (!/^[A-Z]{3}$/.test(result.defaultCurrency) || !Intl.supportedValuesOf('currency').includes(result.defaultCurrency)) throw AppError.validation('Currency must be a supported uppercase ISO code');
  try { new Intl.DateTimeFormat('en', { timeZone: result.defaultTimezone }); }
  catch { throw AppError.validation('Invalid timezone'); }
  return result as CompanyInput;
}

export function companyDto(company: CompanyAttributes) {
  return { id: company.id, tenantId: company.tenantId, name: company.name, taxId: company.taxId,
    registrationNumber: company.registrationNumber, defaultCurrency: company.defaultCurrency,
    defaultTimezone: company.defaultTimezone, isActive: company.isActive, version: company.version,
    createdAt: company.createdAt.toISOString(), updatedAt: company.updatedAt.toISOString() };
}

export class CompanyService {
  constructor(private readonly connection: mongoose.Connection) {}

  async getAuthorized(scope: CompanyScope) {
    await requireCompanyAccess(this.connection, scope, scope.userId, scope.companyId);
    const company = await getCompanyModel(this.connection).findOne({ tenantId: scope.tenantId, id: scope.companyId, isActive: true }).lean();
    if (!company) throw AppError.forbidden('Company access denied');
    return companyDto(company);
  }

  async list(context: TenantContext, userId: string) {
    if (!context.tenantId || !userId) throw AppError.unauthorized();
    const memberships = await getCompanyMembershipModel(this.connection).find({ tenantId: context.tenantId, userId, status: 'active' }).lean();
    const rows = await getCompanyModel(this.connection).find({ tenantId: context.tenantId, id: { $in: memberships.map(row => row.companyId) }, isActive: true }).sort({ name: 1, id: 1 }).limit(100).lean();
    return rows.map(companyDto);
  }

  async create(context: TenantContext, userId: string, input: unknown, correlationId?: string) {
    if (!context.tenantId || !userId) throw AppError.unauthorized();
    const parsed = parseCompanyInput(input);
    const Company = getCompanyModel(this.connection);
    const Access = getCompanyMembershipModel(this.connection);
    await Promise.all([Company.init(), Access.init(), getAuditModel(this.connection).init()]);
    const id = randomUUID();
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(async () => {
        const member = await getMembershipModel(this.connection).exists({ tenantId: context.tenantId, userId, status: 'active' }).session(session);
        if (!member) throw AppError.forbidden();
        const [company] = await Company.create([{ ...parsed, id, tenantId: context.tenantId, isActive: true, version: 0 }], { session });
        await Access.create([{ tenantId: context.tenantId, companyId: id, userId, status: 'active' }], { session });
        await new AuditService(this.connection).record({ tenantId: context.tenantId, companyId: id, actorId: userId,
          action: 'company.created', entityType: 'company', entityId: id, correlationId }, session);
        return companyDto(company);
      });
    } finally { await session.endSession(); }
  }

  async setMembership(context: TenantContext, actorId: string, companyId: string, targetUserId: string, input: unknown, correlationId?: string) {
    await requireCompanyAccess(this.connection, context, actorId, companyId);
    if (!/^[a-f0-9]{24}$/i.test(targetUserId)) throw AppError.validation('Invalid user identifier');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw AppError.validation('Membership object required');
    const body = input as Record<string, unknown>;
    if (Object.keys(body).length !== 1 || typeof body.status !== 'string' || !['active', 'disabled'].includes(body.status)) throw AppError.validation('Only status active/disabled is accepted');
    // Avoid accidentally locking the only company manager out. Deliberate offboarding uses another authorized actor.
    if (actorId === targetUserId && body.status === 'disabled') throw AppError.conflict('Another authorized company manager must revoke your access');
    const Access = getCompanyMembershipModel(this.connection);
    await Promise.all([Access.init(), getAuditModel(this.connection).init()]);
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const member = await getMembershipModel(this.connection).exists({ tenantId: context.tenantId, userId: targetUserId, status: 'active' }).session(session);
        const user = await getUserModel(this.connection).exists({ _id: targetUserId, status: 'active' }).session(session);
        if (!member || !user) throw AppError.notFound('Active tenant user not found');
        await Access.updateOne({ tenantId: context.tenantId, companyId, userId: targetUserId }, { $set: { status: body.status } }, { upsert: true, session });
        await new AuditService(this.connection).record({ tenantId: context.tenantId, companyId, actorId,
          action: 'company.membership.changed', entityType: 'companyMembership', entityId: targetUserId,
          after: { status: body.status }, correlationId }, session);
      });
    } finally { await session.endSession(); }
    return { companyId, userId: targetUserId, status: body.status };
  }
}
