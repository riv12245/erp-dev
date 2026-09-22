import { create } from 'zustand';

export interface AuthUser {
  readonly id?: string;
  readonly email?: string;
  readonly name?: string;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  tenantId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string, tenantId: string) => {
    set({ isLoading: true, error: null, user: null, accessToken: null, tenantId: null, isAuthenticated: false });
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId.trim() },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Login failed');
      const payload = (await response.json()) as { data: { accessToken: string; user: { userId: string; email: string } } };
      set({ accessToken: payload.data.accessToken, tenantId: tenantId.trim(), user: { id: payload.data.user.userId, email: payload.data.user.email }, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Login failed', isLoading: false });
      return false;
    }
  },

  logout: () => set({ user: null, accessToken: null, tenantId: null, isAuthenticated: false, error: null }),
}));