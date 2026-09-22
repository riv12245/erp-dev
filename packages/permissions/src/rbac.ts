import { PermissionName, PermissionPrincipal, SubjectContext } from './types.js';

export interface PermissionEvaluation {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface PermissionPolicy {
  readonly name: string;
  readonly targetPermission: PermissionName;
  readonly evaluate: (context: PermissionContext) => PermissionEvaluation;
}

export interface PermissionContext {
  readonly principal: PermissionPrincipal;
  readonly subject: SubjectContext;
  readonly permission: PermissionName;
  readonly resourceData?: Record<string, unknown>;
}

/** Expands `sales.*`-style wildcards into a match. */
function wildcardToPattern(permission: string): string {
  return permission.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
}

function permissionMatches(candidate: PermissionName, pattern: PermissionName): boolean {
  if (candidate === pattern) return true;
  if (pattern.includes('*')) {
    const regex = new RegExp(`^${wildcardToPattern(pattern)}$`);
    return regex.test(candidate);
  }
  return false;
}

/** Collects the effective permission names for a principal. */
export function collectPermissions(principal: PermissionPrincipal): PermissionName[] {
  const result: PermissionName[] = [];
  for (const role of principal.roles) {
    for (const permission of role.permissions) {
      if (!result.some((existing) => existing === permission)) result.push(permission);
    }
  }
  return result;
}

/** Returns true when the principal holds the permission (respecting wildcards). */
export function hasPermission(principal: PermissionPrincipal, permission: PermissionName): boolean {
  const granted = collectPermissions(principal);
  return granted.some((candidate) => permissionMatches(permission, candidate));
}

/** RBAC evaluator that combines RBAC permissions plus optional policies. */
export class RbacEngine {
  constructor(private readonly policies: readonly PermissionPolicy[] = []) {}

  evaluate(context: PermissionContext): PermissionEvaluation {
    if (context.principal.tenantId !== context.subject.tenantId) {
      return { allowed: false, reason: 'TENANT_MISMATCH' };
    }
    if (!hasPermission(context.principal, context.permission)) {
      return { allowed: false, reason: 'PERMISSION_NOT_GRANTED' };
    }
    for (const policy of this.policies) {
      if (policy.targetPermission === context.permission || policyMatchesTarget(policy.targetPermission, context.permission)) {
        const evaluation = policy.evaluate(context);
        if (!evaluation.allowed) return evaluation;
      }
    }
    return { allowed: true };
  }
}

function policyMatchesTarget(policyTarget: PermissionName, requested: PermissionName): boolean {
  if (policyTarget === requested) return true;
  if (policyTarget.includes('*')) {
    const regex = new RegExp(`^${wildcardToPattern(policyTarget)}$`);
    return regex.test(requested);
  }
  return false;
}

export { permissionMatches };

export type { SubjectContext } from './types.js';
