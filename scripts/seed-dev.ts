#!/usr/bin/env node
import mongoose from 'mongoose';
import { hashPassword, serializeHash } from '@erp/auth';
import { getTenantModel } from '../services/api/src/platform/tenancy/tenant-model.js';
import { getUserModel } from '../services/api/src/platform/auth/user-model.js';
import { getMembershipModel } from '../services/api/src/platform/iam/membership.js';
import { getRoleModel, getPermissionModel } from '../services/api/src/platform/iam/role-models.js';
import { BUSINESS_PERMISSIONS } from '../services/api/src/platform/iam/business-permissions.js';

// Development only. Reset affects demo-owned identities and grants, never whole collections.
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/erp_dev';
const DB_NAME = process.env.MONGODB_DB_NAME ?? 'erp_dev';
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Demo123!';
const RESET = process.argv.includes('--reset');

const tenants = [
  { tenantId: 'tenant-acme', slug: 'acme', name: 'Acme Corporation', plan: 'enterprise', isolationMode: 'shared' },
  { tenantId: 'tenant-global', slug: 'global', name: 'Global Industries', plan: 'standard', isolationMode: 'shared' },
  { tenantId: 'tenant-labs', slug: 'labs', name: 'Startup Labs', plan: 'standard', isolationMode: 'shared' },
];

const users = [
  { email: 'admin@acme.io', firstName: 'Ada', lastName: 'Lovelace', tenantId: 'tenant-acme', role: 'ADMIN' },
  { email: 'sales@acme.io', firstName: 'Grace', lastName: 'Hopper', tenantId: 'tenant-acme', role: 'SALES' },
  { email: 'admin@global.io', firstName: 'Linus', lastName: 'Torvalds', tenantId: 'tenant-global', role: 'ADMIN' },
  { email: 'admin@labs.io', firstName: 'Edsger', lastName: 'Dijkstra', tenantId: 'tenant-labs', role: 'ADMIN' },
];


async function main() {
  if (!['development', 'test'].includes(process.env.NODE_ENV ?? 'development') || !/^erp_(dev|test)(_|$)/.test(DB_NAME)) {
    throw new Error('Seed requires development/test environment and an erp_dev or erp_test database');
  }
  if (RESET && process.env.SEED_DEV !== 'true') throw new Error('Reset requires SEED_DEV=true');
  console.log('MongoDB configured: ' + Boolean(MONGODB_URI) + ' | database: ' + DB_NAME);
  const connection = await mongoose.createConnection(MONGODB_URI, { dbName: DB_NAME }).asPromise();
  try {
    const Tenant = getTenantModel(connection);
    const User = getUserModel(connection);
    const Membership = getMembershipModel(connection);
    const Role = getRoleModel(connection);
    const Permission = getPermissionModel(connection);
    await Promise.all([Tenant.init(), User.init(), Membership.init(), Role.init(), Permission.init()]);
    const demoEmails = users.map(user => user.email);
    const demoTenants = tenants.map(tenant => tenant.tenantId);
    if (RESET) {
      const demoUsers = await User.find({ email: { $in: demoEmails } }).exec();
      await Membership.deleteMany({ userId: { $in: demoUsers.map(user => user._id.toString()) }, tenantId: { $in: demoTenants } });
      // Keep stable user IDs so unrelated memberships and historical audit references survive.
      await User.updateMany({ email: { $in: demoEmails } }, { $set: { status: 'active', failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 } });
    }
    const adminPermissions = ['audit.read', 'master-data.country.read', 'master-data.country.write', ...BUSINESS_PERMISSIONS];
    for (const name of adminPermissions) {
      await Permission.updateOne({ name }, { $set: { module: name.split('.')[0] } }, { upsert: true });
    }
    for (const tenant of tenants) {
      await Tenant.updateOne({ tenantId: tenant.tenantId }, { $set: { ...tenant, status: 'active' } }, { upsert: true });
      for (const name of ['ADMIN', 'SALES']) {
        await Role.updateOne({ tenantId: tenant.tenantId, name }, { $set: { isSystem: false, permissions: name === 'ADMIN' ? adminPermissions : ['master-data.country.read'] } }, { upsert: true });
      }
    }
    const passwordHash = serializeHash(await hashPassword(DEMO_PASSWORD));
    for (const { tenantId, role, ...user } of users) {
      const account = await User.findOneAndUpdate({ email: user.email }, { $set: { ...user, passwordHash, status: 'active', failedLoginAttempts: 0 }, $unset: { lockedUntil: 1 } }, { upsert: true, new: true });
      await Membership.updateOne({ userId: account!._id.toString(), tenantId }, { $set: { roleNames: [role], status: 'active' } }, { upsert: true });
    }
    console.log(`[seed] tenants: 3, users: 4, roles: 6, permissions: ${adminPermissions.length}, memberships: 4`);
  } finally { await connection.close(); }
}

main().catch(() => {
  // Driver errors may contain connection strings; never print raw errors here.
  console.error('[seed] failed; verify development guards, database connectivity and unique indexes');
  process.exitCode = 1;
});
