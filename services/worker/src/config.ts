export interface WorkerConfig {
  readonly nodeEnv: string;
  readonly logLevel: string;
  readonly mongoUri: string;
  readonly mongoDbName: string;
  readonly redisUrl: string;
  readonly workerId: string;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly jobIntervalMs: number;
  readonly outboxPollIntervalMs: number;
  readonly scheduledJobIntervalMs: number;
  readonly maxConcurrentJobs: number;
}

export const workerConfig: WorkerConfig = {
  get nodeEnv() { return process.env.NODE_ENV ?? 'development'; },
  get logLevel() { return process.env.LOG_LEVEL ?? 'info'; },
  get mongoUri() {
    const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
    if (!uri && process.env.NODE_ENV === 'production') throw new Error('MONGODB_URI is required in production');
    return uri ?? 'mongodb://127.0.0.1:27017/erp_dev';
  },
  get mongoDbName() { return process.env.MONGODB_DB_NAME ?? 'erp_dev'; },
  get redisUrl() { return process.env.REDIS_URL ?? 'redis://localhost:6379'; },
  get workerId() { return process.env.WORKER_ID ?? `worker-${Date.now()}`; },
  get maxRetries() { return Number(process.env.MAX_RETRIES ?? 5); },
  get retryDelayMs() { return Number(process.env.RETRY_DELAY_MS ?? 1000); },
  get jobIntervalMs() { return Number(process.env.JOB_INTERVAL_MS ?? 5000); },
  get outboxPollIntervalMs() { return Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 2000); },
  get scheduledJobIntervalMs() { return Number(process.env.SCHEDULED_JOB_INTERVAL_MS ?? 10000); },
  get maxConcurrentJobs() { return Number(process.env.MAX_CONCURRENT_JOBS ?? 10); },
};

export class ConfigService {
  private static instance: ConfigService;
  private readonly config: WorkerConfig;

  private constructor(config: WorkerConfig) {
    this.config = config;
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService(workerConfig);
    }
    return ConfigService.instance;
  }

  get<T extends keyof WorkerConfig>(key: T): WorkerConfig[T] {
    return this.config[key];
  }

  getAll(): Readonly<WorkerConfig> {
    return Object.freeze({ ...this.config });
  }
}
