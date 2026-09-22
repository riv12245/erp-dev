import { Notification } from '../shared/types.js';

export class EmailSender {
  private static instance: EmailSender;

  private constructor() {}

  static getInstance(): EmailSender {
    if (!EmailSender.instance) {
      EmailSender.instance = new EmailSender();
    }
    return EmailSender.instance;
  }

  async send(notification: Notification): Promise<void> {
    console.info(`Sending email to ${notification.recipient}: ${notification.subject}`);

    await this.validateEmail(notification);
    await this.transmit(notification);

    console.info(`Email sent to ${notification.recipient}`);
  }

  private async validateEmail(notification: Notification): Promise<void> {
    if (!notification.recipient.includes('@')) {
      throw new Error('Invalid email address');
    }
  }

  private async transmit(_notification: Notification): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}