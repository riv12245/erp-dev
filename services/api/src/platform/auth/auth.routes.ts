import { Router, Request, Response } from 'express';

import { AppConfig } from '../../config/index.js';
import { getConnection } from '../../config/database.js';

import { AuthDomainService } from './auth-service.js';
import { AuthService } from './auth-app-service.js';

import { asyncHandler, ok, fail } from '../../shared/index.js';
import { tenantContextMiddleware } from '../../shared/middleware/tenant-context.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, IdentityResolver } from '../../shared/middleware/auth.middleware.js';

export function registerAuthRoutes(config: AppConfig, resolveIdentity: IdentityResolver): Router {
  const router = Router();

  const resolveService = (): AuthService => {
    const connection = getConnection();

    if (!connection) {
      throw AppError.internal('Database not connected');
    }

    const domain = new AuthDomainService(config.jwtSecret);

    return new AuthService(
      connection,
      domain,
      ttlSeconds(config.jwtExpiresIn),
      config.authBruteForceMax,
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

      if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
        fail(
          res,
          AppError.validation('email and password are required'),
        );
        return;
      }

      const result = await resolveService().login(email, password, req.tenant!.tenantId);

      ok(res, result, {
        action: 'login',
      });
    }),
  );

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

function ttlSeconds(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);

  if (!match) {
    return 900;
  }

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86_400,
  };

  return value * multipliers[unit];
}