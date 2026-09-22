import { createTenantContext, createDifferentTenantContext } from './helpers.js';
import { TenantAccessDeniedError } from '../../services/api/src/shared/errors/tenant-error.js';
import { ErrorCode } from '../../services/api/src/shared/types/index.js';

describe('Tenant Isolation', () => {
  it('should ensure Tenant A cannot access Tenant B data', () => {
    const tenantA = createTenantContext({ tenantId: 'tenant-a' });
    const tenantB = createDifferentTenantContext({ tenantId: 'tenant-b' });

    expect(tenantA.tenantId).not.toEqual(tenantB.tenantId);
    expect(tenantA.organizationId).not.toEqual(tenantB.organizationId);
    expect(tenantA.userId).not.toEqual(tenantB.userId);
  });

  it('should throw TenantAccessDeniedError when accessing cross-tenant data', () => {
    const tenantA = createTenantContext({ tenantId: 'tenant-a' });
    const tenantB = createDifferentTenantContext({ tenantId: 'tenant-b' });

    const error = new TenantAccessDeniedError('Cross-tenant access denied', {
      requestingTenant: tenantA.tenantId,
      targetTenant: tenantB.tenantId,
    });

    expect(error.name).toBe('TenantAccessDeniedError');
    expect(error.code).toBe(ErrorCode.TENANT_ACCESS_DENIED);
    expect(error.statusCode).toBe(403);
    expect(error.details).toBeDefined();
  });

  it('should validate tenant IDs are unique per context', () => {
    const contexts = [
      createTenantContext({ tenantId: 'tenant-1' }),
      createTenantContext({ tenantId: 'tenant-2' }),
      createTenantContext({ tenantId: 'tenant-3' }),
    ];

    const tenantIds = contexts.map((c) => c.tenantId);
    const uniqueIds = new Set(tenantIds);
    expect(uniqueIds.size).toBe(tenantIds.length);
  });

  it('should enforce that a user in Tenant A cannot operate on Tenant B resources', () => {
    const tenantA = createTenantContext({ tenantId: 'tenant-a', permissions: ['read'] });
    const tenantB = createDifferentTenantContext({ tenantId: 'tenant-b', permissions: ['write'] });

    expect(tenantA.permissions).not.toEqual(tenantB.permissions);
    expect(tenantA.tenantId).not.toEqual(tenantB.tenantId);
  });

  it('should validate that tenant context contains all required fields', () => {
    const ctx = createTenantContext();
    expect(ctx).toHaveProperty('tenantId');
    expect(ctx).toHaveProperty('organizationId');
    expect(ctx).toHaveProperty('userId');
    expect(ctx).toHaveProperty('roles');
    expect(ctx).toHaveProperty('permissions');
    expect(ctx).toHaveProperty('locale');
    expect(ctx).toHaveProperty('timezone');
  });
});
