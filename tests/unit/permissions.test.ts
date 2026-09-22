import { TenantAccessDeniedError } from '../../services/api/src/shared/errors/tenant-error.js';
import { HttpError } from '../../services/api/src/shared/errors/http-error.js';
import { AppError } from '../../services/api/src/shared/errors/app-error.js';
import { DomainError } from '../../services/api/src/shared/errors/domain-error.js';
import { FiscalPeriodClosedError } from '../../services/api/src/shared/errors/fiscal-period-closed-error.js';
import { ErrorCode } from '../../services/api/src/shared/types/index.js';
import { isDomainError, isHttpError, isAppError, normalizeError } from '../../services/api/src/shared/errors/index.js';

describe('RBAC and Policy Tests', () => {
  const VALID_ROLES = ['super-admin', 'admin', 'manager', 'user', 'viewer'];
  const PERMISSION_MAP: Record<string, string[]> = {
    'super-admin': ['*'],
    admin: ['read', 'write', 'delete', 'manage:tenants', 'manage:users'],
    manager: ['read', 'write', 'manage:own-tenant'],
    user: ['read', 'write'],
    viewer: ['read'],
  };

  function hasPermission(role: string, permission: string): boolean {
    const perms = PERMISSION_MAP[role] ?? [];
    return perms.includes('*') || perms.includes(permission) || perms.includes(`manage:${permission}`);
  }

  describe('Role-Based Access Control', () => {
    it('should allow super-admin all permissions', () => {
      expect(hasPermission('super-admin', 'delete')).toBe(true);
      expect(hasPermission('super-admin', 'manage:tenants')).toBe(true);
    });

    it('should restrict viewer to read-only', () => {
      expect(hasPermission('viewer', 'read')).toBe(true);
      expect(hasPermission('viewer', 'write')).toBe(false);
      expect(hasPermission('viewer', 'delete')).toBe(false);
    });

    it('should allow manager to write but not delete', () => {
      expect(hasPermission('manager', 'read')).toBe(true);
      expect(hasPermission('manager', 'write')).toBe(true);
      expect(hasPermission('manager', 'delete')).toBe(false);
    });

    it('should allow admin to manage tenants', () => {
      expect(hasPermission('admin', 'manage:tenants')).toBe(true);
      expect(hasPermission('admin', 'manage:users')).toBe(true);
    });

    it('should deny unknown roles all permissions', () => {
      expect(hasPermission('unknown-role', 'read')).toBe(false);
    });
  });

  describe('Policy Evaluation', () => {
    function evaluatePolicy(
      userTenantId: string,
      resourceTenantId: string,
      userRoles: string[]
    ): boolean {
      if (userTenantId !== resourceTenantId) return false;
      if (userRoles.includes('admin') || userRoles.includes('super-admin')) return true;
      return userRoles.includes('manager');
    }

    it('should deny access across different tenants', () => {
      const result = evaluatePolicy('tenant-a', 'tenant-b', ['admin']);
      expect(result).toBe(false);
    });

    it('should allow admin access within same tenant', () => {
      const result = evaluatePolicy('tenant-a', 'tenant-a', ['admin']);
      expect(result).toBe(true);
    });

    it('should allow same-tenant manager access', () => {
      const result = evaluatePolicy('tenant-a', 'tenant-a', ['manager']);
      expect(result).toBe(true);
    });

    it('should deny same-tenant viewer access to write', () => {
      const result = evaluatePolicy('tenant-a', 'tenant-a', ['viewer']);
      expect(result).toBe(false);
    });
  });

  describe('TenantAccessDeniedError', () => {
    it('should create error with 403 status', () => {
      const error = new TenantAccessDeniedError('Forbidden', { tenantId: 'tenant-a' });
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.TENANT_ACCESS_DENIED);
      expect(error.name).toBe('TenantAccessDeniedError');
    });
  });

  describe('Error Classification', () => {
    it('should classify DomainError correctly', () => {
      const error = new DomainError({ message: 'test', code: ErrorCode.VALIDATION_ERROR });
      expect(isDomainError(error)).toBe(true);
      expect(isHttpError(error)).toBe(false);
    });

    it('should classify HttpError correctly', () => {
      const error = new HttpError({ message: 'test', statusCode: 400, code: ErrorCode.BAD_REQUEST });
      expect(isHttpError(error)).toBe(true);
      expect(isAppError(error)).toBe(false);
    });

    it('should normalize DomainError to AppError', () => {
      const domainError = new DomainError({ message: 'domain err', code: ErrorCode.VALIDATION_ERROR });
      const normalized = normalizeError(domainError);
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.code).toBe(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('FiscalPeriodClosedError', () => {
    it('should create error with 409 status and period details', () => {
      const error = new FiscalPeriodClosedError({
        periodId: 'fp-001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-03-31'),
        organizationId: 'org-001',
      });

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.FISCAL_PERIOD_CLOSED);
      expect(error.periodId).toBe('fp-001');
      expect(error.organizationId).toBe('org-001');
      expect(error.periodStart).toEqual(new Date('2024-01-01'));
      expect(error.periodEnd).toEqual(new Date('2024-03-31'));
    });
  });
});
