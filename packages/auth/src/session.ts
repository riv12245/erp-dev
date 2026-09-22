import { TokenConfig, TokenPair, issueTokenPair, verifyAccessToken, verifyRefreshToken } from './token.js';

export interface SessionInfo {
  readonly sessionId: string;
  readonly userId: string;
  readonly createdAt: number;
  readonly lastActivityAt: number;
  readonly deviceId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export interface SessionStore {
  readonly saveSession: (session: SessionInfo) => Promise<void>;
  readonly getSession: (sessionId: string) => Promise<SessionInfo | null>;
  readonly touchSession: (sessionId: string) => Promise<void>;
  readonly revokeSession: (sessionId: string) => Promise<void>;
}

/**
 * Issues tokens and records a session (device/refresh aware).
 * Returns null when refresh rotation is requested but not handled here.
 */
export async function createSession(config: TokenConfig, store: SessionStore, sessionId: string, userId: string, context: { tenantId?: string; companyId?: string; roles?: readonly string[] }, meta: { deviceId?: string; ipAddress?: string; userAgent?: string }): Promise<TokenPair> {
  const now = Date.now();
  await store.saveSession({ sessionId, userId, createdAt: now, lastActivityAt: now, deviceId: meta.deviceId, ipAddress: meta.ipAddress, userAgent: meta.userAgent });
  return issueTokenPair(config, userId, context);
}

/** Refreshes tokens for an ongoing session, rotating the refresh token. */
export async function rotateSession(config: TokenConfig, store: SessionStore, sessionId: string, refreshToken: string, userId: string, context: { tenantId?: string; companyId?: string; roles?: readonly string[] }): Promise<TokenPair | null> {
  const valid = await verifyRefreshToken(config, refreshToken);
  if (!valid || valid.sub !== userId) return null;
  const existing = await store.getSession(sessionId);
  if (!existing || existing.userId !== userId) return null;
  await store.touchSession(sessionId);
  return issueTokenPair(config, userId, context);
}

export { issueTokenPair, verifyAccessToken, verifyRefreshToken };
export type { TokenConfig, TokenPair } from './token.js';