import { create } from 'zustand';
import { PermissionPrincipal, Role, PermissionName } from '@erp/permissions';

interface PermissionState {
  readonly principal: PermissionPrincipal | null;
  readonly setPermissions: (permissions: readonly PermissionName[], roles?: readonly Role[]) => void;
  readonly clear: () => void;
}

function buildPrincipal(permissions: readonly PermissionName[], roles: readonly Role[]): PermissionPrincipal {
  return {
    id: 'current',
    tenantId: '',
    roles: roles.length > 0 ? roles : [{ name: 'any', permissions, isSystem: true }],
  };
}

export const usePermissionStore = create<PermissionState>((set) => ({
  principal: null,
  setPermissions: (permissions, roles = [{ name: 'anonymous', permissions, isSystem: true }]) =>
    set({ principal: buildPrincipal(permissions, roles) }),
  clear: () => set({ principal: null }),
}));