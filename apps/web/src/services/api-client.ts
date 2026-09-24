/// <reference types="vite/client" />
import { createApiClient } from '@erp/api-client';
import { useAuthStore } from '../store/auth-store';

import { API_BASE_URL } from './api-config';

function resolveTenantId(): string | undefined {
  return useAuthStore.getState().tenantId ?? undefined;
}

export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  defaultTimeoutMs: 30_000,
  getAccessToken: () => useAuthStore.getState().accessToken,
  onRefresh: () => useAuthStore.getState().refresh(),
  getSessionEpoch: () => useAuthStore.getState().sessionEpoch(),
  getTenantId: resolveTenantId,
});

export { API_BASE_URL };
