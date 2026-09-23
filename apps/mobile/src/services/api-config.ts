import { createApiClient } from '@erp/api-client';

// Set from native startup before requests. Android emulator uses 10.0.2.2.
let apiBaseUrl = 'http://10.0.2.2:3000';

export function configureApi(baseUrl: string): void {
  if (!/^https?:\/\/[^\s]+$/.test(baseUrl)) throw new Error('An absolute API URL is required');
  apiBaseUrl = baseUrl.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string { return apiBaseUrl; }
export const authClient = createApiClient({ baseUrl: getApiBaseUrl, defaultTimeoutMs: 30_000, headers: { 'x-session-client': 'native' } });
