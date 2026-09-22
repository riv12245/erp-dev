import { AppConfig } from './index.js';

export interface SecurityConfig {
  readonly helmet: Record<string, unknown>;
  readonly cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
  };
  readonly rateLimit: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
}

export function getSecurityConfig(config: AppConfig): SecurityConfig {
  return {
    helmet: {
      contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    },
    cors: {
      origin: [...config.corsOrigins],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    },
    rateLimit: {
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    },
  };
}