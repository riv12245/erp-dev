import { ScheduledTask } from '../../shared/types.js';

export class ExpiryTask {
  getTask(): ScheduledTask {
    return {
      id: 'expiry-task',
      name: 'ExpiryTask',
      intervalMs: 3600000,
      execute: async () => {
        console.info('Executing expiry task');
        await this.expireEntities();
      },
      enabled: true,
      lastRunAt: null,
      nextRunAt: new Date(),
    };
  }

  private async expireEntities(): Promise<void> {
    console.info('Expiring entities...');
  }
}