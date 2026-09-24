import { Router, Request, Response } from 'express';
import { validateLogin } from '@erp/validation';

import { AppConfig, durationSeconds } from '../../config/index.js';
import { getConnection } from '../../config/database.js';

import { AuthDomainService } from './auth-service.js';
import { AuthService } from './auth-app-service.js';
import { SessionService } from './session-service.js';
import { clearRefresh, presentSession, readRefresh, sessionClient } from './session-transport.js';

import { asyncHandler, ok, fail } from '../../shared/index.js';
import { tenantContextMiddleware } from '../../shared/middleware/tenant-context.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, IdentityResolver } from '../../shared/middleware/auth.middleware.js';

export function registerAuthRoutes(config: AppConfig, resolveIdentity: IdentityResolver): Router {
  const router = Router();
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const sessions = (): SessionService => {
    const connection = getConnection();
    if (!connection) throw AppError.internal('Database not connected');
    return new SessionService(connection, new AuthDomainService(config.jwtSecret), durationSeconds(config.jwtExpiresIn, 'JWT_EXPIRES_IN', 86400), durationSeconds(config.jwtRefreshExpiresIn, 'JWT_REFRESH_EXPIRES_IN', 30 * 86400));
  };

  const resolveService = (): AuthService => {
    const connection = getConnection();

    if (!connection) {
      throw AppError.internal('Database not connected');
    }

    const domain = new AuthDomainService(config.jwtSecret);

    return new AuthService(
      connection,
      domain,
      durationSeconds(config.jwtExpiresIn, 'JWT_EXPIRES_IN', 86400),
      config.authBruteForceMax,
      durationSeconds(config.jwtRefreshExpiresIn, 'JWT_REFRESH_EXPIRES_IN', 30 * 86400),
    );
  };

  // =========================================================
  // REGISTER
  // =========================================================

  router.post(
    '/register',
    asyncHandler(async (req: Request, res: Response) => {
      const { email, password, firstName, lastName } = (req.body ?? {}) as {
        email?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
      };

      if (![email, password, firstName, lastName].every(value => typeof value === 'string' && value.trim().length > 0)) {
        fail(
          res,
          AppError.validation(
            'email, password, firstName and lastName are required',
          ),
        );
        return;
      }

      const created = await resolveService().register({
        email: email!,
        password: password!,
        firstName: firstName!,
        lastName: lastName!,
      });

      ok(res, created, {
        action: 'register',
      });
    }),
  );

  // =========================================================
  // LOGIN
  // =========================================================

  router.post(
    '/login',
    tenantContextMiddleware(config),
    asyncHandler(async (req: Request, res: Response) => {
      const { email, password } = (req.body ?? {}) as {
        email?: string;
        password?: string;
      };

      if (!validateLogin({ email, password }).ok) {
        fail(
          res,
          AppError.validation('Invalid email or password format'),
        );
        return;
      }

      sessionClient(req, config);
      const result = await resolveService().login(email!, password!, req.tenant!.tenantId, req.correlationId);

      ok(res, presentSession(req, res, config, result), {
        action: 'login',
      });
    }),
  );

  router.post('/refresh', asyncHandler(async (req, res) => {
    const result = await sessions().refresh(readRefresh(req, config), req.correlationId);
    ok(res, presentSession(req, res, config, result));
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    const client = sessionClient(req, config);
    // Missing browser cookie is an idempotent logout; malformed native requests still fail.
    if (client !== 'web' || (req.get('cookie') ?? '').includes('erp_refresh=')) {
      await sessions().logout(readRefresh(req, config), req.correlationId);
    }
    if (client === 'web') clearRefresh(res, config);
    ok(res, { revoked: true });
  }));

  router.post('/logout-all', tenantContextMiddleware(config), requireAuth(config, resolveIdentity), asyncHandler(async (req, res) => {
    await sessions().logoutAll(req.authUser!.userId, req.tenant!.tenantId, req.correlationId);
    clearRefresh(res, config);
    ok(res, { revoked: true });
  }));

  // =========================================================
  // CURRENT AUTHENTICATED USER
  // =========================================================

  router.get(
    '/me',
    tenantContextMiddleware(config),
    requireAuth(config, resolveIdentity),
    (req: Request, res: Response) => {
      ok(res, {
        requesterId: req.authUser!.userId,
        tenantId: req.authUser!.tenantId,
        email: req.authUser!.email,
        roles: req.authUser!.roles,
        permissions: req.authUser!.permissions,
      });
    },
  );

  return router;
}
