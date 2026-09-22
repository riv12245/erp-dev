import { RetryConfig } from './shared/types.js';
import { RetryLimitExceededError } from './errors.js';

export class RetryService {
  private static instance: RetryService;
  private readonly defaultConfig: RetryConfig;

  private constructor() {
    this.defaultConfig = {
      maxRetries: Number(process.env.MAX_RETRIES ?? 5),
      baseDelayMs: Number(process.env.RETRY_DELAY_MS ?? 1000),
      maxDelayMs: Number(process.env.MAX_RETRY_DELAY_MS ?? 60000),
      multiplier: 2,
    };
  }

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    const cfg: RetryConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= cfg.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        onRetry?.(attempt, lastError);

        if (attempt < cfg.maxRetries) {
          const delay = this.calculateDelay(attempt, cfg);
          await this.sleep(delay);
        }
      }
    }

    throw new RetryLimitExceededError(
      `Max retries (${cfg.maxRetries}) exceeded: ${lastError?.message}`,
      cfg.maxRetries
    );
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelayMs * Math.pow(config.multiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}