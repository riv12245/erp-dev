import { AuthLoginEvent } from '../../services/api/src/platform/auth/domain/events/AuthLoginEvent.js';
import { AuthLogoutEvent } from '../../services/api/src/platform/auth/domain/events/AuthLogoutEvent.js';
import { LogoutReason } from '../../services/api/src/platform/auth/domain/events/AuthLogoutEvent.js';

describe('Domain Event Tests', () => {
  const baseProps = {
    userId: 'user-001',
    tenantId: 'tenant-a',
    sessionId: 'session-001',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
  };

  describe('AuthLoginEvent', () => {
    it('should create a login event with all properties', () => {
      const event = new AuthLoginEvent(baseProps);
      expect(event.userId).toBe('user-001');
      expect(event.tenantId).toBe('tenant-a');
      expect(event.sessionId).toBe('session-001');
      expect(event.ipAddress).toBe('127.0.0.1');
      expect(event.userAgent).toBe('Mozilla/5.0');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should set custom timestamp if provided', () => {
      const customTime = new Date('2024-01-15T10:30:00Z');
      const event = new AuthLoginEvent({ ...baseProps, timestamp: customTime });
      expect(event.timestamp).toEqual(customTime);
    });

    it('should have correct event structure', () => {
      const event = new AuthLoginEvent(baseProps);
      expect(event).toHaveProperty('userId');
      expect(event).toHaveProperty('tenantId');
      expect(event).toHaveProperty('sessionId');
      expect(event).toHaveProperty('timestamp');
      expect(typeof event.timestamp.getTime()).toBe('number');
    });
  });

  describe('AuthLogoutEvent', () => {
    it('should create a logout event with reason', () => {
      const event = new AuthLogoutEvent({ ...baseProps, reason: LogoutReason.EXPLICIT });
      expect(event.reason).toBe(LogoutReason.EXPLICIT);
      expect(event.userId).toBe('user-001');
      expect(event.tenantId).toBe('tenant-a');
      expect(event.sessionId).toBe('session-001');
    });

    it('should support all logout reasons', () => {
      const reasons = [LogoutReason.EXPLICIT, LogoutReason.SESSION_EXPIRED, LogoutReason.ADMIN_FORCED, LogoutReason.SECURITY];
      reasons.forEach((reason) => {
        const event = new AuthLogoutEvent({ ...baseProps, reason });
        expect(event.reason).toBe(reason);
      });
    });

    it('should have correct event structure', () => {
      const event = new AuthLogoutEvent({ ...baseProps, reason: LogoutReason.SECURITY });
      expect(event).toHaveProperty('reason');
      expect(event).toHaveProperty('timestamp');
    });
  });

  describe('Event Tenant Isolation', () => {
    it('should ensure login events are scoped to the correct tenant', () => {
      const tenantAEvent = new AuthLoginEvent({ ...baseProps, tenantId: 'tenant-a' });
      const tenantBEvent = new AuthLoginEvent({ ...baseProps, tenantId: 'tenant-b' });
      expect(tenantAEvent.tenantId).not.toEqual(tenantBEvent.tenantId);
    });

    it('should ensure logout events are scoped to the correct tenant', () => {
      const tenantAEvent = new AuthLogoutEvent({ ...baseProps, tenantId: 'tenant-a', reason: LogoutReason.EXPLICIT });
      const tenantBEvent = new AuthLogoutEvent({ ...baseProps, tenantId: 'tenant-b', reason: LogoutReason.SECURITY });
      expect(tenantAEvent.tenantId).not.toEqual(tenantBEvent.tenantId);
      expect(tenantAEvent.reason).not.toEqual(tenantBEvent.reason);
    });
  });
});
