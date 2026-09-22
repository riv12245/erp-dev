/// <reference types="vite/client" />
import { createApiClient } from '@erp/api-client';
import { useAuthStore } from '../store/auth-store';
import { useTenantStore } from '../store/tenant-store';

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function resolveTenantId(): string | undefined {
  return useTenantStore.getState().tenant?.id ?? useTenantStore.getState().tenantId ?? undefined;
}

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  defaultTimeoutMs: 30_000,
  getAccessToken: () => useAuthStore.getState().accessToken,
  tenantId: resolveTenantId(),
  onRefresh: async () => null,
});

export { API_BASE_URL };