import { Router, Request, Response } from 'express';
import { getConnection } from './config/database.js';

/**
 * Health endpoints.
 * GET /health          -> liveness (process up)
 * GET /health/ready    -> readiness (Mongo reachable, etc.)
 * GET /health/live     -> liveness alias
 */
export function registerHealthRoutes(app: Router): void {
  const health = Router();

  health.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', checks: { api: 'up' }, timestamp: new Date().toISOString() });
  });

  health.get('/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  health.get('/ready', (_req: Request, res: Response) => {
    const connection = getConnection();
    const dbUp = connection?.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      checks: { api: 'up', mongodb: dbUp ? 'up' : 'down' },
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/health', health);
}