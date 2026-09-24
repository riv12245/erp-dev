
import type { CreateDraftSalesOrderRequest } from '@erp/contracts/sales';

import { AppError } from '../../../shared/errors/app-error.js';

// ============================================================
// VALIDACIÓN DE OBJETOS
// ============================================================

export function object(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw AppError.validation('Object required');
  }

  const data = input as Record<string, unknown>;

  if (Object.keys(data).some((key) => !keys.includes(key))) {
    throw AppError.validation('Unknown or protected order field');
  }

  return data;
}

// ============================================================
// VALIDACIÓN DE IDENTIFICADORES
// ============================================================

export function identifier(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw AppError.validation('Invalid identifier');
  }

  return value;
}

// ============================================================
// CONVERSIÓN NUMÉRICA Y PRECISIÓN DECIMAL
// ============================================================

function scaled(
  value: unknown,
  scale: number,
  max: number,
  positive: boolean,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (positive && value === 0) ||
    value > max
  ) {
    throw AppError.validation('Invalid quantity or price');
  }

  const result = Math.round(value * scale);

  if (
    (value > 0 && result === 0) ||
    Math.abs(result / scale - value) >
    Number.EPSILON * Math.max(1, value)
  ) {
    throw AppError.validation('Unsupported decimal precision');
  }

  return result;
}

// ============================================================
// PRECISIÓN MONETARIA SEGÚN LA DIVISA
// ============================================================

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

// ============================================================
// CÁLCULO DEL IMPORTE POR LÍNEA
// ============================================================

export function lineMinor(
  quantity: number,
  unitPrice: number,
  priceScale = 100,
): bigint {
  const quantityMilli = BigInt(
    scaled(quantity, 1000, 1000000, true),
  );

  const priceMinor = BigInt(
    scaled(unitPrice, priceScale, 1000000000, false),
  );

  return (quantityMilli * priceMinor + 500n) / 1000n;
}

// ============================================================
// CONVERSIÓN DEL IMPORTE A UN NÚMERO
// ============================================================

export function minorNumber(
  value: bigint,
  priceScale = 100,
): number {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw AppError.validation(
      'Order amount exceeds supported precision',
    );
  }

  return Number(value) / priceScale;
}

// ============================================================
// VALIDACIÓN Y CONSTRUCCIÓN DEL BORRADOR DE VENTA
// ============================================================

export function parseDraft(
  input: unknown,
): CreateDraftSalesOrderRequest {
  const data = object(input, [
    'customerId',
    'warehouseId',
    'currency',
    'idempotencyKey',
    'lines',
  ]);

  // Validar moneda.
  if (
    typeof data.currency !== 'string' ||
    !/^[A-Z]{3}$/.test(data.currency)
  ) {
    throw AppError.validation('Invalid currency');
  }

  const priceScale = currencyScale(data.currency);

  // Validar clave de idempotencia.
  if (
    typeof data.idempotencyKey !== 'string' ||
    !data.idempotencyKey.trim() ||
    data.idempotencyKey.length > 200
  ) {
    throw AppError.validation('Invalid idempotency key');
  }

  // Validar líneas del pedido.
  if (
    !Array.isArray(data.lines) ||
    data.lines.length < 1 ||
    data.lines.length > 100
  ) {
    throw AppError.validation('One to 100 lines required');
  }

  // Validar y normalizar productos del pedido.
  const lines = data.lines.map((value) => {
    const line = object(value, [
      'itemId',
      'quantity',
      'unitPrice',
    ]);

    const itemId = identifier(line.itemId);

    const quantity = line.quantity as number;
    const unitPrice = line.unitPrice as number;

    // Verificar cantidad, precio y precisión monetaria.
    lineMinor(quantity, unitPrice, priceScale);

    return {
      itemId,
      quantity,
      unitPrice,
    };
  });

  // Comprobar que el subtotal pueda representarse
  // dentro de la precisión monetaria admitida.
  const subtotalMinor = lines.reduce(
    (total, line) =>
      total +
      lineMinor(
        line.quantity,
        line.unitPrice,
        priceScale,
      ),
    0n,
  );

  minorNumber(subtotalMinor, priceScale);

  // Construir el contrato del borrador.
  return {
    customerId: identifier(data.customerId),
    warehouseId: identifier(data.warehouseId),
    currency: data.currency,
    idempotencyKey: data.idempotencyKey.trim(),
    lines,
  };
}

// ============================================================
// CONTROL DE VERSIONES
// ============================================================

export function expectedVersion(input: unknown): number {
  const data = object(input, ['expectedVersion']);

  if (
    !Number.isSafeInteger(data.expectedVersion) ||
    Number(data.expectedVersion) < 1 ||
    Number(data.expectedVersion) >= Number.MAX_SAFE_INTEGER
  ) {
    throw AppError.validation('Invalid expectedVersion');
  }

  return Number(data.expectedVersion);
}
