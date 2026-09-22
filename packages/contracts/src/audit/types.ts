/**
 * Audit types for tracking system changes and compliance.
 */

/** Audit log entry */
export interface AuditLog {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly userId: string | null;
  readonly tenantId: string | null;
  readonly previousValues: Record<string, unknown> | null;
  readonly newValues: Record<string, unknown> | null;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly occurredAt: string;
}

/** Audit log filter criteria */
export interface AuditFilter {
  readonly entityType?: string;
  readonly entityId?: string;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly action?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "export" | "import" | "permission_change" | "role_change";
export type AuditSeverity = "low" | "medium" | "high" | "critical";
