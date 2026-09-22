import mongoose from 'mongoose';
import { AppError } from '../../shared/errors/app-error.js';
import { getTenantModel } from '../tenancy/tenant-model.js';
import { getRoleModel } from './role-models.js';

export interface MembershipAttributes {
  readonly userId: string;
  readonly tenantId: string;
  readonly roleNames: readonly string[];
  readonly status: 'active' | 'disabled';
}

export const membershipSchema = new mongoose.Schema<MembershipAttributes>(
  {
    userId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    roleNames: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  },
  { timestamps: true, collection: 'memberships' },
);

membershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

export interface MembershipDocument extends mongoose.Document, MembershipAttributes {}

export function getMembershipModel(connection: mongoose.Connection): mongoose.Model<MembershipDocument> {
  return (
    (connection.models.Membership as unknown as mongoose.Model<MembershipDocument>) ??
    (connection.model('Membership', membershipSchema) as unknown as mongoose.Model<MembershipDocument>)
  );
}

/** Single authoritative membership/role resolution for login and requests. */
export async function resolveMembership(connection: mongoose.Connection, userId: string, tenantId: string) {
  if (!tenantId || !userId) throw AppError.forbidden('Tenant access denied');
  const tenant = await getTenantModel(connection).findOne({ tenantId, status: 'active' }).exec();
  const membership = await getMembershipModel(connection).findOne({ userId, tenantId, status: 'active' }).exec();
  if (!tenant || !membership) throw AppError.forbidden('Tenant access denied');
  const roles = await getRoleModel(connection).find({
    name: { $in: membership.roleNames },
    $or: [{ tenantId }, { tenantId: null, isSystem: true }],
  }).exec();
  // Tenant-specific definitions override a system role of the same name.
  const effective = membership.roleNames.flatMap(name => {
    const role = roles.find(r => r.name === name && r.tenantId === tenantId)
      ?? roles.find(r => r.name === name && !r.tenantId && r.isSystem);
    return role ? [role] : [];
  });
  return { roles: [...new Set(effective.map(role => role.name))], permissions: [...new Set(effective.flatMap(role => [...role.permissions]))] };
}

export async function resolvePermissions(connection: mongoose.Connection, userId: string, tenantId: string): Promise<readonly string[]> {
  return (await resolveMembership(connection, userId, tenantId)).permissions;
}
