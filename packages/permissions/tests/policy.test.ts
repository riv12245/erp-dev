import { describe, expect, it } from 'vitest';
import { evaluateCondition, evaluatePolicy, policyRuleToPermissionPolicy, RbacEngine } from '../src/index.js';
import type { PermissionPrincipal } from '../src/index.js';

describe('policy conditions', () => {
  it('supports dotted fields and comparison operators', () => {
    const data = { order: { total: 7_500, status: 'pending', branches: ['b1', 'b2'] } };
    expect(evaluateCondition({ field: 'order.total', operator: 'gte', value: 5_000 }, data)).toBe(true);
    expect(evaluateCondition({ field: 'order.total', operator: 'gte', value: 10_000 }, data)).toBe(false);
    expect(evaluateCondition({ field: 'order.status', operator: 'eq', value: 'pending' }, data)).toBe(true);
    expect(evaluateCondition({ field: 'order.status', operator: 'neq', value: 'cancelled' }, data)).toBe(true);
    expect(evaluateCondition({ field: 'order.branches', operator: 'in', value: ['b2', 'b9'] }, data)).toBe(false);
    expect(evaluateCondition({ field: 'order.branches', operator: 'contains-placeholder', value: [] }, data)).toBe(false);
  });

  it('returns false for a missing dotted field', () => {
    expect(evaluateCondition({ field: 'customer.department', operator: 'eq', value: 'sales' }, {})).toBe(false);
  });
});

const principal: PermissionPrincipal = {
  id: 'user-1',
  tenantId: 'tenant_a',
  roles: [{ name: 'buyer', permissions: ['purchase.approve'] }],
};

describe('policy rules', () => {
  it('allows when a condition matches and defaults to deny otherwise', () => {
    const rule = {
      id: 'p1',
      permission: 'purchase.approve',
      conditions: [
        { field: 'order.total', operator: 'lte', value: 5_000 },
        { field: 'order.branch', operator: 'eq', value: 'b1' },
      ],
    };
    const ok = evaluatePolicy(rule, { permission: 'purchase.approve', data: { order: { total: 3_000, branch: 'b1' } }, principalId: 'u', tenantId: 'tenant_a' });
    expect(ok.allowed).toBe(true);
    const over = evaluatePolicy(rule, { permission: 'purchase.approve', data: { order: { total: 9_000, branch: 'b1' } }, principalId: 'u', tenantId: 'tenant_a' });
    expect(over.allowed).toBe(false);
  });

  it('denial rules (allowOnMatch: false) block on a match', () => {
    const rule = {
      id: 'p2',
      permission: 'purchase.approve',
      allowOnMatch: false,
      conditions: [{ field: 'supplier.blocked', operator: 'eq', value: true }],
    };
    const blocked = evaluatePolicy(rule, { permission: 'purchase.approve', data: { supplier: { blocked: true } }, principalId: 'u', tenantId: 'tenant_a' });
    expect(blocked.allowed).toBe(false);
  });
});

describe('policy integration with the RBAC engine', () => {
  it('applies an approval-limit policy end-to-end', () => {
    const rules = [
      {
        id: 'approval-limit',
        permission: 'purchase.approve',
        conditions: [{ field: 'order.total', operator: 'lte', value: 5_000 }],
      },
    ];
    const engine = new RbacEngine(policyRuleToPermissionPolicy(rules));

    const within = engine.evaluate({
      principal,
      subject: { tenantId: 'tenant_a' },
      permission: 'purchase.approve',
      resourceData: { order: { total: 2_000 } },
    });
    expect(within.allowed).toBe(true);

    const beyond = engine.evaluate({
      principal,
      subject: { tenantId: 'tenant_a' },
      permission: 'purchase.approve',
      resourceData: { order: { total: 8_000 } },
    });
    expect(beyond.allowed).toBe(false);
  });

  it('ignores policies that do not target the requested permission', () => {
    const engine = new RbacEngine([
      {
        name: 'unrelated',
        targetPermission: 'hr.approve',
        evaluate: () => ({ allowed: false }),
      },
    ]);
    const result = engine.evaluate({
      principal,
      subject: { tenantId: 'tenant_a' },
      permission: 'purchase.approve',
    });
    expect(result.allowed).toBe(true);
  });
});