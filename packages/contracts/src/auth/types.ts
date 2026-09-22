/**
 * Authentication contract types for the ERP platform.
 */

/** Represents a user in the system */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Represents an active user session */
export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly userAgent: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly isActive: boolean;
  readonly ipAddress: string;
}

/** Represents a pair of access and refresh tokens */
export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshTokenExpiresAt: string;
  readonly tokenType: "Bearer";
}

/** Payload contained within a JWT access token */
export interface AccessTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: string;
  readonly tenantId: string;
  readonly exp: number;
  readonly iat: number;
  readonly jti: string;
}

/** Payload contained within a refresh token */
export interface RefreshTokenPayload {
  readonly sub: string;
  readonly sessionId: string;
  readonly exp: number;
  readonly jti: string;
}
