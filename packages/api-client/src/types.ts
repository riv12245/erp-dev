/**
 * Centralized API client configuration and transport.
 * Frontends must NOT scatter fetch() calls; all HTTP goes through this package.
 */

export interface ApiClientConfig {
  readonly baseUrl: string | (() => string);
  readonly defaultTimeoutMs?: number;
  readonly getAccessToken?: () => Promise<string | null> | string | null;
  readonly onRefresh?: () => Promise<string | null>;
  readonly getSessionEpoch?: () => number;
  readonly credentials?: RequestCredentials;
  readonly tenantId?: string;
  readonly getTenantId?: () => string | null | undefined;
  readonly companyId?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface ApiRequest {
  readonly method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Only set when the endpoint actually guarantees idempotency for this key. */
  readonly idempotencyGuaranteed?: boolean;
  readonly path: string;
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly idempotencyKey?: string;
  readonly retries?: number;
  readonly correlationId?: string;
}

export interface ApiSuccessResponse<T> {
  readonly data: T;
  readonly meta?: Record<string, unknown>;
  readonly correlationId: string;
}

export interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
  };
  readonly correlationId: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function isApiErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return 'error' in response;
}
