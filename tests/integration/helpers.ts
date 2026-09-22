import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

export async function getTestMongoUri(): Promise<string> {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  return mongoServer.getUri();
}

export async function connectTestDatabase(): Promise<void> {
  const uri = await getTestMongoUri();
  await mongoose.connect(uri);
}

export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined as unknown as MongoMemoryServer;
  }
}

export function createIntegrationContext(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: overrides.tenantId ?? 'integration-tenant',
    organizationId: overrides.organizationId ?? 'integration-org',
    userId: overrides.userId ?? 'integration-user',
    roles: overrides.roles ?? ['admin', 'user'],
    permissions: overrides.permissions ?? ['read', 'write', 'delete'],
    locale: overrides.locale ?? 'en-US',
    timezone: overrides.timezone ?? 'UTC',
    ...overrides,
  };
}

export function createIntegrationUser(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? 'int-user-001',
    tenantId: overrides.tenantId ?? 'integration-tenant',
    email: overrides.email ?? 'int-user@integration.com',
    role: overrides.role ?? 'admin',
    ...overrides,
  };
}
