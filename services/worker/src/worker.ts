import { ConfigService } from './config.js';
import { MongoConnection } from './connection.js';
import { OutboxProcessor } from './outbox/outbox-processor.js';
import { InboxProcessor } from './outbox/inbox-processor.js';
import { Scheduler } from './scheduled/scheduler.js';
import { DomainEventDispatcher } from './events/domain-event-dispatcher.js';
import { JobQueue } from './shared/job-queue.js';

export class Worker {
  private static instance: Worker;
  private isRunning: boolean = false;
  private readonly configService: ConfigService;
  private readonly db: MongoConnection;
  private readonly outboxProcessor: OutboxProcessor;
  private readonly inboxProcessor: InboxProcessor;
  private readonly scheduler: Scheduler;
  private readonly eventDispatcher: DomainEventDispatcher;
  private readonly jobQueue: JobQueue;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.db = MongoConnection.getInstance();
    this.outboxProcessor = OutboxProcessor.getInstance();
    this.inboxProcessor = InboxProcessor.getInstance();
    this.scheduler = Scheduler.getInstance();
    this.eventDispatcher = DomainEventDispatcher.getInstance();
    this.jobQueue = JobQueue.getInstance();
  }

  static getInstance(): Worker {
    if (!Worker.instance) {
      Worker.instance = new Worker();
    }
    return Worker.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Worker is already running');
      return;
    }

    this.configService.getAll(); // Validate every numeric setting before starting resources.
    this.isRunning = true;
    console.info(`Worker ${this.configService.get('workerId')} starting...`);

    try {
      await this.outboxProcessor.start();
      await this.inboxProcessor.start();
      await this.scheduler.start();
      await this.jobQueue.start();
    } catch (error) {
      // Preserve the startup failure while attempting every resource cleanup.
      await this.stop().catch(() => console.error('Worker cleanup after startup failure was incomplete'));
      throw error;
    }

    this.eventDispatcher.on('job:completed', {
      handle: async () => {
        await this.outboxProcessor.processOutbox();
      },
    });

    console.info('Worker started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.info('Worker stopping...');

    const results = await Promise.allSettled([
      this.outboxProcessor.stop(), this.inboxProcessor.stop(), this.scheduler.stop(), this.jobQueue.stop(),
    ]);
    await this.db.disconnect();
    if (results.some(result => result.status === 'rejected')) throw new Error('Worker shutdown failed');

    console.info('Worker stopped');
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}
