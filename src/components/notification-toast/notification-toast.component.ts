import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';

import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [],
  template: `
    <div class="fixed top-4 right-4 z-9999 flex flex-col gap-2 w-80 pointer-events-none">
      @for (n of notifications(); track n) {
        <div
          class="bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3 text-gray-800 animate-fade-in pointer-events-auto"
          [class.opacity-80]="n.read"
          >
          <span>{{ n.message }}</span>
        </div>
      }
    </div>
    `,
  styles: [`
    @keyframes fade-in { from { opacity: 0; transform: translateY(-10px);} to { opacity: 1; transform: none; } }
    .animate-fade-in { animation: fade-in 0.3s; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToastComponent {
  private notificationService = inject(NotificationService);
  notifications = computed(() => this.notificationService.notifications());
}

