import { ImportJob } from '../shared/types.js';
import { CsvImporter } from './importers/csv-importer.js';
import { ExcelImporter } from './importers/excel-importer.js';

export class ImportManager {
  private static instance: ImportManager;
  private readonly csvImporter: CsvImporter;
  private readonly excelImporter: ExcelImporter;

  private constructor() {
    this.csvImporter = new CsvImporter();
    this.excelImporter = new ExcelImporter();
  }

  static getInstance(): ImportManager {
    if (!ImportManager.instance) {
      ImportManager.instance = new ImportManager();
    }
    return ImportManager.instance;
  }

  async process(job: ImportJob): Promise<void> {
    console.info(`Processing import job: ${job.id}, source: ${job.source}`);

    switch (job.source) {
      case 'csv':
        await this.csvImporter.import(job.filePath);
        break;
      case 'excel':
        await this.excelImporter.import(job.filePath);
        break;
      default:
        throw new Error(`Unknown import source: ${job.source}`);
    }

    job.status = 'completed';
    console.info(`Import job ${job.id} completed`);
  }

  async getPendingJobs(): Promise<ImportJob[]> {
    return [];
  }
}