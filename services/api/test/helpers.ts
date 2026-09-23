import http from 'node:http';
import { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { vi } from 'vitest';

export interface TestHarness {
  readonly server: http.Server;
  readonly conn: mongoose.Connection;
  readonly mongo: MongoMemoryServer;
  readonly baseUrl: string;
  readonly stop: () => Promise<void>;
}

export interface RequestOptions {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
}

export interface ApiResponse {
  readonly status: number;
  readonly body: any;
}

export async function apiRequest(baseUrl: string, path: string, options: RequestOptions = {}): Promise<ApiResponse> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/**
 * Boots a full API (fresh module registry, in-memory Mongo) so every test
 * file starts from a clean config + empty database. Environment variables
 * must be set BEFORE src modules load, hence the dynamic imports.
 */
export async function setupApi(env: Record<string, string> = {}): Promise<TestHarness> {
  vi.resetModules();

  const merged: Record<string, string> = {
    NODE_ENV: 'test',
    PORT: '0',
    HOST: '127.0.0.1',
    JWT_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_EXPIRES_IN: '15m',
    RATE_LIMIT_MAX: '100',
    RATE_LIMIT_WINDOW_MS: '60000',
    TENANT_HEADER: 'x-tenant-id',
    SEED_DEV: 'false',
    ...env,
  };
  for (const [key, value] of Object.entries(merged)) {
    process.env[key] = value;
  }

  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  // Override any inherited Atlas/production URI: tests only use their own mongod.
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB_NAME = 'erp_test';

  const { createApp } = await import('../src/app.js');
  const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');

  const conn = await connectDatabase(uri, 'erp_test');

  const context = createApp();
  const server = context.express.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const stop = async (): Promise<void> => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDatabase();
    await mongo.stop();
  };

  return { server, conn, mongo, baseUrl, stop };
}

export interface RegisteredUser {
  readonly userId: string;
  readonly email: string;
  readonly accessToken: string;
}

export async function registerAndLogin(h: TestHarness, email: string, password = 'Passw0rd!123', tenantId = 'tenant_a'): Promise<RegisteredUser> {
  const { baseUrl } = h;
  const reg = await apiRequest(baseUrl, '/api/v1/auth/register', {
    method: 'POST',
    body: { email, password, firstName: 'Test', lastName: 'User' },
  });
  if (reg.status !== 200) {
    throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  await provisionMembership(h, reg.body.data.userId, tenantId);
  const loginRes = await apiRequest(baseUrl, '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId },
    body: { email, password },
  });
  if (loginRes.status !== 200) {
    throw new Error(`login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }
  return {
    userId: reg.body.data.userId as string,
    email,
    accessToken: loginRes.body.data.accessToken as string,
  };
}

export function authHeaders(token: string, tenantId: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  };
}
/** Explicit test onboarding; registration itself never grants tenant access. */
export async function provisionMembership(h: TestHarness, userId: string, tenantId = 'tenant_a') {
  const { getTenantModel } = await import('../src/platform/tenancy/tenant-model.js');
  const { getMembershipModel } = await import('../src/platform/iam/membership.js');
  const { getRoleModel } = await import('../src/platform/iam/role-models.js');
  await getTenantModel(h.conn).updateOne({ tenantId }, { $setOnInsert: { name: tenantId, slug: tenantId, status: 'active' } }, { upsert: true });
  await getRoleModel(h.conn).updateOne({ tenantId, name: 'ADMIN' }, { $set: { permissions: ['audit.read', 'master-data.country.read', 'master-data.country.write'] } }, { upsert: true });
  await getMembershipModel(h.conn).updateOne({ userId, tenantId }, { $set: { status: 'active', roleNames: ['ADMIN'] } }, { upsert: true });
}
