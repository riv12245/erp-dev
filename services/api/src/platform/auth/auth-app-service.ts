import mongoose from 'mongoose';
import { validateRegister } from '@erp/validation';
import { AppError } from '../../shared/errors/app-error.js';
import { AuthDomainService } from './auth-service.js';
import { AuditService } from '../audit/audit-service.js';
import { resolveMembership } from '../iam/membership.js';
import { getUserModel } from './user-model.js';

export interface LoginResult {
  readonly accessToken: string;
  readonly user: { userId: string; email: string };
}

export interface RegisterInput {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
}

/**
 * Auth application service. Validates credentials, enforces brute-force
 * protection and issues access tokens. Passwords are never returned.
 */
export class AuthService {
  constructor(
    private readonly connection: mongoose.Connection,
    private readonly authDomain: AuthDomainService,
    private readonly accessTtlSeconds: number,
    private readonly bruteForceMax: number,
  ) {}

  async register(input: RegisterInput): Promise<{ userId: string; email: string }> {
    const validation = validateRegister(input);
    if (!validation.ok) throw AppError.validation('Invalid registration', { errors: validation.errors });
    const User = getUserModel(this.connection);
    const existing = await User.findOne({ email: input.email.toLowerCase() }).exec();
    if (existing) throw AppError.conflict('Email already registered');
    const passwordHash = await this.authDomain.hashPlainPassword(input.password);
    const created = await User.create({
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      status: 'active',
      failedLoginAttempts: 0,
    });
    return { userId: String((created as { _id: unknown })._id), email: input.email };
  }

  async login(email: string, password: string, tenantId: string): Promise<LoginResult> {
    const User = getUserModel(this.connection);

    const user = await User.findOne({ email: email.toLowerCase() }).exec();
    if (!user) throw AppError.unauthorized('Invalid credentials');

    if (user.status === 'locked' && (!user.lockedUntil || user.lockedUntil > new Date())) {
      throw AppError.unauthorized('Invalid credentials');
    }
    if (user.status === 'suspended') throw AppError.unauthorized('Invalid credentials');

    const valid = await this.authDomain.verifyPlainPassword(password, user.passwordHash);
    if (!valid) {
      // Pipeline update keeps counting atomic across concurrent password checks.
      const updated = await User.findOneAndUpdate(
        { _id: user._id, status: { $ne: 'suspended' } },
        [
          { $set: { failedLoginAttempts: { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] } } },
          { $set: {
            status: { $cond: [{ $gte: ['$failedLoginAttempts', this.bruteForceMax] }, 'locked', '$status'] },
            lockedUntil: { $cond: [{ $gte: ['$failedLoginAttempts', this.bruteForceMax] }, new Date(Date.now() + 15 * 60 * 1000), '$lockedUntil'] },
          } },
        ], { new: true },
      );
      if (updated?.status === 'locked') await new AuditService(this.connection).record({ tenantId, actorId: user._id.toString(), action: 'auth.login.blocked', entityType: 'user' });
      throw AppError.unauthorized('Invalid credentials');
    }

    const grants = await resolveMembership(this.connection, user._id.toString(), tenantId);
    const accepted = await User.updateOne({ _id: user._id, $or: [{ status: 'active' }, { status: 'locked', lockedUntil: { $lte: new Date() } }] }, { $set: { status: 'active', failedLoginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: 1 } });
    if (accepted.matchedCount !== 1) throw AppError.unauthorized('Invalid credentials');
    await new AuditService(this.connection).record({ tenantId, actorId: user._id.toString(), action: 'auth.login.succeeded', entityType: 'user' });
    const accessToken = await this.authDomain.issueAccessToken(
      { userId: user._id.toString(), email: user.email, tenantId, roles: grants.roles },
      this.accessTtlSeconds,
    );

    return { accessToken, user: { userId: user._id.toString(), email: user.email } };
  }
}
