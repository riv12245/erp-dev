import { create } from 'zustand';
import { authClient } from '../services/api-config';
import { useTenantStore } from './tenant-store';
import { usePermissionStore } from './permission-store';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

interface AuthState {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
  readonly tenantId: string | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly login: (email: string, password: string, tenantId: string) => Promise<boolean>;
  readonly logout: () => void;
}

interface LoginResult {
  readonly accessToken: string;
  readonly user: { readonly userId: string; readonly email: string };
}

// Invalidate in-flight logins on logout or a newer login attempt.
let generation = 0;
const emptySession = { user: null, accessToken: null, tenantId: null, isAuthenticated: false, isLoading: false, error: null };
function clearContext(): void {
  useTenantStore.getState().clearTenant();
  usePermissionStore.getState().clear();
}

export const useAuthStore = create<AuthState>((set) => ({
  ...emptySession,
  login: async (email, password, tenantId) => {
    const current = ++generation;
    clearContext();
    set({ ...emptySession, isLoading: true });
    try {
      const tenant = tenantId.trim();
      if (!tenant) throw new Error('Tenant is required');
      const payload = await authClient.post<LoginResult>('/api/v1/auth/login', { email, password }, {
        headers: { 'x-tenant-id': tenant },
      });
      if (current !== generation) return false;
      if (!payload?.accessToken || !payload.user?.userId || !payload.user?.email) throw new Error('Invalid login response');
      useTenantStore.getState().setTenantId(tenant);
      set({
        accessToken: payload.accessToken, tenantId: tenant, isAuthenticated: true, isLoading: false,
        user: { id: payload.user.userId, email: payload.user.email, name: payload.user.email },
      });
      return true;
    } catch (error) {
      if (current === generation) set({ ...emptySession, error: error instanceof Error ? error.message : 'Login failed' });
      return false;
    }
  },
  logout: () => {
    generation++;
    clearContext();
    set(emptySession);
  },
}));
