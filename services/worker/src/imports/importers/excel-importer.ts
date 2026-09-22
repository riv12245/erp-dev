import { readFile } from 'fs/promises';

export class ExcelImporter {
  async import(filePath: string): Promise<void> {
    const buffer = await readFile(filePath);

    console.info(`Excel import from ${filePath}: ${buffer.length} bytes processed`);

    const records = await this.parseExcel(buffer);
    for (const record of records) {
      await this.validateRecord(record);
    }
  }

  private async parseExcel(_buffer: Buffer): Promise<Record<string, string>[]> {
    return [{ data: 'parsed' }];
  }

  private async validateRecord(record: Record<string, string>): Promise<void> {
    if (!record || Object.keys(record).length === 0) {
      throw new Error('Empty Excel record');
    }
  }
}