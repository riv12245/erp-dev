import { Job, JobStatus, JobType } from './types.js';
import { randomUUID as uuidv4 } from 'node:crypto';

export class JobQueue {
  private static instance: JobQueue;
  private queue: Job[] = [];
  private processing: Set<string> = new Set();
  private readonly maxConcurrent: number;

  private constructor() {
    this.maxConcurrent = Number(process.env.MAX_CONCURRENT_JOBS ?? 10);
  }

  static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }

  enqueue(type: JobType, payload: Record<string, unknown>, options?: { priority?: number; idempotencyKey?: string }): Job {
    const job: Job = {
      id: uuidv4(),
      type,
      payload,
      status: 'pending',
      priority: options?.priority ?? 0,
      maxRetries: 5,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      error: null,
      idempotencyKey: options?.idempotencyKey ?? null,
    };

    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);
    return job;
  }

  async dequeue(): Promise<Job | null> {
    if (this.processing.size >= this.maxConcurrent) {
      return null;
    }

    const index = this.queue.findIndex((j) => j.status === 'pending');
    if (index === -1) {
      return null;
    }

    const job = this.queue[index];
    job.status = 'processing';
    job.updatedAt = new Date();
    this.processing.add(job.id);
    return job;
  }

  async complete(job: Job): Promise<void> {
    job.status = 'completed';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    this.processing.delete(job.id);
    this.removeFromQueue(job.id);
  }

  async fail(job: Job, error: string): Promise<void> {
    job.error = error;
    job.updatedAt = new Date();

    if (job.retryCount < job.maxRetries) {
      job.status = 'retrying';
      job.retryCount++;
      this.processing.delete(job.id);
    } else {
      job.status = 'failed';
      this.processing.delete(job.id);
      this.removeFromQueue(job.id);
    }
  }

  getPending(): Job[] {
    return this.queue.filter((j) => j.status === 'pending');
  }

  getByStatus(status: JobStatus): Job[] {
    return this.queue.filter((j) => j.status === status);
  }

  isProcessing(jobId: string): boolean {
    return this.processing.has(jobId);
  }

  private removeFromQueue(jobId: string): void {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  async start(): Promise<void> {
    console.info('JobQueue started');
  }

  async stop(): Promise<void> {
    console.info('JobQueue stopped');
  }
}
