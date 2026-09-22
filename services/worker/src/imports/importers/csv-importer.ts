import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';

export class CsvImporter {
  async import(filePath: string): Promise<void> {
    const content = await readFile(filePath, { encoding: 'utf-8' });
    const records = parse(content, { columns: true, skip_empty_lines: true });

    console.info(`CSV import from ${filePath}: ${records.length} records processed`);

    for (const record of records) {
      await this.validateRecord(record);
    }
  }

  private async validateRecord(record: Record<string, string>): Promise<void> {
    if (!record || Object.keys(record).length === 0) {
      throw new Error('Empty CSV record');
    }
  }
}