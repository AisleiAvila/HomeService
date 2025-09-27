import { Injectable, inject } from "@angular/core";
import { I18nService } from "../i18n.service";
import { NotificationService } from "./notification.service";

@Injectable({
  providedIn: "root",
})
export class PushNotificationService {
  private notificationService = inject(NotificationService);
  private i18n = inject(I18nService);
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.registerServiceWorker();
  }

  private async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register(
          "./service-worker.js"
        );
        console.log(
          "Service Worker registered with scope:",
          this.swRegistration.scope
        );
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        this.notificationService.addNotification(
          this.i18n.translate("pushNotificationsBlocked")
        );
      }
      return permission;
    }
    return "default";
  }

  public sendNotification(title: string, body: string, icon?: string) {
    if (this.swRegistration?.active) {
      // In a real app, you would send a request to your server to trigger a push notification.
      // For this app, we'll simulate it by posting a message to the service worker.
      this.swRegistration.active.postMessage({ title, body, icon });
    } else {
      console.warn(
        "Service worker not active, cannot send notification via message."
      );
    }
  }
}
