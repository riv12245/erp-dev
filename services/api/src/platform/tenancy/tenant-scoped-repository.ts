import mongoose from 'mongoose';
import { TenantContext } from '../../shared/types/index.js';
import { TenantContextMissingError } from '../../shared/errors/tenant-error.js';
import { AppError } from '../../shared/errors/app-error.js';

/**
 * Base tenant-scoped repository. EVERY business query MUST go through
 * these methods so a tenant scope is always applied. A missing tenant
 * context fails hard instead of leaking data across tenants.
 */
export abstract class TenantScopedRepository {
  protected constructor(
    protected readonly model: mongoose.Model<unknown>,
    protected readonly tenantContext: TenantContext,
  ) {}

  protected requireTenantId(): string {
    if (!this.tenantContext.tenantId) {
      throw new TenantContextMissingError();
    }
    return this.tenantContext.tenantId;
  }

  protected tenantFilter(extra: mongoose.FilterQuery<unknown> = {}): mongoose.FilterQuery<unknown> {
    return { $and: [{ tenantId: this.requireTenantId() }, extra] };
  }

  async findOne(extra: mongoose.FilterQuery<unknown> = {}): Promise<unknown | null> {
    return this.model.findOne(this.tenantFilter(extra));
  }

  async findMany(extra: mongoose.FilterQuery<unknown> = {}, limit = 100): Promise<unknown[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw AppError.validation('Limit must be between 1 and 100');
    return this.model.find(this.tenantFilter(extra)).limit(limit).exec();
  }

  async count(extra: mongoose.FilterQuery<unknown> = {}): Promise<number> {
    return this.model.countDocuments(this.tenantFilter(extra));
  }

  async create(data: Record<string, unknown>): Promise<unknown> {
    return this.model.create({ ...data, tenantId: this.requireTenantId() });
  }

  /**
   * Update guarded by BOTH tenant scope and optimistic concurrency (version).
   * Returns null when no matching row exists under the tenant scope.
   */
  async updateOneWithVersion(
    id: string,
    expectedVersion: number,
    updates: Record<string, unknown>,
  ): Promise<{ updated: boolean; currentVersion?: number }> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || expectedVersion >= Number.MAX_SAFE_INTEGER) throw AppError.validation('Invalid expected version');
    if (Object.keys(updates).some(key => key.startsWith('$') || key.includes('.') || ['_id', '__v', 'createdAt', 'createdBy', 'version'].includes(key))) {
      throw AppError.validation('Protected update field');
    }
    const result = await this.model.updateOne(
      {
        $and: [this.tenantFilter() as mongoose.FilterQuery<unknown>, { _id: id } as mongoose.FilterQuery<unknown>, { version: expectedVersion } as mongoose.FilterQuery<unknown>],
      },
      { $set: { ...updates, tenantId: this.requireTenantId(), version: expectedVersion + 1, updatedAt: new Date() } },
    );
    return result.matchedCount === 1 ? { updated: true, currentVersion: expectedVersion + 1 } : { updated: false };
  }

  /** Hard delete guarded by tenant scope. Prefer soft-delete in business domains. */
  async deleteOne(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({
      $and: [this.tenantFilter() as mongoose.FilterQuery<unknown>, { _id: id } as mongoose.FilterQuery<unknown>],
    });
    return result.deletedCount === 1;
  }
}

/** Static guard used by repositories that compose Mongoose directly. */
export function assertTenantScope(context: TenantContext | undefined): asserts context is TenantContext {
  if (!context?.tenantId) throw new TenantContextMissingError();
}
