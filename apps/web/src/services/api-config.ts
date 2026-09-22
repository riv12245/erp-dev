/// <reference types="vite/client" />
import { createApiClient } from '@erp/api-client';

export const API_BASE_URL: string = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
export const authClient = createApiClient({ baseUrl: API_BASE_URL, defaultTimeoutMs: 30_000 });
