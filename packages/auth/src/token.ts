import { JwtPayload, signToken, verifyToken } from './jwt.js';

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresInSeconds: number;
  readonly refreshTokenExpiresInSeconds: number;
}

export interface TokenConfig {
  readonly accessSecret: string;
  readonly refreshSecret: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
  readonly refreshRotation: boolean;
}

/** Issues an access token for the given subject and context. */
export async function issueAccessToken(config: TokenConfig, subject: string, context: { tenantId?: string; companyId?: string; roles?: readonly string[] }): Promise<string> {
  return signToken({ sub: subject, tenantId: context.tenantId, companyId: context.companyId, roles: context.roles }, config.accessSecret, config.accessTtlSeconds);
}

/** Issues a refresh token. Includes a random jti so it can be revoked/rotated. */
export async function issueRefreshToken(config: TokenConfig, subject: string): Promise<string> {
  const jti = crypto.randomUUID();
  return signToken({ sub: subject, jti }, config.refreshSecret, config.refreshTtlSeconds);
}

/** Verifies an access token. */
export async function verifyAccessToken(config: TokenConfig, token: string): Promise<JwtPayload | null> {
  return verifyToken(token, config.accessSecret);
}

/** Verifies a refresh token. */
export async function verifyRefreshToken(config: TokenConfig, token: string): Promise<JwtPayload | null> {
  return verifyToken(token, config.refreshSecret);
}

/** Issues a full token pair. */
export async function issueTokenPair(config: TokenConfig, subject: string, context: { tenantId?: string; companyId?: string; roles?: readonly string[] }): Promise<TokenPair> {
  const accessToken = await issueAccessToken(config, subject, context);
  const refreshToken = await issueRefreshToken(config, subject);
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresInSeconds: config.accessTtlSeconds,
    refreshTokenExpiresInSeconds: config.refreshTtlSeconds,
  };
}