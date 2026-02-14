import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';

import { I18nPipe } from '../../pipes/i18n.pipe';
import { I18nService } from '../../i18n.service';
import { InAppNotificationService } from '../../services/in-app-notification.service';
import { AuthService } from '../../services/auth.service';
import { EnhancedNotification } from '../../models/maintenance.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(InAppNotificationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  // State management
  isOpen = signal(false);
  showUnreadOnly = signal(false);

  // Computed properties
  notifications = computed(() => {
    const all = this.notificationService.notifications();
    return this.showUnreadOnly() ? all.filter(n => !n.read) : all;
  });

  unreadCount = this.notificationService.unreadCount;

  hasUnread = computed(() => this.unreadCount() > 0);
  hasNotifications = computed(() => this.notifications().length > 0);

  ngOnInit(): void {
    console.log('🔔 [NotificationsComponent] ngOnInit - Inicializando componente');
    console.log('🔔 [NotificationsComponent] Estado inicial:', {
      notifications: this.notificationService.notifications(),
      unreadCount: this.notificationService.unreadCount()
    });
    
    // Note: loadNotifications and subscribeToNotifications are already called 
    // in app.component.ts when user logs in. We just display the data here.
  }

  toggleDropdown(): void {
    const wasOpen = this.isOpen();
    this.isOpen.update(v => !v);
    console.log('🔔 [NotificationsComponent] toggleDropdown:', { 
      wasOpen, 
      nowOpen: this.isOpen(),
      notifications: this.notifications(),
      totalNotifications: this.notificationService.notifications().length,
      unreadCount: this.unreadCount()
    });
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  // Fechar quando clicar fora do componente
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.notifications-container');
    
    if (!clickedInside && this.isOpen()) {
      this.closeDropdown();
    }
  }

  toggleUnreadFilter(): void {
    this.showUnreadOnly.update(v => !v);
  }

  async markAsRead(notification: EnhancedNotification, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }

    console.log('🔔 [NotificationsComponent] markAsRead clicked:', {
      notificationId: notification.id,
      title: notification.title,
      isRead: notification.read
    });

    if (!notification.read) {
      await this.notificationService.markAsRead(notification.id);
      console.log('✅ [NotificationsComponent] Notification marked as read');
    }
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationService.markAllAsRead();
  }

  async deleteAllRead(): Promise<void> {
    await this.notificationService.deleteAllRead();
  }

  async handleNotificationClick(notification: EnhancedNotification): Promise<void> {
    // Mark as read
    await this.markAsRead(notification);

    // Close dropdown
    this.closeDropdown();

    // Navigate if there's a service request ID
    if (notification.service_request_id) {
      this.router.navigate(['/admin/requests']);
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'service_assigned':
        return '👷';
      case 'execution_date_approved':
        return '✅';
      case 'execution_date_proposal':
        return '📅';
      case 'execution_date_rejected':
        return '❌';
      case 'payment_due':
        return '💳';
      case 'payment_completed':
        return '💰';
      case 'deadline_warning':
        return '⏰';
      case 'overdue_alert':
        return '⚠️';
      default:
        return '🔔';
    }
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return this.i18n.translate('justNow');
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return d.toLocaleDateString(this.i18n.getCurrentLanguage());
  }

  /**
   * Formata a mensagem da notificação colocando nomes entre aspas em negrito
   * Exemplo: "Serviço 'Limpeza de Casa' foi agendado" -> "Serviço <strong>Limpeza de Casa</strong> foi agendado"
   */
  formatMessage(message: string): string {
    // Escapa HTML para segurança
    const escapeHtml = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const escaped = escapeHtml(message);
    
    // Substitui texto entre aspas simples ou duplas por negrito
    return escaped
      .replace(/['"]([^'"]+)['"]/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>'); // Também suporta **texto**
  }
}
