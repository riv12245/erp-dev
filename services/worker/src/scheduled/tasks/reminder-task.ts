import { ScheduledTask } from '../../shared/types.js';

export class ReminderTask {
  getTask(): ScheduledTask {
    return {
      id: 'reminder-task',
      name: 'ReminderTask',
      intervalMs: 1800000,
      execute: async () => {
        console.info('Executing reminder task');
        await this.sendReminders();
      },
      enabled: true,
      lastRunAt: null,
      nextRunAt: new Date(),
    };
  }

  private async sendReminders(): Promise<void> {
    console.info('Sending reminders...');
  }
}