import { Injectable, signal, inject } from '@angular/core';
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

  private readonly VAPID_PUBLIC_KEY = 'BNo5YgA_w2GNL6k_4S_2NTVj-A45s84Mv3myCkaC-8t2j5b4eQJUn_y-13IWFg6x-zUjXNb5zCqj4naIoeAxaH8';

  // Expose permission status as a signal for the UI
  permission = signal<NotificationPermission>('default');

  constructor() {
    // Set initial permission status
    if ('Notification' in window) {
      this.permission.set(Notification.permission);
    }
  }

  /**
   * Initializes the service by registering the service worker.
   */
  public init(): void {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      console.log('Service Worker and Push is supported');

      navigator.serviceWorker.register('./service-worker.js')
        .then(swReg => {
          console.log('Service Worker is registered', swReg);
        })
        .catch(error => {
          console.error('Service Worker Error', error);
        });
    } else {
      console.warn('Push messaging is not supported');
    }
  }

  /**
   * Requests permission from the user and subscribes to push notifications.
   */
  public async requestPermissionAndSubscribe(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return;
    }

    // Request permission
    const currentPermission = await Notification.requestPermission();
    this.permission.set(currentPermission);

    if (currentPermission === 'granted') {
      console.log('Notification permission granted.');
      await this.subscribeUserToPush();
    } else {
      console.log('Notification permission denied.');
      this.notificationService.addNotification(this.i18n.translate('pushNotificationsBlocked'));
    }
  }

  /**
   * Subscribes the user to the push service.
   */
  private async subscribeUserToPush(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
      });
      console.log('User is subscribed:', subscription);

      // In a real app, you'd send this subscription object to your backend server.
      // For this demo, we'll just log it.
      // await sendSubscriptionToServer(subscription);

    } catch (err) {
      console.error('Failed to subscribe the user: ', err);
      this.notificationService.addNotification(this.i18n.translate('pushSubscriptionFailed'));
    }
  }

  /**
   * Simulates sending a push notification from the server.
   * In this app, the "server" is the DataService. This method posts a message
   * to the active service worker, which then displays the notification.
   */
  public sendNotification(payload: PushNotificationPayload): void {
     if (this.permission() !== 'granted') {
       console.log('Cannot send push notification, permission not granted.');
       return;
     }
    
    navigator.serviceWorker.ready.then(registration => {
      // Check if there is a controller to avoid errors
      if (registration.active) {
        registration.active.postMessage(payload);
      } else {
        console.warn('No active service worker to send message to.');
      }
    });
  }
  
  /**
   * Helper function to convert a VAPID key from base64 to a Uint8Array.
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}