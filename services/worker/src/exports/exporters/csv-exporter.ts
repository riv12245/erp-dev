import { writeFile } from 'fs/promises';

export class CsvExporter {
  async export(query: Record<string, unknown>, jobId: string): Promise<void> {
    const data = await this.fetchData(query);
    const csv = this.toCsv(data);

    await writeFile(`/tmp/${jobId}.csv`, csv);
    console.info(`CSV export for job ${jobId} completed with ${data.length} rows`);
  }

  private async fetchData(_query: Record<string, unknown>): Promise<Record<string, string>[]> {
    return [{ exported: 'true' }];
  }

  private toCsv(data: Record<string, string>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) => Object.values(row).join(',')).join('\n');
    return `${headers}\n${rows}`;
  }
}