import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { setupApi, registerAndLogin, authHeaders, apiRequest, type TestHarness } from './helpers.js';
import type { CompanyScope } from '../src/platform/tenancy/company-access.js';

describe('Purchase orders & Goods receipt: real replica-set persistence', () => {
  let h: TestHarness;
  let headers: Record<string, string>;
  let scope: CompanyScope;
  let supplierId: string;
  let itemId: string;
  let warehouseId: string;
  const companyId = randomUUID();
  const path = `/api/v1/companies/${companyId}/purchasing/orders`;

  beforeAll(async () => {
    h = await setupApi({}, true);
    const user = await registerAndLogin(h, 'po-test@example.test');
    headers = authHeaders(user.accessToken, 'tenant_a');
    scope = { tenantId: 'tenant_a', companyId, userId: user.userId, locale: 'en', timezone: 'UTC' };

    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    await getRoleModel(h.conn).updateOne(
      { tenantId: 'tenant_a', name: 'ADMIN' },
      { $addToSet: { permissions: { $each: ['purchasing.supplier.read', 'purchasing.supplier.write'] } } }
    );

    const { getCompanyModel, getCompanyMembershipModel } = await import('../src/platform/tenancy/company-model.js');
    await getCompanyModel(h.conn).create({
      id: companyId,
      tenantId: 'tenant_a',
      name: 'Purchasing test co',
      taxId: 'test',
      registrationNumber: 'test',
      defaultCurrency: 'MXN',
      defaultTimezone: 'UTC',
      isActive: true,
    });
    await getCompanyMembershipModel(h.conn).create({
      tenantId: 'tenant_a',
      companyId,
      userId: user.userId,
      status: 'active',
    });

    const { SupplierService } = await import('../src/modules/purchasing/index.js');
    supplierId = (await new SupplierService(h.conn).create(scope, { name: 'Acme Wholesaler' })).supplierId;

    const { InventoryService } = await import('../src/modules/inventory/index.js');
    const inventory = new InventoryService(h.conn);
    itemId = (await inventory.createProduct(scope, { name: 'Stock Product', sku: 'PO-ITEM-01', unitOfMeasure: 'piece' })).id;
    warehouseId = (await inventory.createWarehouse(scope, { name: 'Main Intake Warehouse', code: 'PO-WH-01' })).id;
  }, 120000);

  afterAll(async () => {
    await h?.stop();
  });

  function input() {
    return {
      supplierId,
      warehouseId,
      currency: 'MXN',
      idempotencyKey: randomUUID(),
      lines: [{ itemId, quantity: 15, unitPrice: 12.5 }],
    };
  }

  async function createOrder(body = input()) {
    const response = await apiRequest(h.baseUrl, path, { method: 'POST', headers, body });
    expect(response.status).toBe(201);
    return response.body.data;
  }

  it('creates purchase order in ORDERED state with calculated subtotals', async () => {
    const po = await createOrder();
    expect(po).toMatchObject({
      tenantId: 'tenant_a',
      companyId,
      supplierId,
      warehouseId,
      currency: 'MXN',
      status: 'ORDERED',
      subtotal: 187.5,
      version: 1,
    });
    expect(po.lines[0]).toMatchObject({ itemId, quantity: 15, unitPrice: 12.5, subtotal: 187.5 });

    const detail = await apiRequest(h.baseUrl, `${path}/${po.orderId}`, { headers });
    expect(detail.status).toBe(200);
    expect(detail.body.data).toEqual(po);
  });

  it('receives goods for a purchase order, creating inbound stock movement and updating stock balance', async () => {
    const { InventoryService } = await import('../src/modules/inventory/index.js');
    const inventory = new InventoryService(h.conn);

    // Initial stock is 0
    expect((await inventory.getAvailability(scope, itemId, warehouseId)).onHand).toBe(0);

    const po = await createOrder();

    // Receive goods
    const receiveRes = await apiRequest(h.baseUrl, `${path}/${po.orderId}/receive`, {
      method: 'POST',
      headers,
      body: { expectedVersion: 1 },
    });
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.status).toBe('RECEIVED');

    // Stock on hand should now be 15
    expect((await inventory.getAvailability(scope, itemId, warehouseId)).onHand).toBe(15);

    // Attempting to receive goods again fails with 409 Conflict
    const secondReceive = await apiRequest(h.baseUrl, `${path}/${po.orderId}/receive`, {
      method: 'POST',
      headers,
      body: { expectedVersion: 2 },
    });
    expect(secondReceive.status).toBe(409);
  });

  it('cancels an active purchase order and prevents receiving goods on cancelled orders', async () => {
    const po = await createOrder();
    const cancelRes = await apiRequest(h.baseUrl, `${path}/${po.orderId}/cancel`, {
      method: 'POST',
      headers,
      body: { expectedVersion: 1 },
    });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const tryReceive = await apiRequest(h.baseUrl, `${path}/${po.orderId}/receive`, {
      method: 'POST',
      headers,
      body: { expectedVersion: 2 },
    });
    expect(tryReceive.status).toBe(409);
  });
});
