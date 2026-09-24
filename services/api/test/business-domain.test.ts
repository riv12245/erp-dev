import { describe, expect, it } from 'vitest';
import { customerInput, customerQuery } from '../src/modules/crm/domain/customer-domain.js';
import { supplierInput, supplierQuery } from '../src/modules/purchasing/domain/supplier-domain.js';
import { nextStockBalance } from '../src/modules/inventory/domain/inventory.js';
import { currencyScale, lineMinor, minorNumber, parseDraft } from '../src/modules/sales/domain/order.js';

describe('business domain contracts without database infrastructure', () => {
  it('normalizes contact input and rejects protected metadata and stale version formats', () => {
    expect(customerInput({ type: 'company', name: ' Acme ', email: ' sales@acme.test ' })).toEqual({ type: 'company', name: 'Acme', email: 'sales@acme.test' });
    expect(supplierInput({ name: ' Supply ', phone: ' 123 ' })).toEqual({ name: 'Supply', phone: '123' });
    expect(() => customerInput({ type: 'company', name: 'Acme', tenantId: 'other' })).toThrow();
    expect(() => supplierInput({ name: 'Supply', companyId: 'other' })).toThrow();
    expect(() => customerInput({ expectedVersion: 0, name: 'Acme' }, true)).toThrow();
    expect(() => supplierInput({ expectedVersion: '1', name: 'Supply' }, true)).toThrow();
  });

  it('bounds list queries and rejects operator-shaped input', () => {
    expect(customerQuery({ page: '2', limit: '10', search: ' Acme ' })).toMatchObject({ page: 2, limit: 10, search: 'Acme' });
    for (const parse of [customerQuery, supplierQuery]) {
      for (const input of [{ page: ['1'] }, { limit: '101' }, { search: { $ne: null } }, { tenantId: 'other' }]) {
        expect(() => parse(input)).toThrow();
      }
    }
  });

  it('preserves fractional stock and refuses underflow, overflow and excessive precision', () => {
    expect(nextStockBalance(0.3, { type: 'outbound', quantity: 0.1 })).toBe(0.2);
    expect(nextStockBalance(0.2, { type: 'outbound', quantity: 0.2 })).toBe(0);
    expect(() => nextStockBalance(2, { type: 'adjustment', quantity: -3 })).toThrow();
    expect(() => nextStockBalance(0, { type: 'inbound', quantity: 0.0000001 })).toThrow();
    expect(() => nextStockBalance(9_000_000_000, { type: 'inbound', quantity: 10_000_000 })).toThrow();
  });

  it('rounds draft lines independently according to the currency minor unit', () => {
    expect(minorNumber(lineMinor(1.125, 2.50))).toBe(2.81);
    expect(minorNumber(lineMinor(1.5, 3, currencyScale('JPY')), currencyScale('JPY'))).toBe(5);
    expect(minorNumber(lineMinor(1.5, 0.003, currencyScale('KWD')), currencyScale('KWD'))).toBe(0.005);
  });

  it('rejects nonzero prices below the currency unit instead of silently treating them as free', () => {
    expect(() => lineMinor(1, 1e-18)).toThrow();
    expect(lineMinor(1, 0)).toBe(0n);
  });

  it.each([Number.MIN_VALUE, 1e-18, Number.EPSILON])('rejects a positive draft quantity that rounds to zero: %s', quantity => {
    expect(() => parseDraft({
      customerId: '11111111-1111-4111-8111-111111111111',
      warehouseId: '22222222-2222-4222-8222-222222222222',
      currency: 'MXN', idempotencyKey: 'tiny-quantity',
      lines: [{ itemId: '33333333-3333-4333-8333-333333333333', quantity, unitPrice: 10 }],
    })).toThrow();
  });
});
