import { createHash, randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { AppError } from '../../shared/errors/app-error.js';
import { AuthDomainService } from './auth-service.js';
import { SessionRecord, SessionRepository } from './session-repository.js';
import { getUserModel } from './user-model.js';
import { resolveMembership } from '../iam/membership.js';
import { AuditService } from '../audit/audit-service.js';

export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly expiresIn: number;
  readonly refreshExpiresAt: Date;
  readonly user: { userId: string; email: string };
}
const hash = (token: string): string => createHash('sha256').update(token).digest('hex');
const tokenFor = (sessionId: string): string => `${sessionId}.${randomBytes(32).toString('base64url')}`;
const parse = (token: string): string | null => /^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/.test(token) ? token.slice(0, 36) : null;

export class SessionService {
  private readonly repository: SessionRepository;
  constructor(private readonly connection: mongoose.Connection, private readonly domain: AuthDomainService, private readonly accessTtl: number, private readonly refreshTtl: number) {
    this.repository = new SessionRepository(connection);
  }
  async create(userId: string, tenantId: string, authVersion: number): Promise<SessionTokens> {
    const now = new Date();
    const sessionId = randomUUID();
    const refreshToken = tokenFor(sessionId);
    const expiresAt = new Date(now.getTime() + this.refreshTtl * 1000);
    const record: SessionRecord = { sessionId, userId, tenantId, authVersion, refreshHash: hash(refreshToken), usedRefreshHashes: [], generation: 0, expiresAt, purgeAt: new Date(expiresAt.getTime() + 7 * 86400_000), lastRotatedAt: now };
    await this.repository.create(record);
    return this.issue(record, refreshToken);
  }
  private async identity(record: SessionRecord) {
    const user = await getUserModel(this.connection).findById(record.userId).exec();
    if (!user || user.status !== 'active' || (user.authVersion ?? 0) !== record.authVersion) throw AppError.unauthorized('Session expired');
    const grants = await resolveMembership(this.connection, record.userId, record.tenantId);
    return { user, grants };
  }
  private async issue(record: SessionRecord, refreshToken: string): Promise<SessionTokens> {
    const { user, grants } = await this.identity(record);
    const accessToken = await this.domain.issueAccessToken({ userId: record.userId, email: user.email, tenantId: record.tenantId, sessionId: record.sessionId, roles: grants.roles }, this.accessTtl);
    return { accessToken, refreshToken, sessionId: record.sessionId, tenantId: record.tenantId, expiresIn: this.accessTtl, refreshExpiresAt: record.expiresAt, user: { userId: record.userId, email: user.email } };
  }
  async refresh(token: string, correlationId?: string): Promise<SessionTokens> {
    const sessionId = parse(token);
    if (!sessionId) throw AppError.unauthorized('Invalid session');
    const record = await this.repository.find(sessionId);
    if (!record || record.revokedAt || record.expiresAt <= new Date()) throw AppError.unauthorized('Invalid session');
    const incoming = hash(token);
    if (record.usedRefreshHashes.includes(incoming)) {
      await this.repository.revoke(sessionId);
      await this.audit(record, 'auth.refresh.reused', correlationId);
      throw AppError.unauthorized('Invalid session');
    }
    if (record.refreshHash !== incoming) throw AppError.unauthorized('Invalid session');
    await this.identity(record);
    if (record.generation >= 512) {
      await this.repository.revoke(sessionId);
      throw AppError.unauthorized('Session expired');
    }
    const next = tokenFor(sessionId);
    const rotated = await this.repository.rotate(sessionId, incoming, hash(next));
    if (!rotated) {
      const current = await this.repository.find(sessionId);
      if (current?.usedRefreshHashes.includes(incoming)) {
        await this.repository.revoke(sessionId);
        await this.audit(current, 'auth.refresh.reused', correlationId);
      }
      throw AppError.unauthorized('Invalid session');
    }
    await this.audit(rotated, 'auth.refresh.succeeded', correlationId);
    return this.issue(rotated, next);
  }
  async logout(token: string, correlationId?: string): Promise<void> {
    const sessionId = parse(token);
    if (!sessionId) return;
    const record = await this.repository.find(sessionId);
    const incoming = hash(token);
    if (!record || (record.refreshHash !== incoming && !record.usedRefreshHashes.includes(incoming))) return;
    await this.repository.revoke(sessionId);
    await this.audit(record, 'auth.logout', correlationId);
  }
  async logoutAll(userId: string, tenantId: string, correlationId?: string): Promise<void> {
    // Global identity operation intentionally spans this user's tenants. The epoch also
    // fences a concurrent login/refresh that read the old value before this write.
    const user = await getUserModel(this.connection).findByIdAndUpdate(userId, { $inc: { authVersion: 1 } }, { new: true });
    if (!user) throw AppError.unauthorized();
    await this.repository.revokeOlderUserSessions(userId, user.authVersion);
    await new AuditService(this.connection).record({ tenantId, actorId: userId, action: 'auth.logout.all', entityType: 'session', correlationId });
  }
  private async audit(record: SessionRecord, action: string, correlationId?: string): Promise<void> {
    await new AuditService(this.connection).record({ tenantId: record.tenantId, actorId: record.userId, action, entityType: 'session', entityId: record.sessionId, correlationId });
  }
}
