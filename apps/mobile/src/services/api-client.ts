import { useAuthStore } from '../store/auth-store';
import { getApiBaseUrl } from './api-config';
import { createApiClient } from '@erp/api-client';

export const apiClient = createApiClient({
  baseUrl: getApiBaseUrl,
  defaultTimeoutMs: 30_000,
  getTenantId: () => useAuthStore.getState().tenantId,
  getAccessToken: () => useAuthStore.getState().accessToken,
  onRefresh: () => useAuthStore.getState().refresh(),
  getSessionEpoch: () => useAuthStore.getState().sessionEpoch(),
});

export function useApi() {
  const get = <T>(path: string) => apiClient.get<T>(path);
  const post = <T>(path: string, body?: unknown) => apiClient.post<T>(path, body);
  const put = <T>(path: string, body?: unknown) => apiClient.put<T>(path, body);
  const del = <T>(path: string) => apiClient.del<T>(path);

  return { get, post, put, deleteResource: del };
}
