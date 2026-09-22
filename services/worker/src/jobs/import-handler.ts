import { ImportJob } from '../shared/types.js';
import { ImportManager } from '../imports/import-manager.js';
import { IdempotencyService } from '../idempotency.js';
import { RetryService } from '../retry.js';

export class ImportHandlerJob {
  private readonly importManager: ImportManager;
  private readonly idempotencyService: IdempotencyService;
  private readonly retryService: RetryService;

  constructor() {
    this.importManager = ImportManager.getInstance();
    this.idempotencyService = IdempotencyService.getInstance();
    this.retryService = RetryService.getInstance();
  }

  async execute(): Promise<void> {
    const pendingJobs = await this.importManager.getPendingJobs();

    for (const job of pendingJobs) {
      await this.retryService.executeWithRetry(async () => {
        await this.importManager.process(job);
      });
    }
  }

  async handle(job: ImportJob): Promise<void> {
    const exists = await this.idempotencyService.has(job.id);
    if (exists) return;

    await this.retryService.executeWithRetry(async () => {
      await this.importManager.process(job);
    });

    await this.idempotencyService.execute(job.id, async () => job);
  }
}