import { create } from 'zustand';
import { createSessionController } from '@erp/api-client';
import { authClient } from '../services/api-config';
import { sessionStorage } from '../services/session-storage';
import { useTenantStore } from './tenant-store';
import { usePermissionStore } from './permission-store';

export interface AuthUser { readonly id: string; readonly email: string; readonly name: string; }
interface AuthState {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
  readonly tenantId: string | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly login: (email: string, password: string, tenantId: string) => Promise<boolean>;
  readonly logout: () => Promise<void>;
  readonly logoutAll: () => Promise<void>;
  readonly restore: () => Promise<string | null>;
  readonly refresh: () => Promise<string | null>;
  readonly sessionEpoch: () => number;
}
const emptySession = { user: null, accessToken: null, tenantId: null, isAuthenticated: false, isLoading: false, error: null };
export const useAuthStore = create<AuthState>((set, get) => {
  const controller = createSessionController({
    client: authClient, native: true, storage: sessionStorage,
    changed: (session, isLoading, error) => {
      const previous = get();
      if (!session || previous.tenantId !== session.tenantId || previous.user?.id !== session.user.userId) usePermissionStore.getState().clear();
      if (session) useTenantStore.getState().setTenantId(session.tenantId);
      else useTenantStore.getState().clearTenant();
      set({ ...emptySession, isLoading, error, ...(session ? {
        user: { id: session.user.userId, email: session.user.email, name: session.user.email },
        accessToken: session.accessToken, tenantId: session.tenantId, isAuthenticated: true,
      } : {}) });
    },
  });
  return { ...emptySession, login: controller.login, logout: () => controller.logout(),
    logoutAll: () => controller.logout(true), restore: controller.restore,
    refresh: controller.refresh, sessionEpoch: controller.epoch };
});
