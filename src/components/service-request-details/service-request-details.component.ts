import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ServiceRequest, User } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { TimeControlComponent } from "../time-control/time-control.component";
import { WorkflowTimelineComponent } from "../workflow-timeline/workflow-timeline.component";
import { ServiceClarificationsComponent } from "../service-clarifications/service-clarifications.component";
import { WorkflowService } from "../../services/workflow.service";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-service-request-details",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    I18nPipe,
    TimeControlComponent,
    WorkflowTimelineComponent,
    ServiceClarificationsComponent,
  ],
  template: `
    <!-- Cabeçalho Responsivo -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Botão Voltar e Título -->
          <div class="flex items-center space-x-4">
            <button
              (click)="close.emit()"
              class="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <i class="fas fa-arrow-left text-lg"></i>
            </button>
            <div>
              <h1
                class="text-lg sm:text-xl font-semibold text-gray-900 truncate"
              >
                {{ "serviceRequestDetails" | i18n }}
              </h1>
              @if (request()) {
              <p class="text-sm text-gray-500 truncate">
                {{ request().title }}
              </p>
              }
            </div>
          </div>

          <!-- Ações do Cabeçalho (Mobile-friendly) -->
          @if (availableActions().length > 0) {
          <div class="flex items-center space-x-2">
            <!-- Mobile: Dropdown menu -->
            <div class="block sm:hidden relative">
              <button
                (click)="toggleMobileActions()"
                class="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <i class="fas fa-ellipsis-v text-lg"></i>
              </button>
              @if (showMobileActions()) {
              <div
                class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20"
              >
                <div class="py-1">
                  @for (action of availableActions(); track action.type) {
                  <button
                    (click)="executeAction(action); toggleMobileActions()"
                    [disabled]="action.loading"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    @if (action.loading) {
                    <span
                      class="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"
                    ></span>
                    }
                    {{ action.label | i18n }}
                  </button>
                  }
                </div>
              </div>
              }
            </div>

            <!-- Desktop: Botões inline -->
            <div class="hidden sm:flex items-center space-x-2">
              @for (action of availableActions(); track action.type) {
              <button
                (click)="executeAction(action)"
                [disabled]="action.loading"
                [class]="getActionButtonClass(action) + ' text-sm px-3 py-2'"
              >
                @if (action.loading) {
                <span
                  class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                ></span>
                }
                {{ action.label | i18n }}
              </button>
              }
            </div>
          </div>
          }
        </div>
      </div>
    </div>

    <!-- Conteúdo Principal -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      @if (request()) {
      <div class="space-y-6">
        <!-- Workflow Timeline -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <app-workflow-timeline
            [serviceRequest]="request()"
          ></app-workflow-timeline>
        </div>

        <!-- Professional Responses -->
        @if (request().professional_responses &&
        request().professional_responses.length > 0) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "professionalResponses" | i18n }}
          </h3>
          <div class="space-y-4">
            @for (response of request().professional_responses; track
            response.professional_id) {
            <div class="border border-gray-200 rounded-lg p-4">
              <div
                class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3"
              >
                <h4 class="font-medium text-gray-800 mb-2 sm:mb-0">
                  {{ response.professional_name || ("professional" | i18n) }}
                </h4>
                <span
                  [class]="getResponseStatusClass(response.response_status)"
                >
                  {{ response.response_status || "pending" | i18n }}
                </span>
              </div>
              @if (response.quote_amount) {
              <p class="text-lg font-semibold text-green-600 mb-2">
                €{{ response.quote_amount | number : "1.2-2" }}
              </p>
              } @if (response.quote_notes) {
              <p class="text-sm text-gray-600 mb-2">
                {{ response.quote_notes }}
              </p>
              } @if (response.estimated_duration_hours) {
              <p class="text-sm text-gray-500 mb-3">
                {{ "estimatedDuration" | i18n }}:
                {{ response.estimated_duration_hours }}h
              </p>
              }

              <!-- Accept/Reject Quote Buttons for Client -->
              @if ( currentUser().role === "client" && request().client_id ===
              currentUser().id && response.response_status === "responded" &&
              request().status === "Orçamento enviado" ) {
              <div class="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  (click)="approveQuote.emit(request())"
                  class="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {{ "approveQuote" | i18n }}
                </button>
                <button
                  (click)="rejectQuote.emit(request())"
                  class="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {{ "rejectQuote" | i18n }}
                </button>
              </div>
              }
            </div>
            }
          </div>
        </div>
        }

        <!-- Service Request Details Card -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "requestInformation" | i18n }}
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "title" | i18n }}
                </label>
                <p class="text-gray-900">{{ request().title }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "description" | i18n }}
                </label>
                <p class="text-gray-900">{{ request().description }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "category" | i18n }}
                </label>
                <p class="text-gray-900">{{ request().category }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "priority" | i18n }}
                </label>
                <span [class]="getPriorityClass(request().priority)">
                  {{ request().priority | i18n }}
                </span>
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "status" | i18n }}
                </label>
                <span [class]="getStatusClass(request().status)">
                  {{ request().status }}
                </span>
              </div>

              @if (request().professional_name) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "professionalName" | i18n }}
                </label>
                <p class="text-gray-900">
                  {{
                    request().professional_name || ("nameNotAvailable" | i18n)
                  }}
                </p>
              </div>
              } @if (request().cost) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "cost" | i18n }}
                </label>
                <p class="text-lg font-semibold text-green-600">
                  €{{ request().cost | number : "1.2-2" }}
                </p>
              </div>
              }

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "createdAt" | i18n }}
                </label>
                <p class="text-gray-900">
                  {{ request().created_at | date : "short" }}
                </p>
              </div>

              @if (request().scheduled_date) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "scheduledDate" | i18n }}
                </label>
                <p class="text-gray-900">
                  {{ request().scheduled_date | date : "short" }}
                </p>
              </div>
              }
            </div>
          </div>
        </div>

        <!-- Address Information -->
        @if (request().address) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "address" | i18n }}
          </h3>
          <div class="text-gray-900">
            <p>
              {{ request().address.street }}, {{ request().address.number }}
            </p>
            <p>
              {{ request().address.postal_code }}
              {{ request().address.locality }}
            </p>
            <p>{{ request().address.district }}</p>
          </div>
        </div>
        }

        <!-- Time Control (for professionals) -->
        @if ( currentUser().role === "professional" && request().professional_id
        === currentUser().id && (request().status === "Em execução" ||
        request().status === "Orçamento aprovado") ) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "timeControl" | i18n }}
          </h3>
          <app-time-control
            [serviceRequest]="request()"
            [user]="currentUser()"
          ></app-time-control>
        </div>
        }

        <!-- Service Clarifications -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <app-service-clarifications
            [serviceRequest]="request()"
            [currentUser]="currentUser()"
          ></app-service-clarifications>
        </div>

        <!-- Action Buttons for mobile at bottom -->
        @if (availableActions().length > 0) {
        <div class="block sm:hidden">
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 class="text-sm font-medium text-gray-700 mb-3">
              {{ "availableActions" | i18n }}
            </h3>
            <div class="space-y-2">
              @for (action of availableActions(); track action.type) {
              <button
                (click)="executeAction(action)"
                [disabled]="action.loading"
                [class]="
                  getActionButtonClass(action) + ' w-full justify-center'
                "
              >
                @if (action.loading) {
                <span
                  class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                ></span>
                }
                {{ action.label | i18n }}
              </button>
              }
            </div>
          </div>
        </div>
        }
      </div>
      } @else {
      <div class="flex items-center justify-center h-64">
        <p class="text-gray-500">{{ "loadingServiceRequest" | i18n }}</p>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestDetailsComponent {
  request = input.required<ServiceRequest>();
  currentUser = input.required<User>();

  // Injeção de serviços
  private workflowService = inject(WorkflowService);
  private notificationService = inject(NotificationService);

  // Signals para UI state
  showMobileActions = signal(false);

  // Outputs para eventos
  close = output<void>();
  openChat = output<ServiceRequest>();
  approveQuote = output<ServiceRequest>();
  rejectQuote = output<ServiceRequest>();
  scheduleRequest = output<ServiceRequest>();
  payNow = output<ServiceRequest>();
  selectProfessional = output<{
    request: ServiceRequest;
    professionalId: string;
  }>();

  // Computed properties
  availableActions = computed(() => {
    const user = this.currentUser();
    const req = this.request();
    const actions = [];

    console.log("🔍 [Actions Debug] User role:", user.role);
    console.log("🔍 [Actions Debug] Request status:", req.status);

    // Fase 1: Solicitação e Orçamento
    if (
      user.role === "professional" &&
      req.status === "Solicitado" &&
      !req.professional_id
    ) {
      actions.push({
        type: "quote",
        label: "provideQuote",
        class: "primary",
        loading: false,
      });
    }

    // Fase 2: Aprovação de Orçamento (Cliente)
    if (
      user.role === "client" &&
      req.client_id === user.id &&
      req.status === "Orçamento enviado"
    ) {
      actions.push({
        type: "approve",
        label: "approveQuote",
        class: "primary",
        loading: false,
      });
      actions.push({
        type: "reject",
        label: "rejectQuote",
        class: "secondary",
        loading: false,
      });
    }

    // Fase 3: Agendamento
    if (
      user.role === "professional" &&
      req.professional_id === user.id &&
      req.status === "Orçamento aprovado" &&
      !req.scheduled_date
    ) {
      actions.push({
        type: "schedule",
        label: "scheduleService",
        class: "primary",
        loading: false,
      });
    }

    // Fase 4: Execução do Serviço
    if (
      user.role === "professional" &&
      req.professional_id === user.id &&
      req.status === "Agendado"
    ) {
      actions.push({
        type: "start",
        label: "startService",
        class: "primary",
        loading: false,
      });
    }

    if (
      user.role === "professional" &&
      req.professional_id === user.id &&
      req.status === "Em execução"
    ) {
      actions.push({
        type: "complete",
        label: "completeService",
        class: "primary",
        loading: false,
      });
    }

    // Fase 5: Pagamento
    if (
      user.role === "client" &&
      req.client_id === user.id &&
      req.status === "Concluído - Aguardando aprovação" &&
      req.cost &&
      !req.payment_status
    ) {
      actions.push({
        type: "pay",
        label: "payNow",
        class: "primary",
        loading: false,
      });
    }

    // Chat sempre disponível para partes envolvidas
    if (
      (user.role === "client" && req.client_id === user.id) ||
      (user.role === "professional" && req.professional_id === user.id)
    ) {
      actions.push({
        type: "chat",
        label: "chat",
        class: "secondary",
        loading: false,
      });
    }

    console.log("🔍 [Actions Debug] Available actions:", actions);
    return actions;
  });

  toggleMobileActions() {
    this.showMobileActions.update((current) => !current);
  }

  getActionButtonClass(action: any): string {
    const baseClasses =
      "inline-flex items-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    switch (action.class) {
      case "primary":
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white`;
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

  getStatusClass(status: string): string {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";

    switch (status) {
      case "Solicitado":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "Em análise":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "Orçamento enviado":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "Orçamento aprovado":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Agendado":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "Em execução":
        return `${baseClasses} bg-indigo-100 text-indigo-800`;
      case "Concluído - Aguardando aprovação":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Finalizado":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Orçamento rejeitado":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
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

  getResponseStatusClass(status: string): string {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";

    switch (status) {
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "responded":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "accepted":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  async executeAction(action: any) {
    try {
      action.loading = true;

      switch (action.type) {
        case "quote":
          // Lógica para fornecer orçamento
          break;
        case "approve":
          this.approveQuote.emit(this.request());
          break;
        case "reject":
          this.rejectQuote.emit(this.request());
          break;
        case "schedule":
          this.scheduleRequest.emit(this.request());
          break;
        case "start":
          // Lógica para iniciar serviço
          break;
        case "complete":
          // Lógica para completar serviço
          break;
        case "pay":
          this.payNow.emit(this.request());
          break;
        case "chat":
          this.openChat.emit(this.request());
          break;
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
    } finally {
      action.loading = false;
    }
  }
}
