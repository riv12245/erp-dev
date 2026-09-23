import type { Request, Response } from 'express';
import type { AppConfig } from '../../config/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { SessionTokens } from './session-service.js';

const cookieName = 'erp_refresh';
/** Cookie-authenticated writes require an explicit trusted Origin, even on same-site subdomains. */
export function sessionClient(req: Request, config: AppConfig): 'web' | 'native' {
  const client = req.get('x-session-client') ?? 'native';
  if (client !== 'web' && client !== 'native') throw AppError.validation('Invalid session client');
  const origin = req.get('origin');
  if (client === 'web') {
    if (!origin || !config.corsOrigins.includes(origin)) throw AppError.forbidden('Origin not allowed');
  } else if (origin) {
    throw AppError.forbidden('Browser sessions must use cookies');
  }
  return client;
}
export function readRefresh(req: Request, config: AppConfig): string {
  if (sessionClient(req, config) === 'web') {
    const cookies = (req.get('cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(cookieName + '='));
    if (cookies.length !== 1) throw AppError.unauthorized('Invalid session');
    return cookies[0].slice(cookieName.length + 1);
  }
  const token: unknown = (req.body as Record<string, unknown> | undefined)?.refreshToken;
  if (typeof token !== 'string' || token.length > 128) throw AppError.unauthorized('Invalid session');
  return token;
}
function cookieOptions(config: AppConfig) {
  return { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'strict' as const, path: `${config.apiPrefix}/auth` };
}
export function clearRefresh(res: Response, config: AppConfig): void {
  res.clearCookie(cookieName, cookieOptions(config));
}
export function presentSession(req: Request, res: Response, config: AppConfig, tokens: SessionTokens) {
  const { refreshToken, refreshExpiresAt, ...publicTokens } = tokens;
  if (sessionClient(req, config) === 'web') {
    res.cookie(cookieName, refreshToken, { ...cookieOptions(config), expires: refreshExpiresAt });
    return publicTokens;
  }
  return { ...publicTokens, refreshToken };
}
