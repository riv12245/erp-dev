import { Notification } from '../shared/types.js';
import { NotificationService } from '../notifications/notification-service.js';
import { IdempotencyService } from '../idempotency.js';
import { RetryService } from '../retry.js';

export class NotificationDispatcherJob {
  private readonly notificationService: NotificationService;
  private readonly idempotencyService: IdempotencyService;
  private readonly retryService: RetryService;

  constructor() {
    this.notificationService = NotificationService.getInstance();
    this.idempotencyService = IdempotencyService.getInstance();
    this.retryService = RetryService.getInstance();
  }

  async execute(): Promise<void> {
    const notifications = await this.notificationService.getPending();

    for (const notification of notifications) {
      await this.retryService.executeWithRetry(async () => {
        await this.notificationService.send(notification);
      });
    }
  }

  async handle(notification: Notification): Promise<void> {
    const exists = await this.idempotencyService.has(notification.id);
    if (exists) return;

    await this.retryService.executeWithRetry(async () => {
      await this.notificationService.send(notification);
    });

    await this.idempotencyService.execute(notification.id, async () => notification);
  }
}