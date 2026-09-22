import { Router, Request, Response } from 'express';
import { getConnection } from '../../config/database.js';
import { requirePermission } from '../../platform/iam/authorization.js';
import { MasterDataService } from './application/master-data.service.js';
import { asyncHandler, ok, fail } from '../../shared/index.js';
import { AppError } from '../../shared/errors/app-error.js';

export function registerMasterDataRoutes(router: Router): void {
  router.get(
    '/master-data/countries',
    requirePermission('master-data.country.read'),
    asyncHandler(async (req: Request, res: Response) => {
      const conn = getConnection();
      if (!conn) throw AppError.internal('Database not connected');
      const activeOnly = req.query.active === 'false' ? false : true;
      const countries = await new MasterDataService(conn).listCountries(activeOnly);
      ok(res, countries, { count: countries.length });
    }),
  );

  router.post(
    '/master-data/countries',
    requirePermission('master-data.country.write'),
    asyncHandler(async (req: Request, res: Response) => {
      const conn = getConnection();
      if (!conn) throw AppError.internal('Database not connected');
      const { code, name, isActive } = (req.body ?? {}) as { code?: string; name?: string; isActive?: boolean };
      if (!code || !name) {
        fail(res, AppError.validation('code and name are required'));
        return;
      }
      const country = await new MasterDataService(conn).upsertCountry({ code, name, isActive });
      ok(res, country, { action: 'upsert' });
    }),
  );
}
