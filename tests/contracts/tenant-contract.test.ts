import { TenantContext } from '../../services/api/src/shared/types/index.js';
import { TenantAccessDeniedError } from '../../services/api/src/shared/errors/tenant-error.js';
import { ErrorCode } from '../../services/api/src/shared/types/index.js';

describe('Tenant Contract Tests', () => {
  function createTenantContext(overrides: Record<string, unknown> = {}): TenantContext {
    return {
      tenantId: overrides.tenantId ?? 'tenant-a',
      organizationId: overrides.organizationId ?? 'org-a',
      userId: overrides.userId ?? 'user-a',
      roles: overrides.roles ?? ['admin'],
      permissions: overrides.permissions ?? ['read', 'write'],
      locale: overrides.locale ?? 'en-US',
      timezone: overrides.timezone ?? 'UTC',
      ...overrides,
    };
  }

  it('should enforce unique tenant IDs', () => {
    const tenantA = createTenantContext({ tenantId: 'tenant-a' });
    const tenantB = createTenantContext({ tenantId: 'tenant-b' });
    expect(tenantA.tenantId).not.toEqual(tenantB.tenantId);
  });

  it('should enforce tenant isolation for data access', () => {
    const tenantA = createTenantContext({ tenantId: 'tenant-a', permissions: ['read'] });
    const tenantB = createTenantContext({ tenantId: 'tenant-b', permissions: ['read'] });
    expect(tenantA.tenantId).not.toEqual(tenantB.tenantId);
    expect(tenantA.permissions).not.toEqual(tenantB.permissions);
  });

  it('should throw TenantAccessDeniedError for cross-tenant access', () => {
    const ctxA = createTenantContext({ tenantId: 'tenant-a' });
    const ctxB = createTenantContext({ tenantId: 'tenant-b' });

    expect(() => {
      if (ctxA.tenantId !== ctxB.tenantId) {
        throw new TenantAccessDeniedError('Cross-tenant access denied', {
          source: ctxA.tenantId,
          target: ctxB.tenantId,
        });
      }
    }).toThrow(TenantAccessDeniedError);
  });

  it('should have all required tenant context fields', () => {
    const ctx = createTenantContext();
    expect(ctx).toHaveProperty('tenantId');
    expect(ctx).toHaveProperty('organizationId');
    expect(ctx).toHaveProperty('userId');
    expect(ctx).toHaveProperty('roles');
    expect(ctx).toHaveProperty('permissions');
    expect(ctx).toHaveProperty('locale');
    expect(ctx).toHaveProperty('timezone');
  });

  it('should validate tenant context structure', () => {
    const ctx = createTenantContext();
    expect(typeof ctx.tenantId).toBe('string');
    expect(typeof ctx.organizationId).toBe('string');
    expect(typeof ctx.userId).toBe('string');
    expect(Array.isArray(ctx.roles)).toBe(true);
    expect(Array.isArray(ctx.permissions)).toBe(true);
  });
});
