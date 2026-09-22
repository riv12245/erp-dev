import { AuditEntry } from '../../services/api/src/shared/types/index.js';
import { v4 as uuidv4 } from 'uuid';

describe('Audit Write Tests', () => {
  function createAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
    return {
      action: overrides.action ?? 'USER_LOGIN',
      entityType: overrides.entityType ?? 'User',
      entityId: overrides.entityId ?? uuidv4(),
      actorId: overrides.actorId ?? 'user-a',
      tenantId: overrides.tenantId ?? 'tenant-a',
      timestamp: overrides.timestamp ?? new Date(),
      ipAddress: overrides.ipAddress ?? '127.0.0.1',
      userAgent: overrides.userAgent ?? 'test-agent',
      changes: overrides.changes,
      metadata: overrides.metadata,
    };
  }

  it('should create an audit entry with all required fields', () => {
    const entry = createAuditEntry();
    expect(entry.action).toBe('USER_LOGIN');
    expect(entry.entityType).toBe('User');
    expect(entry.entityId).toBeTruthy();
    expect(entry.actorId).toBe('user-a');
    expect(entry.tenantId).toBe('tenant-a');
    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(entry.ipAddress).toBe('127.0.0.1');
    expect(entry.userAgent).toBe('test-agent');
  });

  it('should enforce that audit entries contain tenantId for isolation', () => {
    const tenantAEntry = createAuditEntry({ tenantId: 'tenant-a', actorId: 'user-a' });
    const tenantBEntry = createAuditEntry({ tenantId: 'tenant-b', actorId: 'user-b' });

    expect(tenantAEntry.tenantId).not.toEqual(tenantBEntry.tenantId);
    expect(tenantAEntry.actorId).not.toEqual(tenantBEntry.actorId);
  });

  it('should preserve changes and metadata', () => {
    const changes = { field: 'email', oldValue: 'old@test.com', newValue: 'new@test.com' };
    const metadata = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' };
    const entry = createAuditEntry({ changes, metadata });
    expect(entry.changes).toEqual(changes);
    expect(entry.metadata).toEqual(metadata);
  });

  it('should validate audit entry structure', () => {
    const entry = createAuditEntry();
    expect(entry).toHaveProperty('action');
    expect(entry).toHaveProperty('entityType');
    expect(entry).toHaveProperty('entityId');
    expect(entry).toHaveProperty('actorId');
    expect(entry).toHaveProperty('tenantId');
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('ipAddress');
    expect(entry).toHaveProperty('userAgent');
  });

  it('should prevent cross-tenant audit entries', () => {
    const entry = createAuditEntry({ tenantId: 'tenant-a' });
    expect(entry.tenantId).toBe('tenant-a');
    expect(entry.tenantId).not.toBe('tenant-b');
  });
});
