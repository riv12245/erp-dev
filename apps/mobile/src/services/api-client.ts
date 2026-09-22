import { useAuthStore } from '../store/auth-store';
import { useTenantStore } from '../store/tenant-store';
import { createApiClient } from '@erp/api-client';

export const apiClient = createApiClient({
  baseUrl: 'http://localhost:3000',
  defaultTimeoutMs: 30_000,
  tenantId: useTenantStore.getState().tenantId ?? undefined,
  getAccessToken: () => useAuthStore.getState().accessToken,
  onRefresh: async () => null,
});

export function useApi() {
  const get = <T>(path: string) => apiClient.get<T>(path);
  const post = <T>(path: string, body?: unknown) => apiClient.post<T>(path, body);
  const put = <T>(path: string, body?: unknown) => apiClient.put<T>(path, body);
  const del = <T>(path: string) => apiClient.del<T>(path);

  return { get, post, put, deleteResource: del };
}