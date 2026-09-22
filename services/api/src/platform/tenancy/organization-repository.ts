import mongoose from 'mongoose';
import { TenantContext } from '../../shared/types/index.js';
import { TenantScopedRepository } from './tenant-scoped-repository.js';

/**
 * Demo-relevant note on hybrid tenancy:
 * - `shared` (default): all tenants live in one database, rows carry tenantId.
 * - `dedicated-database`: swap `connection` per tenant before constructing repositories.
 * - `dedicated-cluster`: point the connection string at a tenant-specific cluster.
 * The repository layer only ever sees a connection + TenantContext, so switching
 * modes never touches domain code. See docs/architecture/TENANCY.md.
 */
export interface Organization {
  readonly tenantId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly legalName?: string;
  readonly taxId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export class OrganizationRepository extends TenantScopedRepository {
  constructor(model: mongoose.Model<unknown>, tenantContext: TenantContext) {
    super(model, tenantContext);
  }

  async findBySlug(slug: string): Promise<unknown | null> {
    return this.findOne({ slug });
  }
}