import { useAuthStore } from '../store/auth-store';
import { apiClient } from '../services/api-client';

export function useApi() {
  const accessToken = useAuthStore((state) => state.accessToken);

  const get = <T>(path: string) => apiClient.get<T>(path);
  const post = <T>(path: string, body?: unknown) => apiClient.post<T>(path, body);
  const put = <T>(path: string, body?: unknown) => apiClient.put<T>(path, body);
  const del = <T>(path: string) => apiClient.del<T>(path);

  return { accessToken, get, post, put, deleteResource: del };
}