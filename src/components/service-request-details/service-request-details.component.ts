import {
  Component,
  ChangeDetectionStrategy,
  input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ServiceRequest,
  User,
  ServiceStatus,
} from "@/src/models/maintenance.models";
import { I18nService } from "@/src/i18n.service";
import { StatusUtilsService } from "@/src/utils/status-utils.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { TimeControlComponent } from "../time-control/time-control.component";
import { WorkflowTimelineComponent } from "../workflow-timeline/workflow-timeline.component";
import { ServiceClarificationsComponent } from "../service-clarifications/service-clarifications.component";
import { WorkflowService } from "../../services/workflow.service";
import { NotificationService } from "../../services/notification.service";
import { extractPtAddressParts } from "@/src/utils/address-utils";

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
  outputs: ["businessRuleError"],
  template: `
    @if (!request()) {
    <div class="bg-red-100 text-red-700 p-4 rounded text-center font-semibold">
      Erro: Nenhuma solicitação selecionada ou dados inválidos.<br />
      Volte e selecione uma solicitação válida.<br />
      <span style="font-size:12px;"
        >[DEBUG] request(): {{ request() | json }}</span
      >
    </div>
    } @else {
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
              <p class="text-sm text-gray-500 truncate">
                {{ request().title }}
              </p>
            </div>
          </div>
          <!-- ...restante do template... -->
        </div>
      </div>
    </div>
    <!-- ...restante do template... -->
    }

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

        <!-- Address Information (detailed with labels) -->
        @if (hasAddress()) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "address" | i18n }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-900">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ 'streetAddress' | i18n }}
              </label>
              <p class="break-words">{{ addressParts().streetNumber || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ 'postalCode' | i18n }}
              </label>
              <p class="break-words">{{ addressParts().postalCode || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ 'locality' | i18n }}
              </label>
              <p class="break-words">{{ addressParts().locality || '—' }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ 'district' | i18n }}
              </label>
              <p class="break-words">{{ addressParts().district || '—' }}</p>
            </div>
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
  @Output() businessRuleError = new EventEmitter<string>();
  request = input.required<ServiceRequest>();
  currentUser = input.required<User>();

  // Injeção de serviços
  private readonly workflowService = inject(WorkflowService);
  private readonly notificationService = inject(NotificationService);

  // Signals para UI state
  showMobileActions = signal(false);

  // Verifica se há dados de endereço (aninhado ou campos planos)
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

  // Linhas de endereço formatadas PT
  private addressParts = computed(() => extractPtAddressParts(this.request()));
  addressLine1 = computed(() => this.addressParts().streetNumber);
  addressLine2 = computed(() => {
    const p = this.addressParts();
    return [p.postalCode, p.locality].filter(Boolean).join(" ");
  });
  addressLine3 = computed(() => this.addressParts().district);

  // Outputs para eventos
  @Output() close = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<ServiceRequest>();
  @Output() approveQuote = new EventEmitter<ServiceRequest>();
  @Output() rejectQuote = new EventEmitter<ServiceRequest>();
  @Output() scheduleRequest = new EventEmitter<ServiceRequest>();
  @Output() payNow = new EventEmitter<ServiceRequest>();
  @Output() selectProfessional = new EventEmitter<{
    request: ServiceRequest;
    professionalId: string;
  }>();

  @Output() refreshRequest = new EventEmitter<void>();

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

  getStatusClass(status: ServiceStatus): string {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    // Usa cor do utilitário centralizado
    const color = StatusUtilsService.getColor(status);
    return `${baseClasses} text-white`;
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
          try {
            await this.workflowService.startWork(this.request().id);
            this.notificationService.addNotification(
              "Serviço iniciado com sucesso!"
            );
            this.refreshRequest.emit();
          } catch (error: any) {
            if (
              error instanceof Error &&
              error.message.includes(
                "Tentativa de início antes da data agendada"
              )
            ) {
              this.businessRuleError.emit(
                "Não é permitido iniciar o serviço antes da data agendada!"
              );
            } else {
              throw error;
            }
          }
          break;
        case "complete":
          try {
            await this.workflowService.completeWork(this.request().id);
            this.notificationService.addNotification(
              "Serviço marcado como concluído!"
            );
            this.refreshRequest.emit();
          } catch (error: any) {
            if (
              error instanceof Error &&
              error.message.includes(
                "Tentativa de conclusão antes do tempo mínimo"
              )
            ) {
              this.businessRuleError.emit(
                "Não é permitido concluir o serviço antes do tempo mínimo!"
              );
            } else {
              throw error;
            }
          }
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
