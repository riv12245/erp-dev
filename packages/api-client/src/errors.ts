import { ApiErrorResponse } from './types.js';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly correlationId?: string;

  constructor(publicName: string, status: number, message: string, code: string, details?: Record<string, unknown>, correlationId?: string) {
    super(message);
    this.name = publicName;
    this.status = status;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
  }
}

export class NetworkError extends ApiClientError {
  constructor(message: string, readonly cause?: unknown) {
    super('NetworkError', 0, message, 'NETWORK_ERROR', undefined, undefined);
  }
}

export class TimeoutError extends ApiClientError {
  constructor(timeoutMs: number) {
    super('TimeoutError', 0, `Request timed out after ${timeoutMs}ms`, 'TIMEOUT');
  }
}

export class UnauthorizedError extends ApiClientError {
  constructor(details?: Record<string, unknown>) {
    super('UnauthorizedError', 401, 'Unauthorized', 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends ApiClientError {
  constructor(details?: Record<string, unknown>) {
    super('ForbiddenError', 403, 'Forbidden', 'FORBIDDEN', details);
  }
}

/** Normalizes a raw fetch Response / error into the typed error hierarchy. */
export function normalizeError(error: unknown, correlationId?: string): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (isAbortError(error)) {
    return new NetworkError('Request aborted', error);
  }
  if (error instanceof TypeError) {
    return new NetworkError('Network request failed', error);
  }
  return new ApiClientError('UnknownError', 0, error instanceof Error ? error.message : 'Unknown error', 'UNKNOWN_ERROR', undefined, correlationId);
}

/** React Native fetch aborts do not require a browser DOMException global. */
export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

/** Parses a failed HTTP response body into an ApiClientError when possible. */
export async function buildErrorFromResponse(response: Response, correlationId?: string): Promise<ApiClientError> {
  let payload: ApiErrorResponse | undefined;
  try {
    payload = (await response.json()) as ApiErrorResponse;
  } catch {
    payload = undefined;
  }
  const code = payload?.error?.code ?? `HTTP_${response.status}`;
  const message = payload?.error?.message ?? `Request failed with status ${response.status}`;
  const details = payload?.error?.details;
  const cid = payload?.correlationId ?? correlationId;
  if (response.status === 401) return new UnauthorizedError(details);
  if (response.status === 403) return new ForbiddenError(details);
  return new ApiClientError('ApiError', response.status, message, code, details, cid);
}

export function createCorrelationId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Trace identifiers only: the fallback is not used for tokens or secrets.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  });
}
