import { DomainError } from '../../services/api/src/shared/errors/domain-error.js';
import { HttpError } from '../../services/api/src/shared/errors/http-error.js';
import { AppError } from '../../services/api/src/shared/errors/app-error.js';
import { TenantAccessDeniedError } from '../../services/api/src/shared/errors/tenant-error.js';
import { FiscalPeriodClosedError } from '../../services/api/src/shared/errors/fiscal-period-closed-error.js';
import { ErrorCode } from '../../services/api/src/shared/types/index.js';
import { isDomainError, isHttpError, isAppError, normalizeError } from '../../services/api/src/shared/errors/index.js';

describe('Domain Error Tests', () => {
  describe('DomainError', () => {
    it('should create a DomainError with correct properties', () => {
      const error = new DomainError({
        message: 'Domain validation failed',
        code: ErrorCode.VALIDATION_ERROR,
        details: { field: 'email', reason: 'invalid format' },
      });
      expect(error.name).toBe('DomainError');
      expect(error.message).toBe('Domain validation failed');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual({ field: 'email', reason: 'invalid format' });
    });

    it('should include cause when provided', () => {
      const cause = new Error('Underlying error');
      const error = new DomainError({ message: 'Error', code: ErrorCode.INTERNAL_SERVER_ERROR, cause });
      expect(error.cause).toBe(cause);
    });

    it('should be an instance of Error', () => {
      const error = new DomainError({ message: 'test', code: ErrorCode.BAD_REQUEST });
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('HttpError', () => {
    it('should create an HttpError with status code', () => {
      const error = new HttpError({ message: 'Not found', statusCode: 404, code: ErrorCode.NOT_FOUND });
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.name).toBe('HttpError');
    });

    it('should be an instance of Error', () => {
      const error = new HttpError({ message: 'test', statusCode: 400, code: ErrorCode.BAD_REQUEST });
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('TenantAccessDeniedError', () => {
    it('should have 403 status code', () => {
      const error = new TenantAccessDeniedError('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.TENANT_ACCESS_DENIED);
    });

    it('should be an instance of HttpError', () => {
      const error = new TenantAccessDeniedError('Access denied');
      expect(error).toBeInstanceOf(HttpError);
    });
  });

  describe('FiscalPeriodClosedError', () => {
    it('should have 409 status code', () => {
      const error = new FiscalPeriodClosedError({
        periodId: 'fp-001',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-03-31'),
        organizationId: 'org-001',
      });
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe(ErrorCode.FISCAL_PERIOD_CLOSED);
    });
  });

  describe('AppError', () => {
    it('should create an AppError with timestamp and requestId', () => {
      const error = new AppError({ message: 'App error', code: ErrorCode.INTERNAL_SERVER_ERROR, requestId: 'req-001' });
      expect(error.name).toBe('AppError');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.requestId).toBe('req-001');
    });
  });

  describe('Error Classification', () => {
    it('should correctly classify DomainError', () => {
      const error = new DomainError({ message: 'test', code: ErrorCode.VALIDATION_ERROR });
      expect(isDomainError(error)).toBe(true);
    });

    it('should correctly classify HttpError', () => {
      const error = new HttpError({ message: 'test', statusCode: 400, code: ErrorCode.BAD_REQUEST });
      expect(isHttpError(error)).toBe(true);
    });

    it('should correctly classify AppError', () => {
      const error = new AppError({ message: 'test', code: ErrorCode.INTERNAL_SERVER_ERROR });
      expect(isAppError(error)).toBe(true);
    });
  });

  describe('Error Normalization', () => {
    it('should normalize DomainError to AppError', () => {
      const domainError = new DomainError({ message: 'domain err', code: ErrorCode.VALIDATION_ERROR });
      const normalized = normalizeError(domainError);
      expect(normalized).toBeInstanceOf(AppError);
    });

    it('should pass through AppError instances', () => {
      const appError = new AppError({ message: 'app err', code: ErrorCode.BAD_REQUEST });
      const normalized = normalizeError(appError);
      expect(normalized).toBe(appError);
    });
  });
});
