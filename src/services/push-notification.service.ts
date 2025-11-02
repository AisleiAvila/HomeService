import { Injectable, inject } from "@angular/core";
import { I18nService } from "../i18n.service";
import { NotificationService } from "./notification.service";
import { environment } from "../environments/environment";

@Injectable({
  providedIn: "root",
})
export class PushNotificationService {
  private readonly notificationService = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    // In development, aggressively unregister any existing SW and clear caches to avoid stale UI
    if (!environment.production) {
      this.unregisterServiceWorkersInDev();
      return; // Don't register SW in development
    }

    this.registerServiceWorker();
  }

  private async unregisterServiceWorkersInDev() {
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          console.log(
            `Dev mode: unregistering ${regs.length} service worker(s) and clearing caches...`
          );
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch (error) {
        console.warn("Dev mode: failed to unregister service workers:", error);
      }
    }
    // Clear any caches the SW may have created
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        console.log("Dev mode: caches cleared");
      }
    } catch (error) {
      console.warn("Dev mode: failed to clear caches:", error);
    }
  }

  private async registerServiceWorker() {
    // Only register SW in production, on secure contexts (HTTPS) or localhost
    const isSecureContext =
      window.isSecureContext || location.protocol === "https:";
    const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(
      location.hostname
    );

    if (
      environment.production &&
      "serviceWorker" in navigator &&
      (isSecureContext || isLocalhost)
    ) {
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
