import { RbacEngine, PermissionPrincipal, PermissionName } from '@erp/permissions';

const engine = new RbacEngine([]);

/** Convenience sync checker for visual permission gating (backend remains the authority). */
export class PermissionChecker {
  static can(principal: PermissionPrincipal | null, permission: PermissionName): boolean {
    if (!principal) return false;
    return engine.evaluate({ principal, subject: { tenantId: principal.tenantId }, permission }).allowed;
  }
}