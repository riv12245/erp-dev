import { Report } from '../shared/types.js';
import { ReportRepository } from './report-repository.js';

export class ReportEngine {
  private static instance: ReportEngine;
  private readonly repository: ReportRepository;

  private constructor() {
    this.repository = new ReportRepository();
  }

  static getInstance(): ReportEngine {
    if (!ReportEngine.instance) {
      ReportEngine.instance = new ReportEngine();
    }
    return ReportEngine.instance;
  }

  async getPending(): Promise<Report[]> {
    return this.repository.getPending();
  }

  async generate(report: Report): Promise<void> {
    console.info(`Generating report: ${report.type}`);

    const data = await this.fetchData(report.type);
    report.data = data;
    report.status = 'generated';
    report.generatedAt = new Date();

    await this.repository.update(report);
    console.info(`Report ${report.id} generated`);
  }

  private async fetchData(type: string): Promise<Record<string, unknown>> {
    return { type, generatedAt: new Date() };
  }
}