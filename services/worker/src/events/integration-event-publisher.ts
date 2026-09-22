import { IntegrationEvent } from '../shared/types.js';
import { IdempotencyService } from '../idempotency.js';
import { ConfigService } from '../config.js';
import { Redis } from 'ioredis';

export class IntegrationEventPublisher {
  private static instance: IntegrationEventPublisher;
  private readonly redis: Redis;
  private readonly idempotencyService: IdempotencyService;
  private readonly configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.redis = new Redis(this.configService.get('redisUrl'));
    this.redis.on('error', () => {
      /* connection errors are expected when Redis is unavailable (auto-reconnect). */
    });
    this.idempotencyService = IdempotencyService.getInstance();
  }

  static getInstance(): IntegrationEventPublisher {
    if (!IntegrationEventPublisher.instance) {
      IntegrationEventPublisher.instance = new IntegrationEventPublisher();
    }
    return IntegrationEventPublisher.instance;
  }

  async publish(event: IntegrationEvent): Promise<void> {
    const exists = await this.idempotencyService.has(event.idempotencyKey);
    if (exists) {
      console.info(`Duplicate integration event: ${event.idempotencyKey}`);
      return;
    }

    const channel = `integration-events:${event.eventType}`;
    await this.redis.publish(channel, JSON.stringify(event));

    await this.idempotencyService.execute(event.idempotencyKey, async () => event);
    console.info(`Published integration event: ${event.id} to ${channel}`);
  }

  async start(): Promise<void> {
    console.info('IntegrationEventPublisher started');
  }

  async stop(): Promise<void> {
    await this.redis.quit();
    console.info('IntegrationEventPublisher stopped');
  }
}