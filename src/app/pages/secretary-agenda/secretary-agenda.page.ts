import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import { SchedulerComponent } from "../../../components/scheduler/scheduler.component";
import { DataService } from "../../../services/data.service";
import { ServiceRequest } from "../../../models/maintenance.models";

@Component({
  selector: "app-secretary-agenda-page",
  standalone: true,
  imports: [CommonModule, I18nPipe, SchedulerComponent],
  template: `
    <div class="p-4 md:p-6 mobile-safe">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-brand-primary-500 to-brand-primary-600">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center">
                <i class="fa-solid fa-calendar-days mr-3"></i>
                {{ 'agenda' | i18n }}
              </h2>
              <p class="text-white text-sm mt-1">
                {{ 'schedule' | i18n }}
              </p>
            </div>
          </div>
        </div>

        <div class="p-6">
          @if (requests().length === 0) {
            <div class="text-sm text-gray-600 dark:text-gray-300">{{ 'noData' | i18n }}</div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-600 dark:text-gray-300">
                    <th class="py-2 pr-4">#</th>
                    <th class="py-2 pr-4">{{ 'client' | i18n }}</th>
                    <th class="py-2 pr-4">{{ 'status' | i18n }}</th>
                    <th class="py-2 pr-4">{{ 'scheduled' | i18n }}</th>
                    <th class="py-2 pr-0"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of requests(); track r.id) {
                    <tr class="border-t border-gray-200 dark:border-gray-700">
                      <td class="py-3 pr-4 font-semibold text-gray-700 dark:text-gray-200">{{ r.id }}</td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">{{ r.client_name || '-' }}</td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">{{ r.status || '-' }}</td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">
                        {{ r.scheduled_start_datetime || r.scheduled_date || '—' }}
                      </td>
                      <td class="py-3 pr-0 text-right">
                        <button
                          type="button"
                          class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-brand-primary-600 text-white text-xs font-semibold hover:bg-brand-primary-700"
                          (click)="openScheduler(r)"
                        >
                          <i class="fa-solid fa-calendar-check"></i>
                          <span>{{ 'schedule' | i18n }}</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>

      @if (isSchedulerOpen() && selectedRequest()) {
        <div class="modal-backdrop" (click)="closeScheduler()" (keydown.enter)="closeScheduler()">
          <div class="modal-content" (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()">
            <app-scheduler
              [serviceRequest]="selectedRequest()!"
              (close)="closeScheduler()"
              (appointmentConfirmed)="handleScheduleConfirmed($event)"
            />
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretaryAgendaPage {
  private readonly dataService = inject(DataService);

  readonly selectedRequest = signal<ServiceRequest | null>(null);
  readonly isSchedulerOpen = signal(false);

  readonly requests = computed(() => {
    // MVP: exibe todas as solicitações carregadas (mesma fonte usada no app)
    return this.dataService.serviceRequests();
  });

  openScheduler(request: ServiceRequest): void {
    this.selectedRequest.set(request);
    this.isSchedulerOpen.set(true);
  }

  closeScheduler(): void {
    this.isSchedulerOpen.set(false);
    this.selectedRequest.set(null);
  }

  handleScheduleConfirmed(event: {
    requestId: number;
    professionalId: number;
    date: Date;
  }): void {
    this.dataService.scheduleServiceRequest(event.requestId, event.professionalId, event.date);
    this.closeScheduler();
  }
}
