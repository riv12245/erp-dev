# Workflow Engine Documentation

**Document**: docs/workflows/README.md  
**Version**: 1.0.0  
**Last Updated**: September 21, 2026  
**Status**: Active

## Overview

The ERP Platform includes a workflow engine that enables businesses to define, execute, and monitor automated business processes. The workflow engine integrates with all business modules to automate complex operations.

## What are Workflows?

A workflow is a sequence of tasks that execute in a defined order to accomplish a business goal. Workflows can include:
- Automated approvals
- Sequential task execution
- Conditional branching
- Parallel task execution
- Timer-based triggers
- Human task assignments
- Integration with external systems

## Workflow Engine Architecture

### Components
1. **Workflow Definition**: JSON/YAML definition of workflow structure
2. **Workflow Engine**: Core execution engine
3. **Task Processor**: Executes individual tasks within a workflow
4. **State Manager**: Persists workflow state
5. **Event Listener**: Reacts to domain events to trigger workflows
6. **Dashboard**: UI for monitoring and managing workflows

### Workflow Lifecycle
```
Defined → Activated → Running → Completed (or Failed/Aborted)
```

### Supported Workflow Types
- **Sequential**: Tasks execute in order
- **Parallel**: Tasks execute simultaneously
- **Conditional**: Branching based on conditions
- **Approval**: Multi-level approval workflows
- **Scheduled**: Time-based workflows
- **Event-driven**: Triggered by domain events

## Workflow Definition Format

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  trigger: {
    type: 'event' | 'manual' | 'schedule' | 'api';
    eventType?: string;
    schedule?: CronExpression;
  };
  tasks: WorkflowTask[];
  errorHandling: ErrorHandlingConfig;
  settings: WorkflowSettings;
}
```

## Key Features

### Visual Workflow Designer
- Drag-and-drop workflow builder
- Preview and test workflows
- Version control for workflow definitions
- Template library for common patterns

### Approval Workflows
- Multi-level approval chains
- Escalation rules for overdue approvals
- Approval history tracking
- Email/SMS notifications for pending approvals

### Integration with Modules
- **Sales**: Order approval workflows
- **Finance**: Invoice approval workflows
- **HR**: Leave request workflows
- **Procurement**: Purchase order approval workflows
- **Manufacturing**: Production approval workflows

## Workflow Execution

### Execution Model
1. Workflow triggered by event, manual action, or schedule
2. Engine creates a workflow instance
3. Tasks are executed according to the definition
4. Task results determine next steps
5. Workflow state persisted in database
6. Completion triggers post-workflow actions

### Task Types
- **Script Task**: Execute custom JavaScript/TypeScript
- **Service Task**: Call an external service or API
- **User Task**: Assign to a human for action
- **Approval Task**: Require approval from one or more users
- **Timer Task**: Wait for a specified duration
- **Gateway Task**: Conditional branching
- **Parallel Task**: Execute multiple tasks concurrently
- **End Task**: Terminate the workflow

### Error Handling
- **Retry Policy**: Configurable retry attempts and delays
- **Fallback**: Alternative path on failure
- **Escalation**: Alert administrators on repeated failures
- **Compensation**: Reverse previous steps if workflow fails
- **Dead Letter**: Failed workflow instances moved to DLQ

## State Persistence

Workflow state is persisted in MongoDB:
```typescript
interface WorkflowInstance {
  id: string;
  definitionId: string;
  status: 'active' | 'completed' | 'failed' | 'aborted';
  currentTaskIndex: number;
  data: Record<string, unknown>;
  history: TaskExecution[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

## Monitoring and Management

### Dashboard Features
- Active workflow instances
- Workflow execution history
- Task-level status tracking
- Performance metrics
- Error and failure analysis
- Workflow definition versioning

### API Endpoints
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/{id}` - Get workflow definition
- `POST /api/v1/workflows/{id}/execute` - Execute workflow
- `GET /api/v1/workflow-instances` - List instances
- `GET /api/v1/workflow-instances/{id}` - Get instance status

## Related Documents
- [Architecture Documentation](../ARCHITECTURE.md)
- [Events Documentation](../EVENTS.md)
- [Module Directory](../modules/README.md)
