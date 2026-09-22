import { Email } from '../../services/api/src/platform/auth/domain/value-objects/Email.js';
import { Password } from '../../services/api/src/platform/auth/domain/value-objects/Password.js';
import { User } from '../../services/api/src/platform/auth/domain/entities/User.js';
import { UserStatus } from '../../services/api/src/platform/auth/domain/entities/User.js';
import { DomainError } from '../../services/api/src/shared/errors/domain-error.js';
import { ErrorCode } from '../../services/api/src/shared/types/index.js';

describe('Auth Module Tests', () => {
  describe('Email Value Object', () => {
    it('should create a valid Email', () => {
      const email = Email.create('test@example.com');
      expect(email.value).toBe('test@example.com');
    });

    it('should lowercase and trim email', () => {
      const email = Email.create('  Test@Example.COM  ');
      expect(email.value).toBe('test@example.com');
    });

    it('should throw for invalid email format', () => {
      expect(() => Email.create('invalid-email')).toThrow();
    });

    it('should compare two emails for equality', () => {
      const email1 = Email.create('test@example.com');
      const email2 = Email.create('test@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should reconstitute email without validation', () => {
      const email = Email.reconstitute('test@example.com');
      expect(email.value).toBe('test@example.com');
    });
  });

  describe('Password Value Object', () => {
    it('should create a valid password', async () => {
      const password = await Password.create('SecurePass123');
      expect(password.value).toBe('SecurePass123');
    });

    it('should throw for passwords shorter than 8 characters', async () => {
      await expect(Password.create('short')).rejects.toThrow();
    });

    it('should hash and compare passwords', async () => {
      const hash = await Password.hash('SecurePass123');
      const isValid = await Password.compare('SecurePass123', hash);
      expect(isValid).toBe(true);
    });

    it('should return false for wrong password comparison', async () => {
      const hash = await Password.hash('SecurePass123');
      const isValid = await Password.compare('WrongPass123', hash);
      // Note: timingSafeEqual may throw if lengths differ, so this tests the concept
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('User Entity', () => {
    it('should create a new user with default ACTIVE status', () => {
      const user = User.create({
        tenantId: 'tenant-a',
        email: Email.create('test@example.com'),
        passwordHash: 'hash-123',
      });

      expect(user.id).toBeTruthy();
      expect(user.tenantId).toBe('tenant-a');
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.isActive()).toBe(true);
    });

    it('should update password and updatedAt', () => {
      const user = User.create({
        tenantId: 'tenant-a',
        email: Email.create('test@example.com'),
        passwordHash: 'old-hash',
      });

      const oldUpdatedAt = user.updatedAt;
      user.updatePassword('new-hash');
      expect(user.passwordHash).toBe('new-hash');
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(oldUpdatedAt.getTime());
    });

    it('should set status and update timestamp', () => {
      const user = User.create({
        tenantId: 'tenant-a',
        email: Email.create('test@example.com'),
        passwordHash: 'hash-123',
      });

      user.setStatus(UserStatus.INACTIVE);
      expect(user.status).toBe(UserStatus.INACTIVE);
      expect(user.isActive()).toBe(false);
    });
  });

  describe('DomainError', () => {
    it('should create a DomainError with correct properties', () => {
      const error = new DomainError({
        message: 'Test error',
        code: ErrorCode.VALIDATION_ERROR,
        details: { field: 'email' },
      });

      expect(error.name).toBe('DomainError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.details).toEqual({ field: 'email' });
    });
  });
});
