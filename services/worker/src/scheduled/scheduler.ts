import { ScheduledTask } from '../shared/types.js';
import { ExpiryTask } from './tasks/expiry-task.js';
import { ReminderTask } from './tasks/reminder-task.js';
import { ReconciliationTask } from './tasks/reconciliation-task.js';
import { ConfigService } from '../config.js';
import { RetryService } from '../retry.js';

export class Scheduler {
  private static instance: Scheduler;
  private readonly tasks: ScheduledTask[] = [];
  private interval: NodeJS.Timeout | null = null;
  private readonly configService: ConfigService;
  private readonly retryService: RetryService;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.retryService = RetryService.getInstance();
    this.registerTasks();
  }

  static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  private registerTasks(): void {
    this.tasks.push(new ExpiryTask().getTask());
    this.tasks.push(new ReminderTask().getTask());
    this.tasks.push(new ReconciliationTask().getTask());
  }

  async start(): Promise<void> {
    console.info('Scheduler started');

    const intervalMs = this.configService.get('scheduledJobIntervalMs');

    this.interval = setInterval(async () => {
      await this.runTasks();
    }, intervalMs);
  }

  async stop(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.info('Scheduler stopped');
  }

  private async runTasks(): Promise<void> {
    const now = new Date();

    for (const task of this.tasks) {
      if (!task.enabled) continue;

      if (task.nextRunAt && task.nextRunAt <= now) {
        try {
          await this.retryService.executeWithRetry(async () => {
            await task.execute();
          });
          task.lastRunAt = now;
          task.nextRunAt = new Date(now.getTime() + task.intervalMs);
        } catch (error) {
          console.error(`Task ${task.name} failed:`, error);
        }
      }
    }
  }
}