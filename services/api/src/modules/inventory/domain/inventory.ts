import { AppError } from '../../../shared/errors/app-error.js';
import { InsufficientStockError } from '../../../shared/errors/domain-errors.js';
export type StockMovementType = 'inbound' | 'outbound' | 'adjustment' | 'transfer-in' | 'transfer-out';
export interface StockMovement {
    readonly movementId: string;
    readonly tenantId: string;
    readonly itemId: string;
    readonly warehouseId: string;
    readonly type: StockMovementType;
    readonly quantity: number;
    readonly referenceType?: string;
    readonly referenceId?: string;
    readonly ledgerDate: Date;
}
// Technical quantity representation, independent of currency or business pricing.
// Store at most six decimal places and calculate in safe integer micro-units.
const QUANTITY_SCALE = 1_000_000;
function quantityUnits(value: number): number {
    const scaled = value * QUANTITY_SCALE;
    const units = Math.round(scaled);
    // Allow floating-point multiplication noise, never a seventh decimal place.
    const tolerance = Math.min(0.0000001, Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4);
    if (!Number.isFinite(value) || !Number.isSafeInteger(units) || Math.abs(scaled - units) > tolerance)
        throw AppError.validation('Stock quantities require at most six decimal places within the safe scaled range');
    return units;
}
export function nextStockBalance(currentOnHand: number, movement: Pick<StockMovement, 'quantity' | 'type'>): number {
    if (!Number.isFinite(currentOnHand) || currentOnHand < 0 || !Number.isFinite(movement.quantity) || movement.quantity === 0 || (movement.type !== 'adjustment' && movement.quantity < 0))
        throw AppError.validation('Invalid stock quantity');
    if (!['inbound', 'outbound', 'adjustment', 'transfer-in', 'transfer-out'].includes(movement.type))
        throw AppError.validation('Invalid movement type');
    const currentUnits = quantityUnits(currentOnHand);
    const units = quantityUnits(movement.quantity);
    if (units === 0) throw AppError.validation('Stock movement must be at least 0.000001');
    const deltaUnits = movement.type === 'outbound' || movement.type === 'transfer-out' ? -units : units;
    if (deltaUnits < 0 && currentUnits < -deltaUnits)
        throw new InsufficientStockError({ requested: Math.abs(movement.quantity), available: currentOnHand });
    if (deltaUnits > 0 && currentUnits > Number.MAX_SAFE_INTEGER - deltaUnits)
        throw AppError.validation('Stock quantity exceeds the safe scaled range');
    const nextUnits = currentUnits + deltaUnits;
    const next = nextUnits / QUANTITY_SCALE;
    // A large Number must round-trip without losing even one micro-unit.
    if (quantityUnits(next) !== nextUnits)
        throw AppError.validation('Stock balance cannot preserve six-decimal precision');
    return next;
}
export function validateMovementAllowed(currentOnHand: number, movement: Pick<StockMovement, 'quantity' | 'type'>): void {
    nextStockBalance(currentOnHand, movement);
}
export function object(value: unknown, allowed: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw AppError.validation('Expected an object');
    const data = value as Record<string, unknown>;
    if (Object.keys(data).some(key => !allowed.includes(key)))
        throw AppError.validation('Unknown input field');
    return data;
}
export function text(value: unknown, field: string, max = 200): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
        throw AppError.validation(`Invalid ${field}`);
    return value.trim();
}
export function identifier(value: unknown, field: string): string {
    const id = text(value, field, 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        throw AppError.validation(`Invalid ${field}`);
    return id;
}
export function number(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
        throw AppError.validation(`Invalid ${field}`);
    return value;
}
export const productFields = ['name', 'sku', 'unitOfMeasure', 'description', 'category', 'subcategory', 'costPrice', 'sellingPrice', 'taxRate', 'weight', 'dimensions', 'isActive'];
export function productInput(value: unknown, patch = false): Record<string, unknown> {
    const data = object(value, [...productFields, ...(patch ? ['expectedVersion'] : [])]);
    const result: Record<string, unknown> = patch ? {} : { description: '', category: '', subcategory: null, costPrice: 0, sellingPrice: 0, taxRate: 0, weight: null, dimensions: null, isActive: true };
    for (const key of ['name', 'sku', 'unitOfMeasure'])
        if (!patch || key in data)
            result[key] = text(data[key], key);
    if ('unitOfMeasure' in result && !['piece', 'kg', 'liter', 'meter', 'box', 'set'].includes(result.unitOfMeasure as string))
        throw AppError.validation('Invalid unitOfMeasure');
    if (typeof result.sku === 'string')
        result.sku = result.sku.toUpperCase();
    for (const key of ['description', 'category', 'subcategory'])
        if (key in data) {
            if (key === 'subcategory' && data[key] === null)
                result[key] = null;
            else if (typeof data[key] !== 'string' || (data[key] as string).length > 2000)
                throw AppError.validation(`Invalid ${key}`);
            else
                result[key] = (data[key] as string).trim();
        }
    for (const key of ['costPrice', 'sellingPrice', 'taxRate', 'weight'])
        if (key in data)
            result[key] = key === 'weight' && data[key] === null ? null : number(data[key], key);
    if ('dimensions' in data) {
        if (data.dimensions === null)
            result.dimensions = null;
        else {
            const d = object(data.dimensions, ['length', 'width', 'height', 'unit']);
            result.dimensions = { length: number(d.length, 'length'), width: number(d.width, 'width'), height: number(d.height, 'height'), unit: text(d.unit, 'unit', 20) };
        }
    }
    if ('isActive' in data) {
        if (typeof data.isActive !== 'boolean')
            throw AppError.validation('Invalid isActive');
        result.isActive = data.isActive;
    }
    if (patch && (!Number.isSafeInteger(data.expectedVersion) || (data.expectedVersion as number) < 0 || (data.expectedVersion as number) >= Number.MAX_SAFE_INTEGER || !Object.keys(result).length))
        throw AppError.validation('Valid expectedVersion and changes required');
    return result;
}
