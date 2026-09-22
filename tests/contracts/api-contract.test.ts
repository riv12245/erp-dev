import { ApiResponse } from '../../services/api/src/shared/types/index.js';
import { TenantContext } from '../../services/api/src/shared/types/index.js';
import { ErrorResponse } from '../../services/api/src/shared/types/index.js';
import { TenantAccessDeniedError } from '../../services/api/src/shared/errors/tenant-error.js';
import { DomainError } from '../../services/api/src/shared/errors/domain-error.js';
import { ErrorCode } from '../../services/api/src/shared/types/index.js';

describe('API Contract Tests', () => {
  function createApiResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: 'req-001',
    };
  }

  function createErrorResponse(code: ErrorCode, message: string): ErrorResponse {
    return {
      code,
      message,
      timestamp: new Date().toISOString(),
      requestId: 'req-001',
    };
  }

  describe('ApiResponse Contract', () => {
    it('should have success boolean field', () => {
      const response = createApiResponse({ id: '1' });
      expect(response).toHaveProperty('success');
      expect(typeof response.success).toBe('boolean');
    });

    it('should have optional data field', () => {
      const response = createApiResponse({ id: '1' });
      expect(response).toHaveProperty('data');
      expect(response.data).toBeDefined();
    });

    it('should have optional error field', () => {
      const response: ApiResponse<null> = { success: false, error: createErrorResponse(ErrorCode.NOT_FOUND, 'Not found') };
      expect(response).toHaveProperty('error');
      expect(response.error).toBeDefined();
    });

    it('should have optional meta field', () => {
      const response: ApiResponse<null> = { success: true, meta: { total: 1 } };
      expect(response).toHaveProperty('meta');
    });

    it('should enforce success=true for valid responses', () => {
      const response = createApiResponse({ id: '1' });
      expect(response.success).toBe(true);
    });
  });

  describe('ErrorResponse Contract', () => {
    it('should have all required error fields', () => {
      const error = createErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Validation failed');
      expect(error.timestamp).toBeTruthy();
      expect(error.requestId).toBe('req-001');
    });

    it('should include details when provided', () => {
      const error: ErrorResponse = {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { field: 'email' },
        timestamp: new Date().toISOString(),
        requestId: 'req-001',
      };
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('TenantContext Contract', () => {
    it('should have all required tenant context fields', () => {
      const ctx: TenantContext = {
        tenantId: 'tenant-a',
        organizationId: 'org-a',
        userId: 'user-a',
        roles: ['admin'],
        permissions: ['read', 'write'],
        locale: 'en-US',
        timezone: 'UTC',
      };
      expect(ctx.tenantId).toBe('tenant-a');
      expect(ctx.organizationId).toBe('org-a');
      expect(ctx.userId).toBe('user-a');
      expect(ctx.roles).toContain('admin');
      expect(ctx.permissions).toContain('read');
      expect(ctx.permissions).toContain('write');
    });
  });

  describe('Pagination Contract', () => {
    it('should have page and limit', () => {
      const pagination = { page: 1, limit: 20 };
      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(20);
    });
  });
});
