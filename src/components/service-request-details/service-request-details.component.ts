import {
  Component,
  ChangeDetectionStrategy,
  input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import {
  ServiceRequest,
  User,
  ServiceStatus,
} from "@/src/models/maintenance.models";
import { I18nService } from "@/src/i18n.service";
import { StatusUtilsService } from "@/src/utils/status-utils.service";
import { extractPtAddressParts } from "@/src/utils/address-utils";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { TimeControlComponent } from "../time-control/time-control.component";
import { WorkflowTimelineComponent } from "../workflow-timeline/workflow-timeline.component";
import { ServiceClarificationsComponent } from "../service-clarifications/service-clarifications.component";
import { ServiceImagesComponent } from "../service-images/service-images.component";
import { NotificationService } from "../../services/notification.service";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { WorkflowServiceSimplified } from "../../services/workflow-simplified.service";

type ActionType = "schedule" | "start" | "complete" | "pay" | "chat";
type ActionClass = "primary" | "secondary" | "success" | "danger";

interface ServiceAction {
  type: ActionType;
  label: string;
  class: ActionClass;
  loading: boolean;
}

@Component({
  selector: "app-service-request-details",
  standalone: true,
  imports: [
    CommonModule,
    I18nPipe,
    TimeControlComponent,
    WorkflowTimelineComponent,
    ServiceClarificationsComponent,
    ServiceImagesComponent,
  ],
  template: `
    @if (!request()) {
    <div
      class="bg-red-100 text-red-700 p-4 rounded text-center font-semibold"
      role="alert"
      aria-live="polite"
    >
      <h3 class="text-xl font-bold mb-2">⚠️ {{ "error" | i18n }}</h3>
      {{ "noRequestSelected" | i18n }}<br />
      {{ "selectValidRequest" | i18n }}
    </div>
    } @else {
    <header
      class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-brand-primary-500 to-brand-primary-600"
      role="banner"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center">
            <i class="fas fa-file-alt mr-3" aria-hidden="true"></i>
            {{ "serviceRequestDetails" | i18n }}
          </h2>
          <p
            class="text-brand-primary-200 text-sm mt-1"
            [attr.aria-label]="'serviceTitle' | i18n : { title: request().title }"
          >
            {{ request().title }}
          </p>
        </div>
        <button
          (click)="logAndEmitCloseDetails()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-brand-primary-500 dark:text-brand-primary-400 text-sm font-medium rounded-lg hover:bg-brand-primary-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-primary-500 transition-all transform hover:scale-105 shadow-lg dark:shadow-gray-900 sm:w-auto w-full"
          [attr.aria-label]="'backToList' | i18n"
        >
          <i class="fas fa-arrow-left" aria-hidden="true"></i>
          <span>{{ "backToList" | i18n }}</span>
        </button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main">
      @if (request()) {
      <div class="space-y-6">
        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'workflowTimeline' | i18n"
        >
          <app-workflow-timeline
            [serviceRequest]="request()"
            role="complementary"
          ></app-workflow-timeline>
        </section>

        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'requestInformation' | i18n"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="request-info-title">
            {{ "requestInformation" | i18n }}
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6" [attr.aria-labelledby]="'request-info-title'">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="title-label">
                  {{ "title" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100 break-words" [attr.aria-labelledby]="'title-label'">
                  {{ request().title }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="description-label">
                  {{ "description" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100 break-words" [attr.aria-labelledby]="'description-label'">
                  {{ request().description }}
                </p>
              </div>
              @if (request().origin && currentUser().role !== 'professional') {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="origin-label">
                  {{ "origin" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'origin-label'">
                  {{ request().origin?.name || "—" }}
                </p>
              </div>
              }
              @if (currentUser().role === 'admin') {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="os-label">
                  {{ "osNumber" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'os-label'">
                  {{ request().os || "—" }}
                </p>
              </div>
              }
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="category-label">
                  {{ "category" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'category-label'">
                  {{ request().category?.name || "—" }}
                </p>
              </div>
              @if (request().subcategory) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="subcategory-label">
                  {{ "subcategory" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'subcategory-label'">
                  {{ request().subcategory?.name || "—" }}
                </p>
              </div>
              }
              @if (currentUser().role === "admin") {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="total-value-label">
                  {{ "TotalValue" | i18n }}
                </label>
                <p class="text-lg font-semibold text-green-600" [attr.aria-labelledby]="'total-value-label'">
                  @if (request().valor && request().valor > 0) {
                    {{ "currencySymbol" | i18n }} {{ request().valor | number : "1.2-2" }}
                  } @else {
                    &mdash;
                  }
                </p>
              </div>
              }
              @if (shouldShowProviderValue()) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="professional-value-label">
                  {{ "valorPrestador" | i18n }}
                </label>
                <p class="text-lg font-semibold text-blue-600 dark:text-blue-400" [attr.aria-labelledby]="'professional-value-label'">
                  @if (request().valor_prestador && request().valor_prestador > 0) {
                    {{ "currencySymbol" | i18n }} {{ request().valor_prestador | number : "1.2-2" }}
                  } @else {
                    &mdash;
                  }
                </p>
              </div>
              }
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="priority-label">
                  {{ "priority" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'priority-label'">
                  {{ request().priority | i18n }}
                </p>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="status-label">
                  {{ "status" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'status-label'" role="status">
                  {{ request().status || "—" }}
                </p>
              </div>

              @if (request().professional_name) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="professional-label">
                  {{ "professionalName" | i18n }}
                </label>
                <p
                  class="text-gray-900 dark:text-gray-100 truncate"
                  [attr.aria-labelledby]="'professional-label'"
                  [title]="request().professional_name"
                >
                  {{ request().professional_name || ("nameNotAvailable" | i18n) }}
                </p>
              </div>
              }

              @if (request().cost) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="cost-label">
                  {{ "cost" | i18n }}
                </label>
                <p class="text-lg font-semibold text-green-600" [attr.aria-labelledby]="'cost-label'">
                  {{ "currencySymbol" | i18n }} {{ request().cost | number : "1.2-2" }}
                </p>
              </div>
              }

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="created-at-label">
                  {{ "createdAt" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'created-at-label'">
                  @if (request().created_at) {
                    {{ request().created_at | date : "dd/MM/yyyy HH:mm" }}
                  } @else if (request().requested_date) {
                    {{ request().requested_date | date : "dd/MM/yyyy HH:mm" }}
                  } @else {
                    —
                  }
                </p>
              </div>

              @if (request().scheduled_date) {
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="scheduled-date-label">
                  {{ "scheduledDate" | i18n }}
                </label>
                <p class="text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'scheduled-date-label'">
                  {{ request().scheduled_date | date : "short" }}
                </p>
              </div>
              }
            </div>
          </div>
        </section>

        @if (
          request().client_name ||
          request().client_phone ||
          request().client_nif ||
          request().email_client
        ) {
        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'requesterInformation' | i18n"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="requester-info-title">
            {{ "requesterInformation" | i18n }}
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'requester-info-title'">
            @if (request().client_name) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-name-label">
                <i class="fas fa-user text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ "client" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-name-label'">
                {{ request().client_name }}
              </p>
            </div>
            }
            @if (request().client_phone) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-phone-label">
                <i class="fas fa-phone text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ "phone" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-phone-label'">
                {{ request().client_phone }}
              </p>
            </div>
            }
            @if (request().client_nif) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-nif-label">
                <i class="fas fa-id-card text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ "nif" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-nif-label'">
                {{ request().client_nif }}
              </p>
            </div>
            }
            @if (request().email_client) {
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="client-email-label">
                <i class="fas fa-envelope text-brand-primary-500 mr-1" aria-hidden="true"></i>
                {{ "email" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'client-email-label'">
                {{ request().email_client }}
              </p>
            </div>
            }
          </div>
        </section>
        }

        @if (hasAddress()) {
        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'address' | i18n"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="address-title">
            {{ "address" | i18n }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-900 dark:text-gray-100" [attr.aria-labelledby]="'address-title'">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="postal-code-label">
                {{ "postalCode" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'postal-code-label'">
                {{ request().zip_code || "—" }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="street-label">
                {{ "logradouro" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'street-label'">
                {{ request().street || request().street_manual || "—" }}
              </p>
              @if (request().street_manual && !request().street) {
                <span class="text-xs text-gray-500 dark:text-gray-400 italic">
                  {{ "manualEntry" | i18n }}
                </span>
              }
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="number-label">
                {{ "number" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'number-label'">
                {{ request().street_number || "—" }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="complement-label">
                {{ "complement" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'complement-label'">
                {{ request().complement || "—" }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="locality-label">
                {{ "locality" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'locality-label'">
                {{ addressParts().locality || "—" }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="city-label">
                {{ "concelho" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'city-label'">
                {{ request().city || "—" }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="district-label">
                {{ "district" | i18n }}
              </label>
              <p class="break-words" [attr.aria-labelledby]="'district-label'">
                {{ request().state || "—" }}
              </p>
            </div>
          </div>
        </section>
        }

        @if (hasPhotos()) {
        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'photos' | i18n"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="photos-title">
            {{ "photos" | i18n }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({{ request().photos!.length }})
            </span>
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4" role="grid" [attr.aria-labelledby]="'photos-title'">
            @for (photo of request().photos; track photo; let idx = $index) {
            <button
              class="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-brand-primary-500 dark:hover:border-brand-primary-400 hover:shadow-lg transition-all cursor-pointer group"
              (click)="openPhotoModal(photo)"
              [attr.aria-label]="'photoOf' | i18n : { number: idx + 1 }"
              type="button"
            >
              <img
                [src]="photo"
                [alt]="'photoOf' | i18n : { number: idx + 1 }"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center" aria-hidden="true">
                <i class="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 text-2xl transition-opacity"></i>
              </div>
            </button>
            }
          </div>
        </section>
        }

        @if (hasAttachments()) {
        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'attachments' | i18n"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="attachments-title">
            {{ "attachments" | i18n }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({{ request().attachments!.length }})
            </span>
          </h3>
          <div class="space-y-2" [attr.aria-labelledby]="'attachments-title'">
            @for (attachment of request().attachments; track attachment; let idx = $index) {
            <a
              [href]="attachment"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-brand-primary-500 transition-colors"
              [attr.aria-label]="'attachmentLink' | i18n : { number: idx + 1 }"
            >
              <i class="fas fa-file-alt text-gray-400 text-xl mr-3" aria-hidden="true"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  {{ "attachment" | i18n }} {{ idx + 1 }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ "clickToView" | i18n }}
                </p>
              </div>
              <i class="fas fa-external-link-alt text-gray-400" aria-hidden="true"></i>
            </a>
            }
          </div>
        </section>
        }

        @if (
          currentUser().role === "professional" &&
          request().professional_id === currentUser().id &&
          (request().status === "Em Progresso" || request().status === "Aceito")
        ) {
        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'timeControl' | i18n"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4" id="time-control-title">
            {{ "timeControl" | i18n }}
          </h3>
          <div [attr.aria-labelledby]="'time-control-title'">
            <app-time-control
              [request]="request()"
            ></app-time-control>
          </div>
        </section>
        }

        @if (request().professional_id) {
        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
          role="region"
          [attr.aria-label]="'serviceImages' | i18n"
        >
          <app-service-images
            [requestId]="request().id"
            [requestStatus]="request().status"
          ></app-service-images>
        </section>
        }

        <section
          class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          role="region"
          [attr.aria-label]="'serviceClarifications' | i18n"
        >
          <app-service-clarifications
            [serviceRequest]="request()"
            [currentUser]="currentUser()"
          ></app-service-clarifications>
        </section>

        @if (availableActions().length > 0) {
        <section class="block sm:hidden">
          <div
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            role="region"
            [attr.aria-label]="'availableActions' | i18n"
          >
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" id="mobile-actions-title">
              {{ "availableActions" | i18n }}
            </h3>
            <div class="space-y-2" [attr.aria-labelledby]="'mobile-actions-title'">
              @for (action of availableActions(); track action.type) {
              <button
                (click)="executeAction(action)"
                [disabled]="action.loading"
                [class]="getActionButtonClass(action) + ' w-full justify-center'"
                [attr.aria-label]="action.label | i18n"
              >
                @if (action.loading) {
                <span
                  class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                  aria-hidden="true"
                ></span>
                }
                {{ action.label | i18n }}
              </button>
              }
            </div>
          </div>
        </section>
        }
      </div>
      } @else {
      <div class="flex items-center justify-center h-64" role="status" aria-live="polite">
        <p class="text-gray-500 dark:text-gray-400">
          {{ "loadingServiceRequest" | i18n }}
        </p>
      </div>
      }
    </main>
    }

    @if (showPhotoModal()) {
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-2 sm:p-4"
      (click)="closePhotoModal()"
      role="dialog"
      [attr.aria-label]="'photoModal' | i18n"
      aria-modal="true"
    >
      <button
        (click)="closePhotoModal()"
        class="absolute top-2 sm:top-4 right-2 sm:right-4 text-white hover:text-gray-300 text-2xl sm:text-3xl z-10"
        [attr.aria-label]="'close' | i18n"
        type="button"
      >
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>

      <div class="max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-full" (click)="$event.stopPropagation()">
        <img
          [src]="selectedPhoto()"
          [alt]="'photo' | i18n"
          class="max-w-full max-h-[90vh] object-contain rounded-lg"
        >
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestDetailsComponent {
  @Output() businessRuleError = new EventEmitter<string>();

  requestInput = input<ServiceRequest>();
  currentUserInput = input<User>();

  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflowService = inject(WorkflowServiceSimplified);

  private readonly loadedRequest = signal<ServiceRequest | undefined>(undefined);
  private readonly loadedUser = signal<User | undefined>(undefined);

  request = computed(() => {
    const inputReq = this.requestInput();
    const loadedReq = this.loadedRequest();
    return inputReq || loadedReq;
  });
  currentUser = computed(() => this.currentUserInput() || this.loadedUser() || this.authService.appUser());

  private readonly requestEffect = effect(() => {
    const inputReq = this.requestInput();

    if (inputReq) {
      return;
    }

    const routeId = this.route.snapshot.params["id"];

    if (routeId) {
      const requests = this.dataService.serviceRequests();
      const foundRequest = requests.find((r) => r.id === Number.parseInt(routeId));
      if (foundRequest) {
        this.loadedRequest.set(foundRequest);
      } else {
        this.router.navigate(["/admin/requests"]);
      }
    }
  });

  private readonly userEffect = effect(() => {
    const inputUser = this.currentUserInput();
    if (!inputUser && !this.loadedUser()) {
      const authUser = this.authService.appUser();
      if (authUser) {
        this.loadedUser.set(authUser);
      }
    }
  });

  showMobileActions = signal(false);
  showPhotoModal = signal(false);
  selectedPhoto = signal<string | null>(null);

  hasAddress = computed(() => {
    const r = this.request();
    const nested = (r as any).address;
    return !!(
      nested?.street ||
      nested?.postal_code ||
      nested?.locality ||
      nested?.district ||
      r.street ||
      r.city ||
      r.state ||
      r.zip_code
    );
  });

  readonly addressParts = computed(() => extractPtAddressParts(this.request()));

  hasPhotos = computed(() => {
    const photos = this.request().photos;
    return photos && photos.length > 0;
  });

  hasAttachments = computed(() => {
    const attachments = this.request().attachments;
    return attachments && attachments.length > 0;
  });

  shouldShowProviderValue = computed(() => {
    const user = this.currentUser();
    if (user.role === "professional" && user.is_natan_employee === true) {
      return false;
    }
    return true;
  });

  @Output() closeDetails = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<ServiceRequest>();
  @Output() scheduleRequest = new EventEmitter<ServiceRequest>();
  @Output() payNow = new EventEmitter<ServiceRequest>();

  @Output() refreshRequest = new EventEmitter<void>();

  availableActions = computed<ServiceAction[]>(() => {
    const user = this.currentUser();
    const req = this.request();

    const allPossibleActions: (ServiceAction & { condition: boolean })[] = [
      {
        type: "schedule" as ActionType,
        label: "scheduleService",
        class: "primary" as ActionClass,
        loading: false,
        condition:
          user.role === "professional" &&
          req.professional_id === user.id &&
          req.status === "Aceito" &&
          !req.scheduled_date,
      },
      {
        type: "start" as ActionType,
        label: "startService",
        class: "primary" as ActionClass,
        loading: false,
        condition:
          user.role === "professional" &&
          req.professional_id === user.id &&
          req.status === "Data Definida",
      },
      {
        type: "complete" as ActionType,
        label: "completeService",
        class: "primary" as ActionClass,
        loading: false,
        condition:
          user.role === "professional" &&
          req.professional_id === user.id &&
          req.status === "Em Progresso",
      },
      {
        type: "pay" as ActionType,
        label: "payNow",
        class: "primary" as ActionClass,
        loading: false,
        condition:
          user.role === "admin" &&
          req.status === "Concluído" &&
          !req.payment_date,
      },
      {
        type: "chat" as ActionType,
        label: "chat",
        class: "secondary" as ActionClass,
        loading: false,
        condition:
          user.role === "admin" ||
          (user.role === "professional" && req.professional_id === user.id),
      },
    ];

    return allPossibleActions
      .filter((action) => action.condition)
      .map(({ condition, ...action }) => action);
  });

  toggleMobileActions() {
    this.showMobileActions.update((current) => !current);
  }

  getActionButtonClass(action: ServiceAction): string {
    const baseClasses =
      "inline-flex items-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    switch (action.class) {
      case "primary":
        return `${baseClasses} bg-brand-primary-600 hover:bg-brand-primary-700 text-white`;
      case "secondary":
        return `${baseClasses} bg-gray-600 hover:bg-gray-700 text-white`;
      case "success":
        return `${baseClasses} bg-green-600 hover:bg-green-700 text-white`;
      case "danger":
        return `${baseClasses} bg-red-600 hover:bg-red-700 text-white`;
      default:
        return `${baseClasses} bg-gray-300 hover:bg-gray-400 text-gray-700`;
    }
  }

  getStatusLabel(status: ServiceStatus): string {
    return StatusUtilsService.getLabel(status, inject(I18nService));
  }

  getPriorityClass(priority: string): string {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";

    switch (priority) {
      case "high":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "medium":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "low":
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  async executeAction(action: ServiceAction): Promise<void> {
    try {
      action.loading = true;

      switch (action.type) {
        case "schedule":
          this.scheduleRequest.emit(this.request());
          break;
        case "start":
          await this.handleStartService();
          break;
        case "complete":
          await this.handleCompleteService();
          break;
        case "pay":
          this.payNow.emit(this.request());
          break;
        case "chat":
          this.openChat.emit(this.request());
          break;
      }
    } catch (error) {
      console.error("Erro ao executar ação:", error);
      this.notificationService.addNotification(
        error instanceof Error ? error.message : "Erro ao executar ação",
      );
    } finally {
      action.loading = false;
    }
  }

  private async handleStartService(): Promise<void> {
    try {
      const currentUser = this.currentUser();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem iniciar serviços");
      }

      const success = await this.workflowService.startExecution(
        this.request().id,
        currentUser.id,
      );

      if (success) {
        this.refreshRequest.emit();
      }
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.includes("Tentativa de início antes da data agendada")
      ) {
        this.businessRuleError.emit(
          "Não é permitido iniciar o serviço antes da data agendada!",
        );
      } else {
        throw error;
      }
    }
  }

  private async handleCompleteService(): Promise<void> {
    try {
      const currentUser = this.currentUser();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem concluir serviços");
      }

      const success = await this.workflowService.completeExecution(
        this.request().id,
        currentUser.id,
      );

      if (success) {
        this.refreshRequest.emit();
      }
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.includes("Tentativa de conclusão antes do tempo mínimo")
      ) {
        this.businessRuleError.emit(
          "Não é permitido concluir o serviço antes do tempo mínimo!",
        );
      } else {
        throw error;
      }
    }
  }

  openPhotoModal(photoUrl: string): void {
    this.selectedPhoto.set(photoUrl);
    this.showPhotoModal.set(true);
  }

  closePhotoModal(): void {
    this.showPhotoModal.set(false);
    this.selectedPhoto.set(null);
  }

  logAndEmitCloseDetails() {
    this.closeDetails.emit();
    this.router.navigate(["/admin/requests"]);
  }

}

