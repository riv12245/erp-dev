import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { ConfigService } from '../../services/api/src/config/index.js';

export let mongoUri: string;

export async function connectMongo(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  mongoUri = mongod.getUri();
  await mongoose.connect(mongoUri);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export function createTenantContext(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: overrides.tenantId ?? 'tenant-a',
    organizationId: overrides.organizationId ?? 'org-a',
    userId: overrides.userId ?? 'user-a',
    roles: overrides.roles ?? ['admin'],
    permissions: overrides.permissions ?? ['read', 'write'],
    locale: overrides.locale ?? 'en-US',
    timezone: overrides.timezone ?? 'UTC',
    ...overrides,
  };
}

export function createDifferentTenantContext(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: overrides.tenantId ?? 'tenant-b',
    organizationId: overrides.organizationId ?? 'org-b',
    userId: overrides.userId ?? 'user-b',
    roles: overrides.roles ?? ['user'],
    permissions: overrides.permissions ?? ['read'],
    locale: overrides.locale ?? 'en-US',
    timezone: overrides.timezone ?? 'UTC',
    ...overrides,
  };
}

export function createMockRequestContext(overrides: Record<string, unknown> = {}) {
  return {
    requestId: overrides.requestId ?? 'req-001',
    correlationId: overrides.correlationId ?? 'corr-001',
    tenantId: overrides.tenantId ?? 'tenant-a',
    userId: overrides.userId ?? 'user-a',
    startedAt: Date.now(),
    traceId: overrides.traceId ?? 'trace-001',
    ...overrides,
  };
}
