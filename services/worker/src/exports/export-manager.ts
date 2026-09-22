import { ExportJob } from '../shared/types.js';
import { CsvExporter } from './exporters/csv-exporter.js';
import { PdfExporter } from './exporters/pdf-exporter.js';

export class ExportManager {
  private static instance: ExportManager;
  private readonly csvExporter: CsvExporter;
  private readonly pdfExporter: PdfExporter;

  constructor() {
    this.csvExporter = new CsvExporter();
    this.pdfExporter = new PdfExporter();
  }

  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  async process(job: ExportJob): Promise<void> {
    console.info(`Processing export job: ${job.id}, format: ${job.format}`);

    switch (job.format) {
      case 'csv':
        await this.csvExporter.export(job.query, job.id);
        break;
      case 'pdf':
        await this.pdfExporter.export(job.query, job.id);
        break;
      default:
        throw new Error(`Unknown export format: ${job.format}`);
    }

    job.status = 'completed';
    console.info(`Export job ${job.id} completed`);
  }

  async getPendingJobs(): Promise<ExportJob[]> {
    return [];
  }
}