import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApi, TestHarness } from './helpers.js';
import { AuditService } from '../src/platform/audit/audit-service.js';
import { getAuditModel } from '../src/platform/audit/audit-model.js';

describe('audit service (append-only)', () => {
  let h: TestHarness;
  let service: AuditService;

  beforeAll(async () => {
    h = await setupApi();
    service = new AuditService(h.conn);
  });

  afterAll(async () => {
    await h.stop();
  });

  it('records an entry scoped to its tenant', async () => {
    await service.record({
      tenantId: 'tenant_a',
      actorId: 'user_1',
      action: 'invoice.created',
      entityType: 'invoice',
      entityId: 'inv_1',
      after: { total: 100 },
    });
    const entries = await service.list('tenant_a', {});
    expect(entries).toHaveLength(1);
    const entry = entries[0] as Record<string, unknown>;
    expect(entry.tenantId).toBe('tenant_a');
    expect(entry.entityId).toBe('inv_1');
    expect(entry.auditId).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
  });

  it('does not leak entries across tenants', async () => {
    await service.record({ tenantId: 'tenant_a', action: 'order.shipped', entityType: 'order', entityId: 'order_9' });
    const tenantA = await service.list('tenant_a', {});
    const tenantB = await service.list('tenant_b', {});
    expect(tenantA).toHaveLength(2);
    expect(tenantB).toHaveLength(0);
  });

  it('is append-only: no update/delete surface on the audit service', async () => {
    const proto = Object.getPrototypeOf(service) as Record<string, unknown>;
    expect(proto.update).toBeUndefined();
    expect(proto.delete).toBeUndefined();
    expect(proto.replace).toBeUndefined();
  });

  it('filters by entityType and actor, respecting tenant scope', async () => {
    await service.record({
      tenantId: 'tenant_a',
      actorId: 'user_2',
      action: 'report.generated',
      entityType: 'report',
    });
    const filtered = await service.list('tenant_a', { entityType: 'report', actorId: 'user_2' });
    expect(filtered).toHaveLength(1);
    const filteredWrongActor = await service.list('tenant_a', { entityType: 'report', actorId: 'ghost' });
    expect(filteredWrongActor).toHaveLength(0);
  });

  it('duplicate auditId is rejected (uniqueness enforced)', async () => {
    const Audit = getAuditModel(h.conn);
    const sharedId = 'duplicate-audit-id';
    await Audit.create({ auditId: sharedId, tenantId: 'tenant_a', action: 'x', entityType: 'x', timestamp: new Date() });
    await expect(
      Audit.create({ auditId: sharedId, tenantId: 'tenant_a', action: 'y', entityType: 'y', timestamp: new Date() }),
    ).rejects.toThrow();
  });
});