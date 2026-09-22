import { Notification } from '../shared/types.js';
import { NotificationRepository } from './notification-repository.js';
import { EmailSender } from './email-sender.js';

export class NotificationService {
  private static instance: NotificationService;
  private readonly repository: NotificationRepository;
  private readonly emailSender: EmailSender;

  private constructor() {
    this.repository = new NotificationRepository();
    this.emailSender = EmailSender.getInstance();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getPending(): Promise<Notification[]> {
    return this.repository.getPending();
  }

  async send(notification: Notification): Promise<void> {
    switch (notification.type) {
      case 'email':
        await this.emailSender.send(notification);
        break;
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    await this.repository.update(notification);
  }
}