import type { CreateObligationRequest, RecordPaymentRequest } from '@erp/contracts/finance';
import { AppError } from '../../../shared/errors/app-error.js';

export function object(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw AppError.validation('Object required');
  }
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some((key) => !keys.includes(key))) {
    throw AppError.validation('Unknown or protected finance field');
  }
  return data;
}

export function identifier(value: unknown, name = 'identifier'): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw AppError.validation(`Invalid ${name}`);
  }
  return value;
}

export function currencyScale(currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw AppError.validation('Invalid currency');
  }
  let fractionDigits: number | undefined;
  try {
    fractionDigits = new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    throw AppError.validation('Unsupported currency');
  }
  if (
    fractionDigits === undefined ||
    !Number.isInteger(fractionDigits) ||
    fractionDigits < 0 ||
    fractionDigits > 3
  ) {
    throw AppError.validation('Invalid currency precision');
  }
  return 10 ** fractionDigits;
}

export function parseCreateObligation(input: unknown): CreateObligationRequest {
  const data = object(input, [
    'type',
    'partyId',
    'referenceId',
    'currency',
    'amount',
    'description',
    'dueDate',
    'idempotencyKey',
  ]);

  if (typeof data.type !== 'string' || !['receivable', 'payable'].includes(data.type)) {
    throw AppError.validation('Invalid obligation type (receivable or payable required)');
  }

  if (typeof data.currency !== 'string' || !/^[A-Z]{3}$/.test(data.currency)) {
    throw AppError.validation('Invalid currency');
  }

  if (
    typeof data.amount !== 'number' ||
    !Number.isFinite(data.amount) ||
    data.amount <= 0 ||
    data.amount > 1_000_000_000
  ) {
    throw AppError.validation('Amount must be positive and at most 1,000,000,000');
  }

  if (
    typeof data.description !== 'string' ||
    !data.description.trim() ||
    data.description.length > 500
  ) {
    throw AppError.validation('Description required (max 500 chars)');
  }

  if (
    typeof data.idempotencyKey !== 'string' ||
    !data.idempotencyKey.trim() ||
    data.idempotencyKey.length > 200
  ) {
    throw AppError.validation('Invalid idempotency key');
  }

  return {
    type: data.type as 'receivable' | 'payable',
    partyId: identifier(data.partyId, 'partyId'),
    referenceId: identifier(data.referenceId, 'referenceId'),
    currency: data.currency,
    amount: Math.round(data.amount * 100) / 100,
    description: data.description.trim(),
    dueDate: data.dueDate ? String(data.dueDate).trim() : undefined,
    idempotencyKey: data.idempotencyKey.trim(),
  };
}

export function parseRecordPayment(input: unknown): RecordPaymentRequest {
  const data = object(input, [
    'amount',
    'paymentMethod',
    'reference',
    'note',
    'idempotencyKey',
    'expectedVersion',
  ]);

  if (
    typeof data.amount !== 'number' ||
    !Number.isFinite(data.amount) ||
    data.amount <= 0 ||
    data.amount > 1_000_000_000
  ) {
    throw AppError.validation('Payment amount must be positive and at most 1,000,000,000');
  }

  if (
    typeof data.paymentMethod !== 'string' ||
    !data.paymentMethod.trim() ||
    data.paymentMethod.length > 100
  ) {
    throw AppError.validation('Payment method required');
  }

  if (
    typeof data.reference !== 'string' ||
    !data.reference.trim() ||
    data.reference.length > 200
  ) {
    throw AppError.validation('Payment reference required');
  }

  if (
    typeof data.idempotencyKey !== 'string' ||
    !data.idempotencyKey.trim() ||
    data.idempotencyKey.length > 200
  ) {
    throw AppError.validation('Invalid idempotency key');
  }

  if (
    !Number.isSafeInteger(data.expectedVersion) ||
    Number(data.expectedVersion) < 1 ||
    Number(data.expectedVersion) >= Number.MAX_SAFE_INTEGER
  ) {
    throw AppError.validation('Invalid expectedVersion');
  }

  return {
    amount: Math.round(data.amount * 100) / 100,
    paymentMethod: data.paymentMethod.trim(),
    reference: data.reference.trim(),
    note: data.note ? String(data.note).trim() : undefined,
    idempotencyKey: data.idempotencyKey.trim(),
    expectedVersion: Number(data.expectedVersion),
  };
}
