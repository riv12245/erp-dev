import { buildErrorFromResponse, createCorrelationId, isAbortError, normalizeError, NetworkError, TimeoutError } from './errors.js';
import { ApiClientConfig, ApiRequest, ApiResponse, ApiSuccessResponse, isApiErrorResponse } from './types.js';

export interface ApiClient {
  readonly request: <T>(request: ApiRequest) => Promise<T>;
  readonly get: <T>(path: string, options?: Omit<ApiRequest, 'method' | 'path'>) => Promise<T>;
  readonly post: <T>(path: string, body?: unknown, options?: Omit<ApiRequest, 'method' | 'path' | 'body'>) => Promise<T>;
  readonly put: <T>(path: string, body?: unknown, options?: Omit<ApiRequest, 'method' | 'path' | 'body'>) => Promise<T>;
  readonly patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequest, 'method' | 'path' | 'body'>) => Promise<T>;
  readonly del: <T>(path: string, options?: Omit<ApiRequest, 'method' | 'path'>) => Promise<T>;
}

function buildQueryString(query?: Readonly<Record<string, string | number | boolean | undefined>>): string {
  if (!query) return '';
  const serialized = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return serialized ? `?${serialized}` : '';
}

function buildHeaders(config: ApiClientConfig, request: ApiRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    ...config.headers,
    ...request.headers,
  };
  headers['x-correlation-id'] = request.correlationId ?? config.headers?.['x-correlation-id'] ?? createCorrelationId();
  const tenantId = config.getTenantId ? config.getTenantId() : config.tenantId;
  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (config.companyId) headers['x-company-id'] = config.companyId;
  if (request.idempotencyKey) headers['idempotency-key'] = request.idempotencyKey;
  return headers;
}

/**
 * Creates a configured ApiClient with automatic auth header injection,
 * optional refresh support, timeout, cancellation and correlation ids.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const request = async <T>(req: ApiRequest): Promise<T> => {
    let accessToken: string | null = null;
    if (config.getAccessToken) accessToken = await config.getAccessToken();

    const headers = buildHeaders(config, req);
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;

    const correlationId = headers['x-correlation-id'];
    const baseUrl = typeof config.baseUrl === 'function' ? config.baseUrl() : config.baseUrl;
    const url = `${baseUrl.replace(/\/+$/, '')}${req.path}${buildQueryString(req.query)}`;
    const timeoutMs = req.timeoutMs ?? config.defaultTimeoutMs ?? 30_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const reqSignal = req.signal;
    if (reqSignal?.aborted) controller.abort();
    else reqSignal?.addEventListener('abort', () => controller.abort(), { once: true });

    const attempt = async (): Promise<Response> => {
      return fetch(url, {
        method: req.method,
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal: controller.signal,
      });
    };

    try {
      let response: Response;
      try {
        response = await attempt();
      } catch (error) {
        if (isAbortError(error)) {
          throw new TimeoutError(timeoutMs);
        }
        throw new NetworkError('Network request failed', error);
      }

      if (response.status === 401 && config.onRefresh) {
        const refreshed = await config.onRefresh();
        if (refreshed) {
          headers.authorization = `Bearer ${refreshed}`;
          response = await attempt();
        }
      }

      if (!response.ok) {
        throw await buildErrorFromResponse(response, correlationId);
      }

      const payload = (await response.json()) as ApiResponse<T>;
      if (isApiErrorResponse(payload)) {
        throw normalizeError(payload, correlationId);
      }
      return (payload as ApiSuccessResponse<T>).data;
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    request,
    get: <T>(path: string, options: Omit<ApiRequest, 'method' | 'path'> = {}) => request<T>({ ...options, method: 'GET', path }),
    post: <T>(path: string, body?: unknown, options: Omit<ApiRequest, 'method' | 'path' | 'body'> = {}) => request<T>({ ...options, method: 'POST', path, body }),
    put: <T>(path: string, body?: unknown, options: Omit<ApiRequest, 'method' | 'path' | 'body'> = {}) => request<T>({ ...options, method: 'PUT', path, body }),
    patch: <T>(path: string, body?: unknown, options: Omit<ApiRequest, 'method' | 'path' | 'body'> = {}) => request<T>({ ...options, method: 'PATCH', path, body }),
    del: <T>(path: string, options: Omit<ApiRequest, 'method' | 'path'> = {}) => request<T>({ ...options, method: 'DELETE', path }),
  };
}
