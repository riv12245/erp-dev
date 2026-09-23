import type { CreateCustomerRequest, UpdateCustomerRequest, CustomerListQuery } from '@erp/contracts/shared';
import { AppError } from '../../../shared/errors/app-error.js';

const fields = ['type', 'name', 'email', 'phone', 'taxId'];
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw AppError.validation('Expected an object');
  return value as Record<string, unknown>;
}
export function customerId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw AppError.validation('Invalid customer identifier');
  return value;
}
export function customerInput(value: unknown, patch: true): UpdateCustomerRequest;
export function customerInput(value: unknown, patch?: false): CreateCustomerRequest;
export function customerInput(value: unknown, patch = false): CreateCustomerRequest | UpdateCustomerRequest {
  const input = object(value);
  const allowed = patch ? [...fields, 'status', 'expectedVersion'] : fields;
  if (Object.keys(input).some(key => !allowed.includes(key))) throw AppError.validation('Unknown or protected customer field');
  if (patch && (!Number.isSafeInteger(input.expectedVersion) || Number(input.expectedVersion) < 1 || Number(input.expectedVersion) >= Number.MAX_SAFE_INTEGER)) throw AppError.validation('Invalid expectedVersion');
  if (patch && Object.keys(input).length < 2) throw AppError.validation('No customer changes provided');
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = input[field];
    if (value === undefined && (patch || !['type', 'name'].includes(field))) continue;
    const max = field === 'name' ? 200 : field === 'email' ? 254 : field === 'phone' ? 50 : 100;
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw AppError.validation(`Invalid ${field}`);
    result[field] = value.trim();
  }
  if (result.type !== undefined && !['company', 'individual'].includes(String(result.type))) throw AppError.validation('Invalid customer type');
  if (result.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(result.email))) throw AppError.validation('Invalid email');
  if (input.status !== undefined) {
    if (!['active', 'inactive', 'blocked'].includes(String(input.status)) || typeof input.status !== 'string') throw AppError.validation('Invalid customer status');
    result.status = input.status;
  }
  if (patch) result.expectedVersion = input.expectedVersion;
  return result as unknown as CreateCustomerRequest | UpdateCustomerRequest;
}
export function customerQuery(value: unknown): Required<Pick<CustomerListQuery, 'page' | 'limit'>> & CustomerListQuery {
  const input = object(value);
  if (Object.keys(input).some(key => !['page', 'limit', 'search', 'status'].includes(key))) throw AppError.validation('Unknown list parameter');
  function positive(value: unknown, fallback: number, max: number): number {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw AppError.validation('Invalid pagination');
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result > max) throw AppError.validation('Invalid pagination');
    return result;
  }
  const page = positive(input.page, 1, 1000000);
  const limit = positive(input.limit, 20, 100);
  if (input.search !== undefined && (typeof input.search !== 'string' || input.search.length > 200)) throw AppError.validation('Invalid search');
  if (input.status !== undefined && (typeof input.status !== 'string' || !['active', 'inactive', 'blocked'].includes(input.status))) throw AppError.validation('Invalid customer status');
  return { page, limit, search: (input.search as string | undefined)?.trim(), status: input.status as CustomerListQuery['status'] };
}
