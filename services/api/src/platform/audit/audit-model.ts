import mongoose from 'mongoose';

export interface AuditEntryAttributes {
  readonly auditId: string;
  readonly tenantId: string;
  readonly actorId?: string;
  readonly companyId?: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly correlationId?: string;
  readonly requestId?: string;
  readonly timestamp: Date;
}

export const auditSchema = new mongoose.Schema<AuditEntryAttributes>(
  {
    auditId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    actorId: { type: String, index: true },
    companyId: { type: String },
    action: { type: String, required: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    correlationId: { type: String, index: true },
    requestId: { type: String },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true, collection: 'audit_logs', versionKey: false },
);

export interface AuditDocument extends mongoose.Document, AuditEntryAttributes {}

auditSchema.index({ tenantId: 1, timestamp: -1 });

export function getAuditModel(connection: mongoose.Connection): mongoose.Model<AuditDocument> {
  return (connection.models.AuditEntry as unknown as mongoose.Model<AuditDocument>) ?? (connection.model('AuditEntry', auditSchema) as unknown as mongoose.Model<AuditDocument>);
}
