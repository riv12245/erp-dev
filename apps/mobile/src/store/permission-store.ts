import { create } from 'zustand';
import { PermissionPrincipal, Role, PermissionName } from '@erp/permissions';

interface PermissionState {
  readonly principal: PermissionPrincipal | null;
  readonly setPermissions: (permissions: readonly PermissionName[], roles?: readonly Role[]) => void;
  readonly clear: () => void;
}

export const usePermissionStore = create<PermissionState>((set) => ({
  principal: null,
  setPermissions: (permissions, roles = [{ name: 'anonymous', permissions, isSystem: true }]) =>
    set({
      principal: {
        id: 'current',
        tenantId: '',
        roles,
      },
    }),
  clear: () => set({ principal: null }),
}));