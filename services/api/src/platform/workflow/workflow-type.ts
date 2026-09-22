export type WorkflowStepStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';

export interface WorkflowDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly entityType: string;
  readonly entityStateField?: string;
  readonly version: number;
  readonly steps: readonly WorkflowStep[];
  readonly transitions: readonly WorkflowTransition[];
  readonly active: boolean;
}

export interface WorkflowStep {
  readonly stepId: string;
  readonly name: string;
  readonly role: string; // e.g. 'SUPERVISOR' or 'CFO'
  readonly order: number;
  readonly required: boolean;
}

export interface WorkflowTransition {
  readonly from: string;
  readonly to: string;
  readonly stepId: string;
}

export interface WorkflowInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly tenantId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly status: 'active' | 'completed' | 'cancelled';
  readonly currentStepId?: string;
  readonly steps: readonly WorkflowStepInstance[];
  readonly createdAt: Date;
}

export interface WorkflowStepInstance {
  readonly stepId: string;
  readonly status: WorkflowStepStatus;
  readonly decisionById?: string;
  readonly decidedAt?: Date;
  readonly comment?: string;
}

export interface ApprovalRequest {
  readonly requestId: string;
  readonly instanceId: string;
  readonly stepId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly requestedAt: Date;
  readonly status: 'pending' | 'approved' | 'rejected';
}

export interface ApprovalDecision {
  readonly requestId: string;
  readonly decisionById: string;
  readonly decision: 'approved' | 'rejected';
  readonly comment?: string;
  readonly decidedAt: Date;
}

export { WorkflowStatus } from './workflow-status.js';