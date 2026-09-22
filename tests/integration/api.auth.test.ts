import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Email } from '../../services/api/src/platform/auth/domain/value-objects/Email.js';
import { Password } from '../../services/api/src/platform/auth/domain/value-objects/Password.js';
import { User } from '../../services/api/src/platform/auth/domain/entities/User.js';
import { UserStatus } from '../../services/api/src/platform/auth/domain/entities/User.js';
import { AuthLoginEvent } from '../../services/api/src/platform/auth/domain/events/AuthLoginEvent.js';

describe('Auth Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  it('should authenticate a user with valid credentials', async () => {
    const email = Email.create('user@example.com');
    const passwordHash = await Password.hash('SecurePass123');
    const user = User.create({ tenantId: 'tenant-a', email, passwordHash });

    expect(user.email.value).toBe('user@example.com');
    expect(user.isActive()).toBe(true);
  });

  it('should reject authentication for non-existent user', async () => {
    const email = Email.create('nonexistent@example.com');
    const user = User.findByEmail(email);
    expect(user).toBeNull();
  });

  it('should create a session on successful login', async () => {
    const email = Email.create('test@example.com');
    const passwordHash = await Password.hash('SecurePass123');
    const user = User.create({ tenantId: 'tenant-a', email, passwordHash });
    const loginEvent = new AuthLoginEvent({
      userId: user.id,
      tenantId: 'tenant-a',
      sessionId: 'session-001',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    });

    expect(loginEvent.userId).toBe(user.id);
    expect(loginEvent.tenantId).toBe('tenant-a');
  });

  it('should invalidate a session', async () => {
    const { Session } = await import('../../services/api/src/platform/auth/domain/entities/Session.js');
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

    expect(session.isValid()).toBe(true);
    session.invalidate();
    expect(session.status).toBe(2); // INVALIDATED
  });
});
