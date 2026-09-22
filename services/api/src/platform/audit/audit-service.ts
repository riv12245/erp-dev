import mongoose from 'mongoose';
import { AppError } from '../../shared/errors/app-error.js';
import { getAuditModel, AuditEntryAttributes } from './audit-model.js';

/**
 * Append-only audit service. There is intentionally NO update/delete path:
 * historical logs must never be edited. Corrections are new entries.
 */
export class AuditService {
  constructor(private readonly connection: mongoose.Connection) {}

  async record(entry: Omit<AuditEntryAttributes, 'auditId' | 'timestamp'>): Promise<void> {
    const Audit = getAuditModel(this.connection);
    await Audit.create({
      auditId: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry,
    });
  }

  async list(
    tenantId: string,
    options: { entityType?: string; actorId?: string; limit?: number; offset?: number },
  ): Promise<unknown[]> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0) throw AppError.validation('Invalid audit pagination');
    const Audit = getAuditModel(this.connection);
    const filter: Record<string, unknown> = { tenantId };
    if (options.entityType) filter.entityType = options.entityType;
    if (options.actorId) filter.actorId = options.actorId;
    return Audit.find(filter as mongoose.FilterQuery<AuditEntryAttributes>)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }
}