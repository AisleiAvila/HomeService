
import { Injectable, signal } from '@angular/core';
import { Notification } from '../models/maintenance.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationIdCounter = 1;
  notifications = signal<Notification[]>([]);

  addNotification(message: string) {
    const newNotification: Notification = {
      id: this.notificationIdCounter++,
      message,
      timestamp: new Date(),
      read: false
    };
    this.notifications.update(current => [newNotification, ...current]);

    // Optional: auto-remove after some time to prevent list from growing too large
    setTimeout(() => {
        this.notifications.update(all => all.filter(n => n.id !== newNotification.id));
    }, 15000);
  }

  markAsRead(notificationId: number) {
    this.notifications.update(notifications => 
      notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }

  clearAll() {
    this.notifications.set([]);
  }
}
