import { PermissionEvaluation, PermissionPolicy } from './rbac.js';

/**
 * Policy engine. A policy is an object restriction expressed over resource data:
 *
 *   permission = purchase.approve
 *   AND branchId belongs to user's branches
 *   AND purchase.total <= user.approvalLimit
 */

export interface PolicyCondition {
  readonly field: string;
  readonly operator: 'eq' | 'neq' | 'in' | 'nin' | 'lt' | 'lte' | 'gt' | 'gte';
  readonly value: unknown;
}

export interface PolicyRule {
  readonly id: string;
  readonly permission: string;
  readonly conditions: readonly PolicyCondition[];
  readonly allowOnMatch?: boolean;
}

export interface PolicyContext<T = Record<string, unknown>> {
  readonly permission: string;
  readonly data: T;
  readonly principalId: string;
  readonly tenantId: string;
}

function getField(data: Record<string, unknown>, field: string): unknown {
  const parts = field.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateOperator(operator: PolicyCondition['operator'], actual: unknown, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'nin':
      return !(Array.isArray(expected) && expected.includes(actual));
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    default:
      return false;
  }
}

export function evaluateCondition(condition: PolicyCondition, data: Record<string, unknown>): boolean {
  return evaluateOperator(condition.operator, getField(data, condition.field), condition.value);
}

export function evaluatePolicy<T extends Record<string, unknown>>(rule: PolicyRule, context: PolicyContext<T>): PermissionEvaluation {
  const matches = rule.conditions.every((condition) => evaluateCondition(condition, context.data as unknown as Record<string, unknown>));
  const defaultDeny = rule.allowOnMatch ?? true;
  return { allowed: matches ? defaultDeny : !defaultDeny };
}

/** Adapts PolicyRule objects into PermissionPolicy objects for the RBAC engine. */
export function policyRuleToPermissionPolicy(rules: readonly PolicyRule[]): readonly PermissionPolicy[] {
  return rules.map((rule) => ({
    name: rule.id,
    targetPermission: rule.permission,
    evaluate: (context) => {
      const policyContext: PolicyContext = {
        permission: context.permission,
        data: (context.resourceData ?? {}) as Record<string, unknown>,
        principalId: context.principal.id,
        tenantId: context.principal.tenantId,
      };
      return evaluatePolicy(rule, policyContext);
    },
  }));
}

export type { PermissionEvaluation, PermissionContext } from './rbac.js';