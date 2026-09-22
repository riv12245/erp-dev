import { Notification } from '../shared/types.js';

export class NotificationRepository {
  async getPending(): Promise<Notification[]> {
    return [];
  }

  async update(_notification: Notification): Promise<void> {}
}