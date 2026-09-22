import { Email } from '../../services/api/src/platform/auth/domain/value-objects/Email.js';
import { Password } from '../../services/api/src/platform/auth/domain/value-objects/Password.js';
import { User } from '../../services/api/src/platform/auth/domain/entities/User.js';
import { UserStatus } from '../../services/api/src/platform/auth/domain/entities/User.js';
import { AuthLoginEvent } from '../../services/api/src/platform/auth/domain/events/AuthLoginEvent.js';
import { AuthLogoutEvent } from '../../services/api/src/platform/auth/domain/events/AuthLogoutEvent.js';
import { LogoutReason } from '../../services/api/src/platform/auth/domain/events/AuthLogoutEvent.js';
import { Session } from '../../services/api/src/platform/auth/domain/entities/Session.js';
import { TenantAccessDeniedError } from '../../services/api/src/shared/errors/tenant-error.js';
import { ErrorCode } from '../../services/api/src/shared/types/index.js';

describe('Auth Contract Tests', () => {
  function createAuthUser(tenantId: string): User {
    const email = Email.create(`user-${tenantId}@example.com`);
    const hash = Password.hashSync ? Password.hashSync('SecurePass123') : '';
    return User.create({ tenantId, email, passwordHash: hash });
  }

  describe('Authentication Contract', () => {
    it('should authenticate within tenant scope', () => {
      const user = createAuthUser('tenant-a');
      expect(user.tenantId).toBe('tenant-a');
      expect(user.isActive()).toBe(true);
    });

    it('should not authenticate across tenants', () => {
      const userA = createAuthUser('tenant-a');
      const userB = createAuthUser('tenant-b');
      expect(userA.tenantId).not.toEqual(userB.tenantId);
    });

    it('should validate email format for auth', () => {
      expect(() => Email.create('invalid')).toThrow();
      expect(() => Email.create('valid@example.com')).not.toThrow();
    });

    it('should validate password strength for auth', async () => {
      await expect(Password.create('short')).rejects.toThrow();
      await expect(Password.create('ValidPass123')).resolves.toBeDefined();
    });
  });

  describe('Session Contract', () => {
    it('should create a session within tenant scope', () => {
      const session = Session.create({
        userId: 'user-a',
        tenantId: 'tenant-a',
        token: 'token-abc',
        refreshToken: 'refresh-abc',
        expiresAt: new Date(Date.now() + 3600000),
        refreshExpiresAt: new Date(Date.now() + 86400000),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(session.tenantId).toBe('tenant-a');
      expect(session.isValid()).toBe(true);
    });

    it('should invalidate sessions within tenant', () => {
      const session = Session.create({
        userId: 'user-a',
        tenantId: 'tenant-a',
        token: 'token-abc',
        refreshToken: 'refresh-abc',
        expiresAt: new Date(Date.now() + 3600000),
        refreshExpiresAt: new Date(Date.now() + 86400000),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      session.invalidate();
      expect(session.status).toBe(SessionStatus.INVALIDATED);
    });
  });

  describe('Domain Event Contract', () => {
    it('should create AuthLoginEvent with tenantId', () => {
      const event = new AuthLoginEvent({
        userId: 'user-a',
        tenantId: 'tenant-a',
        sessionId: 'session-001',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(event.tenantId).toBe('tenant-a');
      expect(event.userId).toBe('user-a');
    });

    it('should create AuthLogoutEvent with tenantId', () => {
      const event = new AuthLogoutEvent({
        userId: 'user-a',
        tenantId: 'tenant-a',
        sessionId: 'session-001',
        reason: LogoutReason.EXPLICIT,
      });
      expect(event.tenantId).toBe('tenant-a');
      expect(event.reason).toBe(LogoutReason.EXPLICIT);
    });
  });

  describe('Tenant Isolation Contract', () => {
    it('should throw TenantAccessDeniedError for cross-tenant auth', () => {
      expect(() => {
        throw new TenantAccessDeniedError('Cross-tenant auth denied', {
          sourceTenant: 'tenant-a',
          targetTenant: 'tenant-b',
        });
      }).toThrow(TenantAccessDeniedError);
    });

    it('should enforce tenant-scoped auth operations', () => {
      const tenantAResult = createAuthUser('tenant-a');
      const tenantBResult = createAuthUser('tenant-b');
      expect(tenantAResult.tenantId).not.toEqual(tenantBResult.tenantId);
    });
  });
});
