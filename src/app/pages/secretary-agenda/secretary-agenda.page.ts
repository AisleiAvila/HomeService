import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
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
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center">
                <i class="fas fa-calendar-days mr-3"></i>
                {{ 'agenda' | i18n }}
              </h2>
              <p class="text-brand-primary-200 text-sm mt-1">
                {{ 'schedule' | i18n }}
              </p>
            </div>
          </div>
        </div>

        <div class="p-6">
          <!-- Filters -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              (click)="showFilters.set(!showFilters())"
            >
              <i class="fa-solid fa-filter"></i>
              <span>{{ 'filters' | i18n }}</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              (click)="clearFilters()"
            >
              <i class="fa-solid fa-eraser"></i>
              <span>{{ 'clearFilters' | i18n }}</span>
            </button>
          </div>

          @if (showFilters()) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ 'status' | i18n }}</label>
                <select
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  [value]="filterStatus()"
                  (change)="filterStatus.set($any($event.target).value)"
                >
                  <option value="">{{ 'all' | i18n }}</option>
                  <option value="Solicitado">{{ 'Solicitado' | i18n }}</option>
                  <option value="Atribuído">{{ 'Atribuído' | i18n }}</option>
                  <option value="Aguardando Confirmação">{{ 'Aguardando Confirmação' | i18n }}</option>
                  <option value="Aceito">{{ 'Aceito' | i18n }}</option>
                  <option value="Recusado">{{ 'Recusado' | i18n }}</option>
                  <option value="Data Definida">{{ 'Data Definida' | i18n }}</option>
                  <option value="Em Progresso">{{ 'Em Progresso' | i18n }}</option>
                  <option value="Concluído">{{ 'Concluído' | i18n }}</option>
                  <option value="Finalizado">{{ 'Finalizado' | i18n }}</option>
                  <option value="Cancelado">{{ 'Cancelado' | i18n }}</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ 'client' | i18n }}</label>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  [value]="filterClient()"
                  (input)="filterClient.set($any($event.target).value)"
                  placeholder="{{ 'client' | i18n }}"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ 'service' | i18n }}</label>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  [value]="filterService()"
                  (input)="filterService.set($any($event.target).value)"
                  placeholder="{{ 'service' | i18n }}"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ 'professional' | i18n }}</label>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  [value]="filterProfessional()"
                  (input)="filterProfessional.set($any($event.target).value)"
                  placeholder="{{ 'professional' | i18n }}"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ 'locality' | i18n }}</label>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  [value]="filterLocality()"
                  (input)="filterLocality.set($any($event.target).value)"
                  placeholder="{{ 'locality' | i18n }}"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ 'startDate' | i18n }}</label>
                <input
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  [value]="filterStartDate()"
                  (change)="filterStartDate.set($any($event.target).value)"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{{ 'endDate' | i18n }}</label>
                <input
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  [value]="filterEndDate()"
                  (change)="filterEndDate.set($any($event.target).value)"
                />
              </div>
            </div>
          }

          @if (filteredRequests().length === 0) {
            <div class="text-sm text-gray-600 dark:text-gray-300">{{ 'noData' | i18n }}</div>
          } @else {
            <!-- Desktop Table -->
            <div class="overflow-x-auto hidden lg:block">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-600 dark:text-gray-300">
                    <th class="py-2 pr-4">
                      <button type="button" class="inline-flex items-center gap-2" (click)="toggleSort('client')">
                        <span>{{ 'client' | i18n }}</span>
                        @if (sortBy() === 'client') {
                          <span class="text-xs text-gray-400">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
                        }
                      </button>
                    </th>
                    <th class="py-2 pr-4">
                      <button type="button" class="inline-flex items-center gap-2" (click)="toggleSort('service')">
                        <span>{{ 'service' | i18n }}</span>
                        @if (sortBy() === 'service') {
                          <span class="text-xs text-gray-400">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
                        }
                      </button>
                    </th>
                    <th class="py-2 pr-4">
                      <button type="button" class="inline-flex items-center gap-2" (click)="toggleSort('professional')">
                        <span>{{ 'professional' | i18n }}</span>
                        @if (sortBy() === 'professional') {
                          <span class="text-xs text-gray-400">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
                        }
                      </button>
                    </th>
                    <th class="py-2 pr-4">
                      <button type="button" class="inline-flex items-center gap-2" (click)="toggleSort('locality')">
                        <span>{{ 'locality' | i18n }}</span>
                        @if (sortBy() === 'locality') {
                          <span class="text-xs text-gray-400">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
                        }
                      </button>
                    </th>
                    <th class="py-2 pr-4">
                      <button type="button" class="inline-flex items-center gap-2" (click)="toggleSort('status')">
                        <span>{{ 'status' | i18n }}</span>
                        @if (sortBy() === 'status') {
                          <span class="text-xs text-gray-400">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
                        }
                      </button>
                    </th>
                    <th class="py-2 pr-4">
                      <button type="button" class="inline-flex items-center gap-2" (click)="toggleSort('scheduled')">
                        <span>{{ 'executionTimeline' | i18n }}</span>
                        @if (sortBy() === 'scheduled') {
                          <span class="text-xs text-gray-400">{{ sortOrder() === 'asc' ? '↑' : '↓' }}</span>
                        }
                      </button>
                    </th>
                    <th class="py-2 pr-0"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of filteredPaginatedRequests(); track r.id) {
                    <tr class="border-t border-gray-200 dark:border-gray-700">
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">{{ r.client_name || '-' }}</td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">{{ r.title || '-' }}</td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">
                        @if (r.professional_avatar_url) {
                          <div class="flex items-center gap-2">
                            <img [src]="r.professional_avatar_url" [alt]="r.professional_name || 'Professional'" class="w-8 h-8 rounded-full object-cover">
                            <span>{{ r.professional_name || '-' }}</span>
                          </div>
                        } @else {
                          {{ r.professional_name || '-' }}
                        }
                      </td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">{{ r.city || '-' }}</td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">{{ r.status || '-' }}</td>
                      <td class="py-3 pr-4 text-gray-700 dark:text-gray-200">
                        <div class="flex flex-col gap-1">
                          <div class="flex items-center gap-1">
                            <span class="font-semibold text-gray-600 dark:text-gray-200 text-xs">
                              {{ "scheduled" | i18n }}:
                            </span>
                            <span class="text-gray-500 dark:text-gray-300 whitespace-nowrap text-xs">
                              {{ formatScheduledDateTime(r) }}
                            </span>
                          </div>
                          <div class="flex items-center gap-1">
                            <span class="font-semibold text-gray-600 dark:text-gray-200 text-xs">
                              {{ "executionStartLabel" | i18n }}:
                            </span>
                            <span class="text-gray-500 dark:text-gray-300 whitespace-nowrap text-xs">
                              {{ r.actual_start_datetime ? formatDateTime(r.actual_start_datetime) : "—" }}
                            </span>
                          </div>
                          <div class="flex items-center gap-1">
                            <span class="font-semibold text-gray-600 dark:text-gray-200 text-xs">
                              {{ "executionEndLabel" | i18n }}:
                            </span>
                            <span class="text-gray-500 dark:text-gray-300 whitespace-nowrap text-xs">
                              {{ r.actual_end_datetime ? formatDateTime(r.actual_end_datetime) : "—" }}
                            </span>
                          </div>
                        </div>
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

            <!-- Mobile Card View -->
            <div class="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
              @for (r of filteredPaginatedRequests(); track r.id) {
                <div class="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-lg mb-4 shadow-sm">
                  <div class="flex flex-col gap-2 mb-2">
                    <div class="flex items-center justify-between">
                      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {{ r.title || ("service" | i18n) }}
                      </h3>
                      <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {{ r.status || '-' }}
                      </span>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="font-medium">{{ 'client' | i18n }}:</span> {{ r.client_name || '-' }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="font-medium">{{ 'professional' | i18n }}:</span>
                      @if (r.professional_avatar_url) {
                        <div class="flex items-center gap-2 mt-1">
                          <img [src]="r.professional_avatar_url" [alt]="r.professional_name || 'Professional'" class="w-6 h-6 rounded-full object-cover">
                          <span>{{ r.professional_name || '-' }}</span>
                        </div>
                      } @else {
                        {{ r.professional_name || '-' }}
                      }
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="font-medium">{{ 'locality' | i18n }}:</span> {{ r.city || '-' }}
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-300">
                      <span class="font-medium">{{ 'executionTimeline' | i18n }}:</span>
                      <div class="flex flex-col gap-1 mt-1 ml-2">
                        <div class="flex items-center gap-1">
                          <span class="font-semibold text-gray-600 dark:text-gray-200 text-xs">
                            {{ "scheduled" | i18n }}:
                          </span>
                          <span class="text-gray-500 dark:text-gray-300 whitespace-nowrap text-xs">
                            {{ formatScheduledDateTime(r) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="font-semibold text-gray-600 dark:text-gray-200 text-xs">
                            {{ "executionStartLabel" | i18n }}:
                          </span>
                          <span class="text-gray-500 dark:text-gray-300 whitespace-nowrap text-xs">
                            {{ r.actual_start_datetime ? formatDateTime(r.actual_start_datetime) : "—" }}
                          </span>
                        </div>
                        <div class="flex items-center gap-1">
                          <span class="font-semibold text-gray-600 dark:text-gray-200 text-xs">
                            {{ "executionEndLabel" | i18n }}:
                          </span>
                          <span class="text-gray-500 dark:text-gray-300 whitespace-nowrap text-xs">
                            {{ r.actual_end_datetime ? formatDateTime(r.actual_end_datetime) : "—" }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="flex justify-end mt-2">
                    <button
                      type="button"
                      class="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-brand-primary-600 text-white text-xs font-semibold hover:bg-brand-primary-700"
                      (click)="openScheduler(r)"
                    >
                      <i class="fa-solid fa-calendar-check"></i>
                      <span>{{ 'schedule' | i18n }}</span>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Pagination Controls (modelo inspirado em Solicitações do Admin) -->
            @if (filteredRequests().length > 0) {
              <div
                class="bg-white dark:bg-gray-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-0 mt-4 rounded-lg"
              >
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-700">{{ 'itemsPerPage' | i18n }}:</span>
                  <select
                    [value]="itemsPerPage()"
                    (change)="setItemsPerPage(+$any($event.target).value)"
                    class="border border-gray-300 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div class="hidden sm:block">
                  <p class="text-sm text-gray-700">
                    {{ 'showing' | i18n }}
                    <span class="font-medium">{{ (currentPage() - 1) * itemsPerPage() + 1 }}</span>
                    {{ 'to' | i18n }}
                    <span class="font-medium">{{ Math.min(currentPage() * itemsPerPage(), filteredRequests().length) }}</span>
                    {{ 'of' | i18n }}
                    <span class="font-medium">{{ filteredRequests().length }}</span>
                    {{ 'results' | i18n }}
                  </p>
                </div>

                <div class="flex justify-center sm:justify-end">
                  <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      (click)="previousPage()"
                      [disabled]="currentPage() === 1"
                      class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i class="fas fa-chevron-left"></i>
                      <span class="sr-only">Previous</span>
                    </button>

                    <!-- Page numbers (igual modelo do Admin) -->
                    <div class="hidden sm:flex">
                      @for (page of pageNumbers; track page) {
                        @if (page === -1) {
                          <span
                            class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            ...
                          </span>
                        } @else {
                          <button
                            (click)="goToPage(page)"
                            [class]="page === currentPage()
                              ? 'relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-brand-primary-50 dark:bg-brand-primary-900 text-sm font-medium text-brand-primary-500 dark:text-brand-primary-400'
                              : 'relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'"
                          >
                            {{ page }}
                          </button>
                        }
                      }
                    </div>

                    <!-- Mobile page indicator -->
                    <div
                      class="sm:hidden relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      {{ currentPage() }} / {{ totalPages() || 1 }}
                    </div>

                    <button
                      (click)="nextPage()"
                      [disabled]="currentPage() === totalPages() || totalPages() === 0"
                      class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i class="fas fa-chevron-right"></i>
                      <span class="sr-only">Next</span>
                    </button>
                  </nav>
                </div>
              </div>
            }
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
  readonly filterService = signal<string>("");
  readonly filterProfessional = signal<string>("");
  readonly filterLocality = signal<string>("");
  private readonly dataService = inject(DataService);

  readonly selectedRequest = signal<ServiceRequest | null>(null);
  readonly isSchedulerOpen = signal(false);

  // Filters (modelo inspirado em Solicitações do Admin)
  readonly showFilters = signal(true);
  readonly filterStatus = signal<string>("");
  readonly filterClient = signal<string>("");
  readonly filterStartDate = signal<string>("");
  readonly filterEndDate = signal<string>("");

  // Sorting
  readonly sortBy = signal<"scheduled" | "client" | "status" | "service" | "professional" | "locality">("scheduled");
  readonly sortOrder = signal<"asc" | "desc">("desc");

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly itemsPerPage = signal<number>(10);

  private parseFlexibleDateTime(raw?: string | null): number | null {
    if (!raw) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    const direct = Date.parse(trimmed);
    if (Number.isFinite(direct)) return direct;
    const normalized = trimmed.replace(/\s+/, "T");
    const normalizedParsed = Date.parse(normalized);
    if (Number.isFinite(normalizedParsed)) return normalizedParsed;
    return null;
  }

  formatScheduledDateTime(req: ServiceRequest): string {
    const millis = this.parseFlexibleDateTime(
      req.scheduled_start_datetime || req.scheduled_date
    );
    if (millis === null) return "—";

    const formatted = new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(millis));

    return formatted.replace(", ", " ");
  }

  formatDateTime(dateTime: string | null): string {
    if (!dateTime) return "—";
    const millis = this.parseFlexibleDateTime(dateTime);
    if (millis === null) return "—";

    const formatted = new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(millis));

    return formatted.replace(", ", " ");
  }

  private sortRequests(requests: ServiceRequest[]): ServiceRequest[] {
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();
    const multiplier = sortOrder === "asc" ? 1 : -1;

    const compareText = (a: string, b: string): number =>
      a.localeCompare(b, "pt-PT", { sensitivity: "base" });

    const toText = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return String(value);
      }
      return "";
    };

    const getScheduledMillis = (req: ServiceRequest): number | null =>
      this.parseFlexibleDateTime(req.scheduled_start_datetime || req.scheduled_date);

    return [...requests].sort((a, b) => {
      if (sortBy === "client") {
        return multiplier * compareText(toText(a.client_name), toText(b.client_name));
      }
      if (sortBy === "service") {
        return multiplier * compareText(toText(a.title), toText(b.title));
      }
      if (sortBy === "professional") {
        return multiplier * compareText(toText(a.professional_name), toText(b.professional_name));
      }
      if (sortBy === "locality") {
        return multiplier * compareText(toText(a.city), toText(b.city));
      }
      if (sortBy === "status") {
        return multiplier * compareText(toText(a.status), toText(b.status));
      }

      // scheduled (default)
      const aMillis = getScheduledMillis(a);
      const bMillis = getScheduledMillis(b);
      if (aMillis === null && bMillis === null) return 0;
      if (aMillis === null) return 1; // nulls at end
      if (bMillis === null) return -1;
      return multiplier * (aMillis - bMillis);
    });
  }

  readonly filteredRequests = computed(() => {
    let reqs = this.dataService.serviceRequests();
    const status = this.filterStatus();
    const clientQuery = this.filterClient().trim().toLocaleLowerCase("pt-PT");
    const serviceQuery = this.filterService().trim().toLocaleLowerCase("pt-PT");
    const professionalQuery = this.filterProfessional().trim().toLocaleLowerCase("pt-PT");
    const localityQuery = this.filterLocality().trim().toLocaleLowerCase("pt-PT");
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();

    if (status) {
      reqs = reqs.filter((r) => r.status === status);
    }

    if (clientQuery) {
      reqs = reqs.filter((r) =>
        String(r.client_name ?? "")
          .toLocaleLowerCase("pt-PT")
          .includes(clientQuery)
      );
    }

    if (serviceQuery) {
      reqs = reqs.filter((r) =>
        String(r.title ?? "")
          .toLocaleLowerCase("pt-PT")
          .includes(serviceQuery)
      );
    }

    if (professionalQuery) {
      reqs = reqs.filter((r) =>
        String(r.professional_name ?? "")
          .toLocaleLowerCase("pt-PT")
          .includes(professionalQuery)
      );
    }

    if (localityQuery) {
      reqs = reqs.filter((r) =>
        String(r.city ?? "")
          .toLocaleLowerCase("pt-PT")
          .includes(localityQuery)
      );
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      reqs = reqs.filter((r) => {
        const millis = this.parseFlexibleDateTime(
          r.scheduled_start_datetime || r.scheduled_date
        );
        if (millis === null) return false;
        const d = new Date(millis);
        return d >= start && d <= end;
      });
    }

    return this.sortRequests(reqs);
  });

  readonly filteredPaginatedRequests = computed(() => {
    const reqs = this.filteredRequests();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return reqs.slice(start, end);
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.filteredRequests().length / this.itemsPerPage())
  );

  Math = Math;
  get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 0) {
      return [1];
    }

    pages.push(1);
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);
    if (start > 2) pages.push(-1);
    for (let i = start; i <= end; i++) if (i !== 1 && i !== total) pages.push(i);
    if (end < total - 1) pages.push(-1);
    if (total > 1) pages.push(total);
    return pages;
  }

  constructor() {
    // Reset de página ao mudar filtros/ordenação
    effect(
      () => {
        this.filterStatus();
        this.filterClient();
        this.filterStartDate();
        this.filterEndDate();
        this.sortBy();
        this.sortOrder();
        this.itemsPerPage();
        this.currentPage.set(1);
      },
      { allowSignalWrites: true }
    );

    // Ajusta currentPage se ficar fora do range
    effect(
      () => {
        const total = this.totalPages();
        if (total <= 0) {
          if (this.currentPage() !== 1) {
            this.currentPage.set(1);
          }
          return;
        }
        if (this.currentPage() > total) {
          this.currentPage.set(total);
        }
      },
      { allowSignalWrites: true }
    );
  }

  toggleSort(column: "scheduled" | "client" | "status"): void {
    if (this.sortBy() !== column) {
      this.sortBy.set(column as any);
      this.sortOrder.set(column === "scheduled" ? "desc" : "asc");
      return;
    }
    this.sortOrder.update((o) => (o === "asc" ? "desc" : "asc"));
  }

  clearFilters(): void {
    this.filterStatus.set("");
    this.filterClient.set("");
    this.filterStartDate.set("");
    this.filterEndDate.set("");
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  goToPage(page: number): void {
    if (page !== -1) {
      this.currentPage.set(page);
    }
  }

  setItemsPerPage(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
  }

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
