import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness, apiRequest, registerAndLogin, authHeaders } from './helpers.js';
import { getTenantModel } from '../src/platform/tenancy/tenant-model.js';

describe('tenancy', () => {
  let h: TestHarness;

  beforeAll(async () => {
    h = await setupApi();
    const Tenant = getTenantModel(h.conn);
    await Tenant.create({
      tenantId: 'tenant_a',
      name: 'Acme Inc',
      slug: 'acme',
      plan: 'standard',
      status: 'active',
      isolationMode: 'shared',
    });
  });

  afterAll(async () => {
    await h.stop();
  });

  it('rejects protected routes without a tenant header (401)', async () => {
    const user = await registerAndLogin(h, 'tenantless@example.com');
    const res = await apiRequest(h.baseUrl, '/api/v1/tenants/context', {
      headers: { authorization: `Bearer ${user.accessToken}` },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TENANT_CONTEXT_MISSING');
  });

  it('rejects protected routes without a token (401)', async () => {
    const res = await apiRequest(h.baseUrl, '/api/v1/tenants/context', {
      headers: { 'x-tenant-id': 'tenant_a' },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('echoes the tenant context from headers', async () => {
    const user = await registerAndLogin(h, 'withtenant@example.com');
    const res = await apiRequest(h.baseUrl, '/api/v1/tenants/context', {
      headers: {
        authorization: `Bearer ${user.accessToken}`,
        'x-tenant-id': 'tenant_a',
        'x-company-id': 'company_1',
        'x-branch-id': 'branch_2',
        'x-timezone': 'America/Mexico_City',
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.tenantId).toBe('tenant_a');
    expect(res.body.data.companyId).toBe('company_1');
    expect(res.body.data.branchId).toBe('branch_2');
    expect(res.body.data.timezone).toBe('America/Mexico_City');
  });

  it('returns a public tenancy profile for active tenants', async () => {
    const user = await registerAndLogin(h, 'profile@example.com');
    const res = await apiRequest(h.baseUrl, `/api/v1/tenants/tenant_a`, { headers: authHeaders(user.accessToken, 'tenant_a') });
    expect(res.status).toBe(200);
    expect(res.body.data.tenantId).toBe('tenant_a');
    expect(res.body.data.name).toBe('Acme Inc');
    expect(res.body.data.plan).toBe('standard');
  });

  it('rejects requests outside the current tenant', async () => {
    const user = await registerAndLogin(h, 'unknown@example.com');
    const res = await apiRequest(h.baseUrl, `/api/v1/tenants/does_not_exist`, { headers: authHeaders(user.accessToken, 'tenant_a') });
    expect(res.status).toBe(403);
  });
});

describe('tenant-scoped repository isolation', () => {
  let h: TestHarness;
  let Widget: mongoose.Model<Record<string, unknown>>;

  class WidgetRepository {
    constructor(private readonly model: mongoose.Model<unknown>, private readonly tenantId: string) {}

    async create(name: string): Promise<unknown> {
      return this.model.create({ tenantId: this.tenantId, name, version: 1 });
    }

    async findOne(id: string): Promise<unknown | null> {
      return this.model.findOne({ tenantId: this.tenantId, _id: id } as mongoose.FilterQuery<unknown>);
    }

    async listAll(): Promise<unknown[]> {
      return this.model.find({ tenantId: this.tenantId } as mongoose.FilterQuery<unknown>).exec();
    }

    async count(): Promise<number> {
      return this.model.countDocuments({ tenantId: this.tenantId } as mongoose.FilterQuery<unknown>);
    }
  }

  beforeAll(async () => {
    h = await setupApi();
    Widget = h.conn.model(
      'Widget',
      new mongoose.Schema({
        tenantId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        version: { type: Number, default: 1 },
      }),
    ) as unknown as mongoose.Model<Record<string, unknown>>;
  });

  afterAll(async () => {
    await h.stop();
  });

  it('tenant A never sees tenant B data', async () => {
    const repoA = new WidgetRepository(Widget, 'tenant_a');
    const repoB = new WidgetRepository(Widget, 'tenant_b');

    const created = (await repoA.create('alpha')) as { _id: unknown };
    await repoB.create('bravo');

    expect(await repoA.listAll()).toHaveLength(1);
    expect(await repoB.listAll()).toHaveLength(1);

    const crossRead = await repoB.findOne(String(created._id));
    expect(crossRead).toBeNull();
  });

  it('counts are scoped per tenant', async () => {
    const repoA = new WidgetRepository(Widget, 'tenant_a');
    const repoB = new WidgetRepository(Widget, 'tenant_b');
    await repoA.create('alpha2');
    expect(await repoA.count()).toBe(2);
    expect(await repoB.count()).toBe(1);
  });
});