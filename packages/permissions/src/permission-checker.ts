import { PermissionName, PermissionPrincipal } from './types.js';
import { RbacEngine, PermissionContext, PermissionEvaluation } from './rbac.js';
import { SubjectContext } from './types.js';

/**
 * Convenience permission checker used by the frontend for VISUAL gating only.
 * The backend is always the authority for security decisions.
 */
export class PermissionChecker {
  constructor(private readonly engine: RbacEngine) {}

  can(principal: PermissionPrincipal, permission: PermissionName, subject?: SubjectContext, resourceData?: Record<string, unknown>): PermissionEvaluation {
    const context: PermissionContext = {
      principal,
      subject: subject ?? { tenantId: principal.tenantId },
      permission,
      resourceData,
    };
    return this.engine.evaluate(context);
  }

  canSync(principal: PermissionPrincipal, permission: PermissionName): boolean {
    const context: PermissionContext = {
      principal,
      subject: { tenantId: principal.tenantId },
      permission,
    };
    const evaluation = this.engine.evaluate(context);
    return evaluation.allowed;
  }
}

export type { PermissionPrincipal, PermissionName, SubjectContext } from './types.js';
export { RbacEngine, hasPermission, collectPermissions } from './rbac.js';
export { policyRuleToPermissionPolicy, evaluatePolicy } from './policy.js';