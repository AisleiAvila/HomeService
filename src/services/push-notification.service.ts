import { Injectable, inject, signal } from '@angular/core';
import { NotificationService } from './notification.service';
import { I18nService } from './i18n.service';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private notificationService = inject(NotificationService);
  private i18n = inject(I18nService);
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  permission = signal<NotificationPermission>('default');

  async init(): Promise<void> {
    // Set initial permission state without prompting
    this.permission.set(Notification.permission);

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('./service-worker.js');
        console.log('Service Worker registered successfully.');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.warn('Push messaging is not supported');
    }
  }

  async requestPermissionAndSubscribe(): Promise<void> {
    if (this.permission() !== 'default') {
      return; // Only prompt if permission is in the default state
    }

    try {
      const userChoice = await window.Notification.requestPermission();
      this.permission.set(userChoice); // Update state with user's choice

      if (userChoice !== 'granted') {
        this.notificationService.addNotification(this.i18n.translate('pushNotificationsBlocked'));
        console.log('Push notification permission was denied.');
      } else {
        console.log('Push notification permission granted.');
        // In a real app, you would typically create a push subscription here
      }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
    }
  }

  sendNotification(payload: PushNotificationPayload): void {
     if (this.permission() !== 'granted') {
        console.warn('Cannot send notification, permission not granted.');
        return;
    }

    if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
      this.serviceWorkerRegistration.active.postMessage(payload);
    } else {
      console.error('Service worker not active, cannot send notification.');
      // In a real app, you might queue notifications until the SW is active.
    }
  }
}