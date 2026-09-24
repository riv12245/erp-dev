import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness } from './helpers.js';
import { TenantScopedRepository } from '../src/platform/tenancy/tenant-scoped-repository.js';
import { TenantContextMissingError } from '../src/shared/errors/tenant-error.js';

interface WidgetAttributes {
  readonly tenantId: string;
  readonly name: string;
  readonly version: number;
}

class WidgetRepository extends TenantScopedRepository {
  constructor(model: mongoose.Model<unknown>, context: { tenantId: string }) {
    super(model, { tenantId: context.tenantId, locale: 'en', timezone: 'UTC' });
  }
}

function widgetProjection(doc: unknown): WidgetAttributes {
  const { tenantId, name, version } = doc as WidgetAttributes;
  return { tenantId, name, version };
}

describe('TenantScopedRepository', () => {
  let h: TestHarness;
  let model: mongoose.Model<unknown>;

  beforeAll(async () => {
    h = await setupApi();
    model = h.conn.model(
      'WidgetScoped',
      new mongoose.Schema({
        tenantId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        version: { type: Number, default: 1 },
      }),
    ) as unknown as mongoose.Model<unknown>;
  });

  afterAll(async () => {
    await h.stop();
  });

  it('always scopes writes to the tenant', async () => {
    const repo = new WidgetRepository(model, { tenantId: 'tenant_a' });
    await repo.create({ name: 'gadget' });
    const docs = (await model.find({} as mongoose.FilterQuery<unknown>).exec()) as Array<{ tenantId: string }>;
    expect(docs).toHaveLength(1);
    expect(docs[0].tenantId).toBe('tenant_a');
  });

  it('findOne and findMany respect the tenant scope', async () => {
    const repo = new WidgetRepository(model, { tenantId: 'tenant_a' });
    await repo.create({ name: 'gadget-a' });
    const list = await repo.findMany();
    expect(list).toHaveLength(2);
    for (const doc of list as Array<{ tenantId: string }>) {
      expect(doc.tenantId).toBe('tenant_a');
    }
  });

  it('a different tenant sees nothing', async () => {
    const repoB = new WidgetRepository(model, { tenantId: 'tenant_b' });
    expect(await repoB.findMany()).toEqual([]);
    expect(await repoB.count()).toBe(0);
  });

  it('optimistic concurrency rejects stale versions', async () => {
    const repo = new WidgetRepository(model, { tenantId: 'tenant_a' });
    const doc = (await repo.create({ name: 'concurrent', version: 1 })) as { _id: string };

    const first = await repo.updateOneWithVersion(String(doc._id), 1, { name: 'v2' });
    expect(first.updated).toBe(true);

    const stale = await repo.updateOneWithVersion(String(doc._id), 1, { name: 'should-fail' });
    expect(stale.updated).toBe(false);

    const ok = await repo.updateOneWithVersion(String(doc._id), 2, { name: 'v3' });
    expect(ok.updated).toBe(true);

    const docAfter = (await repo.findOne({ _id: doc._id })) as { name: string; version: number };
    expect(docAfter.name).toBe('v3');
    expect(docAfter.version).toBe(3);
  });

  it('delete is guarded by the tenant scope', async () => {
    const repoA = new WidgetRepository(model, { tenantId: 'tenant_a' });
    const repoB = new WidgetRepository(model, { tenantId: 'tenant_b' });

    const doc = (await repoA.create({ name: 'to-delete', version: 1 })) as { _id: string };
    const deletedByB = await repoB.deleteOne(String(doc._id));
    expect(deletedByB).toBe(false);
    const deletedByA = await repoA.deleteOne(String(doc._id));
    expect(deletedByA).toBe(true);
  });

  it('fails hard when tenant context is missing', async () => {
    const repo = new WidgetRepository(model, { tenantId: '' });
    await expect(repo.findMany()).rejects.toBeInstanceOf(TenantContextMissingError);
  });

  it('cannot override tenant through caller filters or write payloads', async () => {
    const a = new WidgetRepository(model, { tenantId: 'tenant_a' });
    const b = new WidgetRepository(model, { tenantId: 'tenant_b' });
    const doc = await a.create({ name: 'injected', tenantId: 'tenant_b', version: 1 }) as { _id: string; tenantId: string };
    expect(doc.tenantId).toBe('tenant_a');
    expect(await b.findOne({ _id: doc._id, tenantId: 'tenant_a' })).toBeNull();
    expect(await b.count({ tenantId: 'tenant_a' })).toBe(0);
    await a.updateOneWithVersion(String(doc._id), 1, { tenantId: 'tenant_b', name: 'safe' });
    expect(await b.findOne({ _id: doc._id })).toBeNull();
    expect((await a.findOne({ _id: doc._id }) as { tenantId: string }).tenantId).toBe('tenant_a');
  });

  it('rejects unlimited pagination and protected update fields, and cannot modify foreign IDs', async () => {
    const a = new WidgetRepository(model, { tenantId: 'tenant_a' });
    const b = new WidgetRepository(model, { tenantId: 'tenant_b' });
    const doc = await a.create({ name: 'protected', version: 1 }) as { _id: string };
    expect((await b.updateOneWithVersion(String(doc._id), 1, { name: 'foreign' })).updated).toBe(false);
    for (const limit of [0, -1, 101, NaN, 0.5]) await expect(a.findMany({}, limit)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    for (const updates of [{ createdBy: 'forged' }, { version: 99 }, { 'tenantId.value': 'foreign' }, { $unset: { tenantId: 1 } }]) {
      await expect(a.updateOneWithVersion(String(doc._id), 1, updates)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    }
    await expect(a.updateOneWithVersion(String(doc._id), -1, { name: 'invalid' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((await a.findOne({ _id: doc._id }) as { name: string }).name).toBe('protected');
  });
});
