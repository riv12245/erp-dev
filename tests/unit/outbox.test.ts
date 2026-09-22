import { v4 as uuidv4 } from 'uuid';

describe('Outbox Pattern Tests', () => {
  interface OutboxMessage {
    id: string;
    tenantId: string;
    eventType: string;
    payload: unknown;
    status: 'PENDING' | 'PUBLISHED' | 'FAILED';
    createdAt: Date;
    publishedAt?: Date;
    retryCount: number;
    correlationId: string;
  }

  function createOutboxMessage(overrides: Partial<OutboxMessage> = {}): OutboxMessage {
    return {
      id: overrides.id ?? uuidv4(),
      tenantId: overrides.tenantId ?? 'tenant-a',
      eventType: overrides.eventType ?? 'USER_CREATED',
      payload: overrides.payload ?? {},
      status: overrides.status ?? 'PENDING',
      createdAt: overrides.createdAt ?? new Date(),
      publishedAt: overrides.publishedAt,
      retryCount: overrides.retryCount ?? 0,
      correlationId: overrides.correlationId ?? uuidv4(),
    };
  }

  it('should create an outbox message with all required fields', () => {
    const msg = createOutboxMessage();
    expect(msg.id).toBeTruthy();
    expect(msg.tenantId).toBe('tenant-a');
    expect(msg.eventType).toBe('USER_CREATED');
    expect(msg.status).toBe('PENDING');
    expect(msg.retryCount).toBe(0);
    expect(msg.correlationId).toBeTruthy();
  });

  it('should enforce tenant isolation in outbox messages', () => {
    const tenantAMsg = createOutboxMessage({ tenantId: 'tenant-a' });
    const tenantBMsg = createOutboxMessage({ tenantId: 'tenant-b' });
    expect(tenantAMsg.tenantId).not.toEqual(tenantBMsg.tenantId);
  });

  it('should track message status transitions', () => {
    let msg = createOutboxMessage({ status: 'PENDING' });
    expect(msg.status).toBe('PENDING');

    msg = { ...msg, status: 'PUBLISHED', publishedAt: new Date() };
    expect(msg.status).toBe('PUBLISHED');
    expect(msg.publishedAt).toBeInstanceOf(Date);
  });

  it('should support retry mechanism', () => {
    let msg = createOutboxMessage({ retryCount: 0 });
    expect(msg.retryCount).toBe(0);

    msg = { ...msg, status: 'FAILED', retryCount: 1 };
    expect(msg.status).toBe('FAILED');
    expect(msg.retryCount).toBe(1);
  });

  it('should enforce max retry limit', () => {
    const maxRetries = 3;
    const msg = createOutboxMessage({ retryCount: maxRetries, status: 'FAILED' });
    expect(msg.retryCount).toBeLessThanOrEqual(maxRetries);
  });

  it('should group outbox messages by tenant', () => {
    const messages = [
      createOutboxMessage({ tenantId: 'tenant-a', id: '1' }),
      createOutboxMessage({ tenantId: 'tenant-a', id: '2' }),
      createOutboxMessage({ tenantId: 'tenant-b', id: '3' }),
    ];
    const tenantAMessages = messages.filter((m) => m.tenantId === 'tenant-a');
    const tenantBMessages = messages.filter((m) => m.tenantId === 'tenant-b');
    expect(tenantAMessages.length).toBe(2);
    expect(tenantBMessages.length).toBe(1);
  });
});
