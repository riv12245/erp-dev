import { RbacEngine, PermissionName, SubjectContext } from '@erp/permissions';
import { usePermissionStore } from '../store/permission-store';

const engine = new RbacEngine([]);

export function usePermissions() {
  const principal = usePermissionStore((state) => state.principal);

  const hasPermission = (permission: PermissionName, subject?: SubjectContext): boolean => {
    if (!principal) return false;
    return engine.evaluate({
      principal,
      subject: subject ?? { tenantId: principal.tenantId },
      permission,
    }).allowed;
  };

  const hasAnyPermission = (permissions: readonly PermissionName[], subject?: SubjectContext): boolean =>
    permissions.some((permission) => hasPermission(permission, subject));

  const hasAllPermissions = (permissions: readonly PermissionName[], subject?: SubjectContext): boolean =>
    permissions.every((permission) => hasPermission(permission, subject));

  return { principal, hasPermission, hasAnyPermission, hasAllPermissions };
}