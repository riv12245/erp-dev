/**
 * JWT utilities using Web Crypto (HMAC-SHA256).
 * Dependency-free. Supports the HS256 algorithm with a symmetric secret.
 */

export interface JwtPayload {
  readonly sub: string;
  readonly tenantId?: string;
  readonly companyId?: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly iat: number;
  readonly exp: number;
  readonly jti?: string;
}

export interface JwtHeader {
  readonly typ: 'JWT';
  readonly alg: 'HS256';
}

export interface JwtDecodeResult {
  readonly header: JwtHeader;
  readonly payload: JwtPayload;
  readonly signature: string;
}

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

/** Creates a signed JWT with a fixed expiration in seconds. */
export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const header: JwtHeader = { typ: 'JWT', alg: 'HS256' };
  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(full));
  const signature = await sign(`${headerPart}.${payloadPart}`, secret);
  return `${headerPart}.${payloadPart}.${signature}`;
}

/** Verifies a JWT token and returns its payload when valid, otherwise null. */
export async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signature] = parts;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart))) as JwtHeader;
    if (header?.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, new Uint8Array(base64UrlDecode(signature)), new TextEncoder().encode(headerPart + '.' + payloadPart))) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart))) as JwtPayload;
    if (!payload || typeof payload.sub !== 'string' || !payload.sub.trim()) return null;
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now() || !Number.isFinite(payload.iat)) return null;
    if (payload.tenantId !== undefined && (typeof payload.tenantId !== 'string' || !payload.tenantId.trim())) return null;
    if (payload.roles !== undefined && (!Array.isArray(payload.roles) || !payload.roles.every(role => typeof role === 'string'))) return null;
    if (payload.permissions !== undefined && (!Array.isArray(payload.permissions) || !payload.permissions.every(permission => typeof permission === 'string'))) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Decodes the payload of a JWT WITHOUT verifying (use only for introspection). */
export function decodeToken(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as JwtPayload;
  } catch {
    return null;
  }
}