import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig, AppConfig, getSecurityConfig } from './config/index.js';
import { requestContextMiddleware, tenantContextMiddleware, requireAuth, errorHandler, ok } from './shared/index.js';
import { getConnection } from './config/database.js';
import { getUserModel } from './platform/auth/user-model.js';
import { SessionRepository } from './platform/auth/session-repository.js';
import { resolveMembership } from './platform/iam/membership.js';
import { AppError } from './shared/errors/app-error.js';
import { IdentityResolver } from './shared/middleware/auth.middleware.js';
import { registerAuthRoutes } from './platform/auth/auth.routes.js';
import { registerTenantRoutes } from './platform/tenancy/tenancy.routes.js';
import { registerAuditRoutes } from './platform/audit/audit.routes.js';
import { registerHealthRoutes } from './health.routes.js';
import { registerMasterDataRoutes } from './modules/master-data/master-data.routes.js';
import { registerAllModuleRoutes } from './modules/index.js';

export interface AppContext {
  readonly config: AppConfig;
  readonly express: Express;
}

/** Assembles the express application (reusable across tests and server). */
export function createApp(): AppContext {
  const config = loadConfig();
  const app = express();
  const resolveIdentity: IdentityResolver = async (userId, tenantId, sessionId) => {
    const connection = getConnection();
    if (!connection) throw AppError.internal('Database not connected');
    if (!/^[a-f0-9]{24}$/i.test(userId)) throw AppError.unauthorized();
    const user = await getUserModel(connection).findById(userId).exec();
    if (!user || user.status !== 'active') throw AppError.unauthorized();
    if (!await new SessionRepository(connection).active(sessionId, userId, tenantId, user.authVersion ?? 0)) throw AppError.unauthorized('Session expired');
    const grants = await resolveMembership(connection, userId, tenantId);
    return { userId, email: user.email, tenantId, sessionId, ...grants };
  };
  const security = getSecurityConfig(config);

  app.disable('x-powered-by');
  app.use(requestContextMiddleware);
  app.use(helmet(security.helmet as Parameters<typeof helmet>[0]));
  app.use(cors(security.cors));
  app.use(rateLimit({ ...security.rateLimit, handler: (_req, _res, next) => {
    next(new AppError(429, 'RATE_LIMITED', 'Too many requests'));
  } }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  registerHealthRoutes(app);

  app.get('/api/v1/status', (_req: Request, res: Response) => {
    ok(res, { status: 'ok', service: 'erp-api', version: '0.1.0', time: new Date().toISOString() });
  });

  const api = express.Router();
  const tenantOnly = tenantContextMiddleware(config);
  const protect = requireAuth(config, resolveIdentity);

  api.use('/auth', registerAuthRoutes(config, resolveIdentity));

  const protectedApi = express.Router();
  protectedApi.use(tenantOnly, protect);
  registerTenantRoutes(protectedApi);
  registerAuditRoutes(protectedApi);
  registerMasterDataRoutes(protectedApi);
  registerAllModuleRoutes(protectedApi);

  api.use(protectedApi);

  app.use(config.apiPrefix, api);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
      correlationId: (_req as Request).correlationId,
    });
  });

  app.use(errorHandler as express.ErrorRequestHandler);

  return { config, express: app };
}
