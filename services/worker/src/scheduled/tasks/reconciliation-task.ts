import { ScheduledTask } from '../../shared/types.js';

export class ReconciliationTask {
  getTask(): ScheduledTask {
    return {
      id: 'reconciliation-task',
      name: 'ReconciliationTask',
      intervalMs: 86400000,
      execute: async () => {
        console.info('Executing reconciliation task');
        await this.reconcile();
      },
      enabled: true,
      lastRunAt: null,
      nextRunAt: new Date(),
    };
  }

  private async reconcile(): Promise<void> {
    console.info('Reconciling data...');
  }
}