import { RbacEngine, PermissionPrincipal, PermissionName } from '@erp/permissions';
import { usePermissionStore } from '../store/permission-store';

const engine = new RbacEngine([]);

export class PermissionChecker {
  private constructor() {}

  static can(principal: PermissionPrincipal | null, permission: PermissionName): boolean {
    if (!principal) return false;
    return engine.evaluate({ principal, subject: { tenantId: principal.tenantId }, permission }).allowed;
  }
}

export { usePermissionStore };