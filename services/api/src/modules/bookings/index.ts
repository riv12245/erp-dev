import { Router, Request, Response } from 'express';
import { asyncHandler, ok } from '../../shared/index.js';
import { getConnection } from '../../config/database.js';

export interface Booking {
  readonly bookingId: string;
  readonly tenantId: string;
  readonly resourceId: string;
  readonly customerId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: 'REQUESTED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

export const BookingsModule = { id: 'bookings', displayName: 'Bookings' } as const;

export function registerBookingsRoutes(router: Router): void {
  router.get('/bookings/health', asyncHandler(async (_req: Request, res: Response) => {
    const conn = getConnection();
    ok(res, { module: 'bookings', status: 'skeleton', db: conn?.readyState === 1 ? 'up' : 'down' });
  }));
}