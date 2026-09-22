import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface ProjectTask {
  readonly taskId: string;
  readonly projectId: string;
  readonly tenantId: string;
  readonly title: string;
  readonly status: 'todo' | 'in_progress' | 'review' | 'done';
  readonly assigneeUserId?: string;
  readonly dueDate?: Date;
}

export const ProjectsModule = { id: 'projects', displayName: 'Projects' } as const;

export function registerProjectsRoutes(router: Router): void {
  router.get('/projects/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'projects', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}