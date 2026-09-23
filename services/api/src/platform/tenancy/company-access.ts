import type mongoose from 'mongoose';
import type { TenantContext } from '../../shared/types/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { getCompanyModel, getCompanyMembershipModel } from './company-model.js';
import { getMembershipModel } from '../iam/membership.js';

export interface CompanyScope extends TenantContext { readonly companyId: string; readonly userId: string }

export async function requireCompanyAccess(
  connection: mongoose.Connection, context: TenantContext, userId: string, companyId: string,
): Promise<CompanyScope> {
  if (!context?.tenantId || !userId) throw AppError.unauthorized();
  if (typeof companyId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId)) throw AppError.validation('Invalid company identifier');
  if (context.companyId && context.companyId !== companyId) throw AppError.forbidden('Company context mismatch');
  if (context.branchId) throw AppError.validation('Branch scope is not supported for this operation');
  const [company, access, membership] = await Promise.all([
    getCompanyModel(connection).exists({ tenantId: context.tenantId, id: companyId, isActive: true }),
    getCompanyMembershipModel(connection).exists({ tenantId: context.tenantId, companyId, userId, status: 'active' }),
    getMembershipModel(connection).exists({ tenantId: context.tenantId, userId, status: 'active' }),
  ]);
  if (!company || !access || !membership) throw AppError.forbidden('Company access denied');
  return { ...context, companyId, userId };
}
