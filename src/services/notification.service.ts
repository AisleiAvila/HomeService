import { Injectable, signal } from "@angular/core";
import { Notification } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private notificationIdCounter = 1;

  // Notificações simples (compatibilidade)
  notifications = signal<Notification[]>([]);

  constructor() {
    // Métodos de inicialização serão chamados externamente
    // para evitar dependência circular com AuthService
  }

  // MÉTODOS LEGADOS (compatibilidade)
  addNotification(message: string) {
    const newNotification: Notification = {
      id: this.notificationIdCounter++,
      message,
      created_at: new Date(),
      read: false,
    };
    this.notifications.update((current) => [newNotification, ...current]);

    // Auto-remove após 5 segundos
    setTimeout(() => {
      this.notifications.update((all) =>
        all.filter((n) => n.id !== newNotification.id)
      );
    }, 2000);
  }

  showSuccess(message: string) {
    this.addNotification(message);
  }

  showError(message: string) {
    this.addNotification(message);
  }

  markAsRead(notificationId: number) {
    this.notifications.update((notifications) =>
      notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  markAllAsRead() {
    this.notifications.update((notifications) =>
      notifications.map((n) => (n.read ? n : { ...n, read: true }))
    );
  }

  clearAll() {
    this.notifications.set([]);
  }
}
