export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly host: string;
  readonly apiPrefix: string;
  readonly mongoUri: string;
  readonly mongoDbName: string;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly jwtRefreshExpiresIn: string;
  readonly corsOrigins: readonly string[];
  readonly authBruteForceMax: number;
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
  readonly logLevel: string;
  readonly observabilityEnabled: boolean;
  readonly tenantHeader: string;
  readonly outboxPollIntervalMs: number;
  readonly enableSeed: boolean;
}

function readConfig(): AppConfig { return {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  apiPrefix: '/api/v1',
  mongoUri: process.env.MONGODB_URI ?? '',
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'erp_dev',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  authBruteForceMax: Number(process.env.AUTH_BRUTE_FORCE_MAX ?? 5),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  observabilityEnabled: process.env.OBSERVABILITY_ENABLED === 'true',
  tenantHeader: process.env.TENANT_HEADER ?? 'x-tenant-id',
  outboxPollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000),
  enableSeed: process.env.SEED_DEV === 'true',
}; }

export function durationSeconds(value: string, variable: string, maximum: number): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const seconds = match ? Number(match[1]) * multipliers[match[2]] : 0;
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > maximum) throw new Error(`${variable} must be a positive duration (s/m/h/d), at most ${maximum} seconds`);
  return seconds;
}

/** Loads configuration from environment variables with sane development defaults. */
export function loadConfig(): AppConfig {
  const defaultConfig = readConfig();
  if (!Number.isSafeInteger(defaultConfig.authBruteForceMax) || defaultConfig.authBruteForceMax < 1) throw new Error('AUTH_BRUTE_FORCE_MAX must be a positive integer');
  if (defaultConfig.jwtSecret.length < 32 || /^(dev-only-|change-me)/i.test(defaultConfig.jwtSecret)) {
    throw new Error('JWT_SECRET must be an explicit random secret of at least 32 characters; placeholders are forbidden');
  }
  for (const [key, value, min, max] of [
    ['PORT', defaultConfig.port, defaultConfig.nodeEnv === 'test' ? 0 : 1, 65535],
    ['RATE_LIMIT_MAX', defaultConfig.rateLimitMax, 1, 1000000],
    ['RATE_LIMIT_WINDOW_MS', defaultConfig.rateLimitWindowMs, 1, 2147483647],
    ['OUTBOX_POLL_INTERVAL_MS', defaultConfig.outboxPollIntervalMs, 1, 2147483647],
    ['MONGO_POOL_SIZE', Number(process.env.MONGO_POOL_SIZE ?? 20), 1, 1000],
    ['MONGO_MIN_POOL_SIZE', Number(process.env.MONGO_MIN_POOL_SIZE ?? 1), 0, Number(process.env.MONGO_POOL_SIZE ?? 20)],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }
  durationSeconds(defaultConfig.jwtExpiresIn, 'JWT_EXPIRES_IN', 86400);
  durationSeconds(defaultConfig.jwtRefreshExpiresIn, 'JWT_REFRESH_EXPIRES_IN', 30 * 86400);
  if (!/^mongodb(?:\+srv)?:\/\//.test(defaultConfig.mongoUri)) throw new Error('MONGODB_URI must be configured with a MongoDB URI');
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(defaultConfig.mongoDbName)) throw new Error('MONGODB_DB_NAME must be a simple database name');
  if (!defaultConfig.corsOrigins.length || defaultConfig.corsOrigins.some(origin => {
    try { const parsed = new URL(origin); return parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol) || (defaultConfig.nodeEnv === 'production' && parsed.protocol !== 'https:'); }
    catch { return true; }
  })) throw new Error('CORS_ORIGIN must contain exact http(s) origins, HTTPS in production');
  if (!/^[a-z0-9-]+$/.test(defaultConfig.tenantHeader)) throw new Error('TENANT_HEADER must be a lowercase HTTP header name');
  return { ...defaultConfig };
}

export { getSecurityConfig } from './security.js';
export type { SecurityConfig } from './security.js';
