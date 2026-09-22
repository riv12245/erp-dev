export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly host: string;
  readonly apiPrefix: string;
  readonly mongoUri: string;
  readonly mongoDbName: string;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly jwtRefreshSecret: string;
  readonly jwtRefreshExpiresIn: string;
  readonly corsOrigins: readonly string[];
  readonly authBruteForceMax: number;
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
  readonly bcryptRounds: number;
  readonly logLevel: string;
  readonly observabilityEnabled: boolean;
  readonly tenantHeader: string;
  readonly outboxPollIntervalMs: number;
  readonly enableSeed: boolean;
}

const defaultConfig: AppConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  apiPrefix: '/api/v1',
  mongoUri: process.env.MONGODB_URI ?? '',
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'erp_dev',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-only-insecure-refresh',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  authBruteForceMax: Number(process.env.AUTH_BRUTE_FORCE_MAX ?? 5),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  observabilityEnabled: process.env.OBSERVABILITY_ENABLED === 'true',
  tenantHeader: process.env.TENANT_HEADER ?? 'x-tenant-id',
  outboxPollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000),
  enableSeed: process.env.SEED_DEV === 'true',
};

/** Loads configuration from environment variables with sane development defaults. */
export function loadConfig(): AppConfig {
  if (!Number.isSafeInteger(defaultConfig.authBruteForceMax) || defaultConfig.authBruteForceMax < 1) throw new Error('AUTH_BRUTE_FORCE_MAX must be a positive integer');
  if (defaultConfig.nodeEnv === 'production' && (!process.env.JWT_SECRET || defaultConfig.jwtSecret.length < 32 || defaultConfig.jwtSecret.startsWith('dev-only-'))) {
    throw new Error('Production requires an explicit JWT_SECRET of at least 32 characters');
  }
  return { ...defaultConfig };
}

export { getSecurityConfig } from './security.js';
export type { SecurityConfig } from './security.js';