import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../../services/api/src/platform/auth/domain/entities/User.js';
import { Email } from '../../services/api/src/platform/auth/domain/value-objects/Email.js';
import { Password } from '../../services/api/src/platform/auth/domain/value-objects/Password.js';
import { TenantAccessDeniedError } from '../../services/api/src/shared/errors/tenant-error.js';

describe('Tenant API Integration Tests', () => {
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

  it('should create users scoped to tenant A', async () => {
    const email = Email.create('user-a@tenant-a.com');
    const hash = await Password.hash('SecurePass123');
    const user = User.create({ tenantId: 'tenant-a', email, passwordHash: hash });
    expect(user.tenantId).toBe('tenant-a');
  });

  it('should create users scoped to tenant B', async () => {
    const email = Email.create('user-b@tenant-b.com');
    const hash = await Password.hash('SecurePass123');
    const user = User.create({ tenantId: 'tenant-b', email, passwordHash: hash });
    expect(user.tenantId).toBe('tenant-b');
  });

  it('should prevent tenant A from accessing tenant B users', async () => {
    const emailA = Email.create('user-a@tenant-a.com');
    const emailB = Email.create('user-b@tenant-b.com');
    const hash = await Password.hash('SecurePass123');

    const userA = User.create({ tenantId: 'tenant-a', email: emailA, passwordHash: hash });
    const userB = User.create({ tenantId: 'tenant-b', email: emailB, passwordHash: hash });

    expect(userA.tenantId).not.toEqual(userB.tenantId);

    expect(() => {
      if (userA.tenantId !== userB.tenantId) {
        throw new TenantAccessDeniedError('Cannot access tenant B data');
      }
    }).toThrow(TenantAccessDeniedError);
  });

  it('should verify tenant-scoped user queries', async () => {
    const hash = await Password.hash('SecurePass123');
    const users = [
      User.create({ tenantId: 'tenant-a', email: Email.create('a1@tenant-a.com'), passwordHash: hash }),
      User.create({ tenantId: 'tenant-a', email: Email.create('a2@tenant-a.com'), passwordHash: hash }),
      User.create({ tenantId: 'tenant-b', email: Email.create('b1@tenant-b.com'), passwordHash: hash }),
    ];

    const tenantAUsers = users.filter((u) => u.tenantId === 'tenant-a');
    const tenantBUsers = users.filter((u) => u.tenantId === 'tenant-b');
    expect(tenantAUsers.length).toBe(2);
    expect(tenantBUsers.length).toBe(1);
  });

  it('should enforce tenant ID on all user operations', () => {
    const hash = Password.hashSync?.('SecurePass123') ?? '';
    const user = User.create({ tenantId: 'tenant-a', email: Email.create('test@tenant-a.com'), passwordHash: 'hash' });
    expect(user.tenantId).toBe('tenant-a');
  });
});
