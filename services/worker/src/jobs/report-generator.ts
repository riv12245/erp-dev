import { Report } from '../shared/types.js';
import { ReportEngine } from '../reports/report-engine.js';
import { IdempotencyService } from '../idempotency.js';
import { RetryService } from '../retry.js';

export class ReportGeneratorJob {
  private readonly reportEngine: ReportEngine;
  private readonly idempotencyService: IdempotencyService;
  private readonly retryService: RetryService;

  constructor() {
    this.reportEngine = ReportEngine.getInstance();
    this.idempotencyService = IdempotencyService.getInstance();
    this.retryService = RetryService.getInstance();
  }

  async execute(): Promise<void> {
    const reports = await this.reportEngine.getPending();

    for (const report of reports) {
      await this.retryService.executeWithRetry(async () => {
        await this.reportEngine.generate(report);
      });
    }
  }

  async handle(report: Report): Promise<void> {
    const exists = await this.idempotencyService.has(report.id);
    if (exists) return;

    await this.retryService.executeWithRetry(async () => {
      await this.reportEngine.generate(report);
    });

    await this.idempotencyService.execute(report.id, async () => report);
  }
}