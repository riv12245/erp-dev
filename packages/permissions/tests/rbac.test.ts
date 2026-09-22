import { describe, expect, it } from 'vitest';
import { collectPermissions, hasPermission, RbacEngine, permissionMatches } from '../src/index.js';
import type { PermissionPrincipal } from '../src/index.js';

function principal(tenantId = 'tenant_a'): PermissionPrincipal {
  return {
    id: 'user-1',
    tenantId,
    roles: [
      { name: 'sales-manager', permissions: ['sales.order.read', 'sales.order.approve'] },
      { name: 'ops', permissions: ['inventory.*', 'sales.*'] },
    ],
  };
}

describe('RBAC primitives', () => {
  it('treats regex metacharacters as literal permission text', () => {
    expect(permissionMatches('finance.read', 'sales|finance.*')).toBe(false);
    expect(permissionMatches('sales|finance.read', 'sales|finance.*')).toBe(true);
  });
  it('collects permissions across roles without duplicates', () => {
    const p = principal();
    p.roles.push({ name: 'dup', permissions: ['sales.order.read'] });
    const collected = collectPermissions(p);
    expect(collected.filter((x) => x === 'sales.order.read')).toHaveLength(1);
    expect(collected).toContain('inventory.*');
    expect(collected).toContain('sales.*');
    expect(collected).toContain('sales.order.approve');
  });

  it('matches permissions exactly and via wildcards', () => {
    const p = principal();
    expect(hasPermission(p, 'sales.order.read')).toBe(true);
    expect(hasPermission(p, 'sales.order.approve')).toBe(true);
    expect(hasPermission(p, 'inventory.stock.reserve')).toBe(true);
    expect(hasPermission(p, 'sales.quote.create')).toBe(true);
    expect(hasPermission(p, 'finance.invoice.read')).toBe(false);
  });
});

describe('RbacEngine', () => {
  it('denies when the subject tenant differs from the principal tenant', () => {
    const engine = new RbacEngine();
    const result = engine.evaluate({
      principal: principal('tenant_a'),
      subject: { tenantId: 'tenant_b' },
      permission: 'sales.order.read',
    });
    expect(result).toEqual({ allowed: false, reason: 'TENANT_MISMATCH' });
  });

  it('denies when the permission is not granted', () => {
    const engine = new RbacEngine();
    const result = engine.evaluate({
      principal: principal(),
      subject: { tenantId: 'tenant_a' },
      permission: 'finance.invoice.pay',
    });
    expect(result).toEqual({ allowed: false, reason: 'PERMISSION_NOT_GRANTED' });
  });

  it('allows a granted permission without policies', () => {
    const engine = new RbacEngine();
    const result = engine.evaluate({
      principal: principal(),
      subject: { tenantId: 'tenant_a' },
      permission: 'inventory.stock.adjust',
    });
    expect(result.allowed).toBe(true);
  });

  it('runs matching policies and lets them deny', () => {
    const engine = new RbacEngine([
      {
        name: 'approval-limit',
        targetPermission: 'sales.order.approve',
        evaluate: () => ({ allowed: false, reason: 'ABOVE_APPROVAL_LIMIT' }),
      },
    ]);
    const result = engine.evaluate({
      principal: principal(),
      subject: { tenantId: 'tenant_a' },
      permission: 'sales.order.approve',
      resourceData: { total: 10_000 },
    });
    expect(result).toEqual({ allowed: false, reason: 'ABOVE_APPROVAL_LIMIT' });
  });
});
