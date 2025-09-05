import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div class="p-3 border-b flex justify-between items-center">
        <h3 class="font-semibold text-gray-800">Notifications</h3>
        <button (click)="close.emit()" class="text-gray-400 hover:text-gray-600">&times;</button>
      </div>
      <div class="max-h-96 overflow-y-auto">
        @if (notificationService.notifications().length === 0) {
          <p class="text-center text-gray-500 p-6">No new notifications.</p>
        } @else {
          <ul>
            @for (notification of notificationService.notifications(); track notification.id) {
              <li class="border-b last:border-b-0 p-3 hover:bg-gray-50 transition-colors duration-150">
                <p class="text-sm text-gray-700">{{ notification.message }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ notification.timestamp | date:'short' }}</p>
              </li>
            }
          </ul>
        }
      </div>
      @if (notificationService.notifications().length > 0) {
        <div class="p-2 bg-gray-50 border-t text-center">
          <button (click)="notificationService.clearAll()" class="text-sm text-blue-600 hover:underline">
            Clear All
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenterComponent {
  // FIX: Replaced @Output decorator with the output() function for modern Angular best practices.
  close = output<void>();
  notificationService = inject(NotificationService);
}
