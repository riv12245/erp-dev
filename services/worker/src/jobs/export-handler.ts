import { ExportJob } from '../shared/types.js';
import { ExportManager } from '../exports/export-manager.js';
import { IdempotencyService } from '../idempotency.js';
import { RetryService } from '../retry.js';

export class ExportHandlerJob {
  private readonly exportManager: ExportManager;
  private readonly idempotencyService: IdempotencyService;
  private readonly retryService: RetryService;

  constructor() {
    this.exportManager = ExportManager.getInstance();
    this.idempotencyService = IdempotencyService.getInstance();
    this.retryService = RetryService.getInstance();
  }

  async execute(): Promise<void> {
    const pendingJobs = await this.exportManager.getPendingJobs();

    for (const job of pendingJobs) {
      await this.retryService.executeWithRetry(async () => {
        await this.exportManager.process(job);
      });
    }
  }

  async handle(job: ExportJob): Promise<void> {
    const exists = await this.idempotencyService.has(job.id);
    if (exists) return;

    await this.retryService.executeWithRetry(async () => {
      await this.exportManager.process(job);
    });

    await this.idempotencyService.execute(job.id, async () => job);
  }
}