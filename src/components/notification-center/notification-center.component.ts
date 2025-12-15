


import { Component, ChangeDetectionStrategy, output, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, I18nPipe, DatePipe],
  templateUrl: './notification-center.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenterComponent {
  close = output<void>();
  readonly notificationService = inject(NotificationService);
  
  private readonly initialNotificationIds: ReadonlySet<number>;

  constructor() {
    // Capture IDs of notifications that exist when the component is created.
    // Any notification added after this point is considered "new" and will be animated.
    this.initialNotificationIds = new Set(this.notificationService.notifications().map(n => n.id));
  }
  
  isNew(notification: Notification): boolean {
    return !this.initialNotificationIds.has(notification.id);
  }

  hasUnreadNotifications = computed(() => 
    this.notificationService.notifications().some(n => !n.read)
  );
}

