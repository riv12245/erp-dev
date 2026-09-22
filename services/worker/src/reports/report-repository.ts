import { Report } from '../shared/types.js';

export class ReportRepository {
  async getPending(): Promise<Report[]> {
    return [];
  }

  async update(_report: Report): Promise<void> {}
}