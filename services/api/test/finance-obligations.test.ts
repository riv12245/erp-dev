import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { setupApi, registerAndLogin, authHeaders, apiRequest, type TestHarness } from './helpers.js';
import type { CompanyScope } from '../src/platform/tenancy/company-access.js';

describe('Finance Accounts Receivable & Payable: real replica-set persistence', () => {
  let h: TestHarness;
  let headers: Record<string, string>;
  let scope: CompanyScope;
  let customerId: string;
  let supplierId: string;
  const companyId = randomUUID();
  const salesOrderId = randomUUID();
  const purchaseOrderId = randomUUID();
  const path = `/api/v1/companies/${companyId}/finance/obligations`;

  beforeAll(async () => {
    h = await setupApi({}, true);
    const user = await registerAndLogin(h, 'finance-test@example.test');
    headers = authHeaders(user.accessToken, 'tenant_a');
    scope = { tenantId: 'tenant_a', companyId, userId: user.userId, locale: 'en', timezone: 'UTC' };

    const { getRoleModel } = await import('../src/platform/iam/role-models.js');
    await getRoleModel(h.conn).updateOne(
      { tenantId: 'tenant_a', name: 'ADMIN' },
      { $addToSet: { permissions: { $each: ['finance.read', 'finance.write'] } } }
    );

    const { getCompanyModel, getCompanyMembershipModel } = await import('../src/platform/tenancy/company-model.js');
    await getCompanyModel(h.conn).create({
      id: companyId,
      tenantId: 'tenant_a',
      name: 'Finance test company',
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

    const { CustomerService } = await import('../src/modules/crm/index.js');
    customerId = (await new CustomerService(h.conn).create(scope, { type: 'company', name: 'Billed Customer' })).customerId;

    const { SupplierService } = await import('../src/modules/purchasing/index.js');
    supplierId = (await new SupplierService(h.conn).create(scope, { name: 'Vendor Supplier' })).supplierId;
  }, 120000);

  afterAll(async () => {
    await h?.stop();
  });

  it('creates Accounts Receivable obligation for a customer, records partial and full payments', async () => {
    const createRes = await apiRequest(h.baseUrl, path, {
      method: 'POST',
      headers,
      body: {
        type: 'receivable',
        partyId: customerId,
        referenceId: salesOrderId,
        currency: 'MXN',
        amount: 500,
        description: 'Invoice for Sales Order #1001',
        idempotencyKey: randomUUID(),
      },
    });
    expect(createRes.status).toBe(201);
    const ar = createRes.body.data;
    expect(ar).toMatchObject({
      type: 'receivable',
      partyId: customerId,
      referenceId: salesOrderId,
      amount: 500,
      paidAmount: 0,
      remainingAmount: 500,
      status: 'PENDING',
      version: 1,
    });

    // Partial payment of $200
    const partialRes = await apiRequest(h.baseUrl, `${path}/${ar.obligationId}/payments`, {
      method: 'POST',
      headers,
      body: {
        amount: 200,
        paymentMethod: 'bank_transfer',
        reference: 'TRX-101',
        idempotencyKey: randomUUID(),
        expectedVersion: 1,
      },
    });
    expect(partialRes.status).toBe(200);
    expect(partialRes.body.data).toMatchObject({
      obligationId: ar.obligationId,
      amount: 500,
      paidAmount: 200,
      remainingAmount: 300,
      status: 'PARTIALLY_PAID',
      version: 2,
    });
    expect(partialRes.body.data.payments).toHaveLength(1);

    // Final payment of $300
    const finalRes = await apiRequest(h.baseUrl, `${path}/${ar.obligationId}/payments`, {
      method: 'POST',
      headers,
      body: {
        amount: 300,
        paymentMethod: 'card',
        reference: 'TRX-102',
        idempotencyKey: randomUUID(),
        expectedVersion: 2,
      },
    });
    expect(finalRes.status).toBe(200);
    expect(finalRes.body.data).toMatchObject({
      paidAmount: 500,
      remainingAmount: 0,
      status: 'PAID',
      version: 3,
    });
    expect(finalRes.body.data.payments).toHaveLength(2);
  });

  it('creates Accounts Payable obligation for a vendor supplier and enforces payment bounds', async () => {
    const createRes = await apiRequest(h.baseUrl, path, {
      method: 'POST',
      headers,
      body: {
        type: 'payable',
        partyId: supplierId,
        referenceId: purchaseOrderId,
        currency: 'MXN',
        amount: 1000,
        description: 'Vendor Invoice for PO #2001',
        idempotencyKey: randomUUID(),
      },
    });
    expect(createRes.status).toBe(201);
    const ap = createRes.body.data;
    expect(ap).toMatchObject({ type: 'payable', partyId: supplierId, amount: 1000, status: 'PENDING' });

    // Reject payment exceeding remaining balance ($1200 > $1000)
    const overpay = await apiRequest(h.baseUrl, `${path}/${ap.obligationId}/payments`, {
      method: 'POST',
      headers,
      body: {
        amount: 1200,
        paymentMethod: 'wire',
        reference: 'TRX-999',
        idempotencyKey: randomUUID(),
        expectedVersion: 1,
      },
    });
    expect(overpay.status).toBe(400);
  });
});
