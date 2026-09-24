import { create } from 'zustand';
import type { PermissionPrincipal, Role, PermissionName } from '@erp/permissions';
interface PermissionState {
  readonly principal: PermissionPrincipal | null;
  readonly setPermissions: (permissions: readonly PermissionName[], roles?: readonly Role[]) => void;
  readonly setIdentity: (identity: { requesterId: string; tenantId: string; permissions: readonly string[] }) => void;
  readonly clear: () => void;
}
export const usePermissionStore = create<PermissionState>((set) => ({
  principal: null,
  setPermissions: (permissions, roles = [{ name: 'effective', permissions, isSystem: true }]) => set({ principal: { id: 'current', tenantId: '', roles } }),
  setIdentity: ({ requesterId, tenantId, permissions }) => set({ principal: { id: requesterId, tenantId, roles: [{ name: 'effective', permissions, isSystem: true }] } }),
  clear: () => set({ principal: null }),
}));
