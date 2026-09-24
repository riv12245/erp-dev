import { hashPassword, verifyPassword, serializeHash, parseHash, signToken, verifyToken, PasswordHash } from '@erp/auth';

export interface AuthTokenPayload {
  readonly userId: string;
  readonly email: string;
  readonly tenantId?: string;
  readonly roles?: readonly string[];
  readonly sessionId?: string;
}

/** Domain service coordinating hashing, token issuance and verification. */
export class AuthDomainService {
  constructor(private readonly jwtSecret: string) {}

  async hashPlainPassword(plain: string): Promise<string> {
    const hash = await hashPassword(plain);
    return serializeHash(hash);
  }

  async verifyPlainPassword(plain: string, stored: string): Promise<boolean> {
    const parsed = parseHash(stored);
    if (!parsed) return false;
    return verifyPassword(plain, parsed);
  }

  issueAccessToken(payload: AuthTokenPayload, ttlSeconds: number): Promise<string> {
    return signToken(
      {
        sub: payload.userId,
        tenantId: payload.tenantId,
        roles: payload.roles,
        sid: payload.sessionId,
      },
      this.jwtSecret,
      ttlSeconds,
    );
  }

  async verify(token: string): Promise<AuthTokenPayload | null> {
    const payload = await verifyToken(token, this.jwtSecret);
    if (!payload) return null;
    return {
      userId: payload.sub,
      email: '',
      tenantId: payload.tenantId,
      roles: payload.roles ?? [],
      sessionId: payload.sid,
    };
  }
}

export type { PasswordHash };
