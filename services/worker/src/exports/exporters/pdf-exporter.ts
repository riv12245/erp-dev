import { writeFile } from 'fs/promises';

export class PdfExporter {
  async export(query: Record<string, unknown>, jobId: string): Promise<void> {
    const data = await this.fetchData(query);
    const pdf = await this.toPdf(data);

    await writeFile(`/tmp/${jobId}.pdf`, pdf);
    console.info(`PDF export for job ${jobId} completed with ${data.length} rows`);
  }

  private async fetchData(_query: Record<string, unknown>): Promise<Record<string, string>[]> {
    return [{ exported: 'true' }];
  }

  private async toPdf(_data: Record<string, string>[]): Promise<Buffer> {
    return Buffer.from('%PDF stub');
  }
}