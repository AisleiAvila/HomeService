import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  inject,
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
    <div class="p-6 bg-white rounded-lg relative max-h-full overflow-y-auto">
      <button
        (click)="close.emit()"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <i class="fas fa-times text-xl"></i>
      </button>

      <h2 class="text-2xl font-bold text-gray-800 mb-6">
        {{ "serviceRequestDetails" | i18n }}
      </h2>

      @if (request()) {
      <div class="space-y-6">
        <!-- Workflow Timeline -->
        <app-workflow-timeline
          [serviceRequest]="request()"
        ></app-workflow-timeline>

        <!-- Quick Actions Panel -->
        @if (availableActions().length > 0) {
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-sm font-medium text-blue-800 mb-3">
            {{ "availableActions" | i18n }}
          </h3>
          <div class="flex flex-wrap gap-2">
            @for (action of availableActions(); track action.type) {
            <button
              (click)="executeAction(action)"
              [disabled]="action.loading"
              [class]="getActionButtonClass(action)"
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

        <!-- Professional Responses -->
        @if (request().professional_responses &&
        request().professional_responses.length > 0) {
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "professionalResponses" | i18n }}
          </h3>
          <div class="space-y-3">
            @for (response of request().professional_responses; track
            response.professional_id) {
            <div class="bg-white rounded-md p-3 border">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-medium text-gray-800">
                  {{ response.professional_name || "Professional" }}
                </h4>
                <span
                  [class]="getResponseStatusClass(response.response_status)"
                >
                  {{ response.response_status || "pending" }}
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
              <p class="text-sm text-gray-500">
                {{ "estimatedDuration" | i18n }}:
                {{ response.estimated_duration_hours }}h
              </p>
              } @if (canSelectProfessional() && !response.selected) {
              <button
                (click)="
                  selectProfessional.emit({
                    request: request(),
                    professionalId: response.professional_id
                  })
                "
                class="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                {{ "selectProfessional" | i18n }}
              </button>
              }
            </div>
            }
          </div>
        </div>
        }

        <!-- Basic Information -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "basicInformation" | i18n }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "title" | i18n
              }}</label>
              <p class="text-sm text-gray-900">{{ request().title }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "category" | i18n
              }}</label>
              <p class="text-sm text-gray-900">{{ request().category }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "status" | i18n
              }}</label>
              <span [class]="statusClass(request().status)">{{
                request().status
              }}</span>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "requestDate" | i18n
              }}</label>
              <p class="text-sm text-gray-900">
                {{ request().requested_datetime | date : "medium" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "description" | i18n }}
          </h3>
          <p class="text-sm text-gray-900 whitespace-pre-wrap">
            {{ request().description }}
          </p>
          @if (request().urgency_level) {
          <div class="mt-2">
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              [class]="getUrgencyClass(request().urgency_level)"
            >
              {{ request().urgency_level | i18n }}
            </span>
          </div>
          }
        </div>

        <!-- Address -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "serviceAddress" | i18n }}
          </h3>
          <p class="text-sm text-gray-900">{{ formatAddress(request()) }}</p>
        </div>

        <!-- Contract Information -->
        @if (request().contract_id) {
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "contractInformation" | i18n }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "contractId" | i18n
              }}</label>
              <p class="text-sm text-gray-900">{{ request().contract_id }}</p>
            </div>
            @if (request().contract_signed_date) {
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "signedDate" | i18n
              }}</label>
              <p class="text-sm text-gray-900">
                {{ request().contract_signed_date | date : "medium" }}
              </p>
            </div>
            }
          </div>
        </div>
        }

        <!-- Cost and Payment Information -->
        @if (request().estimated_cost || request().final_cost ||
        request().payment_status) {
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "costAndPayment" | i18n }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @if (request().estimated_cost) {
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "estimatedCost" | i18n
              }}</label>
              <p class="text-lg font-semibold text-blue-600">
                €{{ request().estimated_cost | number : "1.2-2" }}
              </p>
            </div>
            } @if (request().final_cost) {
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "finalCost" | i18n
              }}</label>
              <p class="text-lg font-semibold text-green-600">
                €{{ request().final_cost | number : "1.2-2" }}
              </p>
            </div>
            } @if (request().payment_status) {
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "paymentStatus" | i18n
              }}</label>
              <span [class]="paymentStatusClass(request().payment_status)">{{
                request().payment_status
              }}</span>
            </div>
            }
          </div>
          @if (request().platform_fee) {
          <div class="mt-3">
            <label class="block text-sm font-medium text-gray-600">{{
              "platformFee" | i18n
            }}</label>
            <p class="text-sm text-gray-900">
              €{{ request().platform_fee | number : "1.2-2" }} (7%)
            </p>
          </div>
          }
        </div>
        }

        <!-- Professional Information -->
        @if (request().professional_id) {
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "assignedProfessional" | i18n }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "professionalId" | i18n
              }}</label>
              <p class="text-sm text-gray-900">
                {{ request().professional_id }}
              </p>
            </div>
            @if (request().professional_confirmed_date) {
            <div>
              <label class="block text-sm font-medium text-gray-600">{{
                "confirmedDate" | i18n
              }}</label>
              <p class="text-sm text-gray-900">
                {{ request().professional_confirmed_date | date : "medium" }}
              </p>
            </div>
            }
          </div>
        </div>
        }

        <!-- Time Control Component -->
        <app-time-control
          [request]="request()"
          (onStartWork)="handleStartWork($event)"
          (onFinishWork)="handleFinishWork($event)"
          (onUpdateDuration)="handleUpdateDuration($event)"
        >
        </app-time-control>

        <!-- Request ID -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">
            {{ "requestId" | i18n }}
          </h3>
          <p class="text-sm text-gray-600">{{ request().id }}</p>
        </div>

        <!-- Service Clarifications -->
        <app-service-clarifications
          [serviceRequest]="request()"
          [currentUser]="currentUser()"
          (clarificationAdded)="onClarificationAdded()"
        >
        </app-service-clarifications>
      </div>
      }

      <!-- Action Buttons -->
      <div class="pt-6 flex justify-end space-x-3">
        <button
          (click)="openChat.emit(request())"
          class="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
        >
          {{ "chat" | i18n }}
        </button>
        <button
          (click)="close.emit()"
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          {{ "close" | i18n }}
        </button>
      </div>
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

  // Outputs para eventos
  close = output<void>();
  openChat = output<ServiceRequest>();
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
    if (req.status === "Aguardando esclarecimentos" && user.role === "client") {
      actions.push({
        type: "provide_clarification",
        label: "provideClarification",
        icon: "💬",
        loading: false,
      });
    }

    if (req.status === "Orçamento enviado" && user.role === "client") {
      console.log("✅ [Actions Debug] Adding quote actions for client");
      actions.push(
        {
          type: "approve_quote",
          label: "approveQuote",
          icon: "✅",
          loading: false,
        },
        {
          type: "request_revision",
          label: "requestRevision",
          icon: "📝",
          loading: false,
        }
      );
    }

    // Fase 2: Seleção e Agendamento
    if (req.status === "Orçamento aprovado" && user.role === "professional") {
      actions.push({
        type: "respond_to_approval",
        label: "respondToApproval",
        icon: "📋",
        loading: false,
      });
    }

    if (
      req.status === "Profissional selecionado" &&
      user.role === "professional"
    ) {
      actions.push(
        {
          type: "accept_assignment",
          label: "acceptAssignment",
          icon: "✅",
          loading: false,
        },
        {
          type: "decline_assignment",
          label: "declineAssignment",
          icon: "❌",
          loading: false,
        }
      );
    }

    if (
      req.status === "Aguardando confirmação do profissional" &&
      user.role === "client"
    ) {
      actions.push({
        type: "schedule_service",
        label: "scheduleService",
        icon: "📅",
        loading: false,
      });
    }

    // Fase 3: Execução
    if (req.status === "Agendado" && user.role === "professional") {
      actions.push({
        type: "start_work",
        label: "startWork",
        icon: "🔧",
        loading: false,
      });
    }

    if (req.status === "Em execução" && user.role === "professional") {
      actions.push({
        type: "complete_work",
        label: "completeWork",
        icon: "✅",
        loading: false,
      });
    }

    // Fase 4: Aprovação e Pagamento
    if (
      req.status === "Concluído - Aguardando aprovação" &&
      user.role === "client"
    ) {
      actions.push(
        {
          type: "approve_completion",
          label: "approveCompletion",
          icon: "👍",
          loading: false,
        },
        {
          type: "reject_completion",
          label: "rejectCompletion",
          icon: "👎",
          loading: false,
        }
      );
    }

    if (req.status === "Aprovado pelo cliente" && user.role === "client") {
      actions.push({
        type: "make_payment",
        label: "makePayment",
        icon: "💳",
        loading: false,
      });
    }

    console.log("🔍 [Actions Debug] Final actions count:", actions.length);
    console.log(
      "🔍 [Actions Debug] Actions:",
      actions.map((a) => a.type)
    );

    return actions;
  });

  canSelectProfessional = computed(() => {
    const user = this.currentUser();
    const req = this.request();
    return user.role === "client" && req.status === "Orçamento aprovado";
  });

  // Métodos de execução de ações
  async executeAction(action: any): Promise<void> {
    const req = this.request();
    action.loading = true;

    try {
      switch (action.type) {
        case "provide_clarification":
          await this.workflowService.provideClarification(
            req.id,
            "Clarifications provided by client"
          );
          break;
        case "approve_quote":
          await this.workflowService.approveQuote(req.id);
          break;
        case "request_revision":
          await this.workflowService.requestClarification(
            req.id,
            "Revision requested by client"
          );
          break;
        case "respond_to_approval":
          if (req.professional_id) {
            await this.workflowService.selectProfessional(
              req.id,
              req.professional_id
            );
          }
          break;
        case "accept_assignment":
          await this.workflowService.professionalAcceptJob(req.id);
          break;
        case "decline_assignment":
          await this.workflowService.professionalRejectJob(
            req.id,
            "Assignment declined"
          );
          break;
        case "schedule_service":
          await this.workflowService.scheduleWork(req.id, new Date());
          break;
        case "start_work":
          await this.workflowService.startWork(req.id);
          break;
        case "complete_work":
          await this.workflowService.completeWork(req.id);
          break;
        case "approve_completion":
          await this.workflowService.approveWork(req.id);
          break;
        case "reject_completion":
          await this.workflowService.rejectWork(
            req.id,
            "Work not satisfactory"
          );
          break;
        case "make_payment":
          await this.workflowService.processPayment(req.id);
          break;
      }

      this.notificationService.addNotification(
        `Action ${action.label} completed successfully`
      );
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
      this.notificationService.addNotification(
        `Failed to execute ${action.label}`
      );
    } finally {
      action.loading = false;
    }
  }

  showActionButtons = computed(() => {
    const user = this.currentUser();
    const req = this.request();

    // Show action buttons for clients or relevant statuses
    return (
      user.role === "client" ||
      req.status === "Em execução" ||
      req.status === "Concluído - Aguardando aprovação"
    );
  });

  formatAddress(request: ServiceRequest): string {
    return `${request.street}, ${request.city}, ${request.state} ${request.zip_code}`;
  }

  statusClass(status: string): string {
    const baseClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const colorClasses: { [key: string]: string } = {
      Solicitado: "bg-blue-100 text-blue-800",
      "Em análise": "bg-yellow-100 text-yellow-800",
      "Aguardando esclarecimentos": "bg-amber-100 text-amber-800",
      "Orçamento enviado": "bg-cyan-100 text-cyan-800",
      "Aguardando aprovação do orçamento": "bg-indigo-100 text-indigo-800",
      "Orçamento aprovado": "bg-green-100 text-green-800",
      "Orçamento rejeitado": "bg-red-100 text-red-800",
      "Buscando profissional": "bg-purple-100 text-purple-800",
      "Profissional selecionado": "bg-teal-100 text-teal-800",
      "Aguardando confirmação do profissional": "bg-orange-100 text-orange-800",
      Agendado: "bg-blue-100 text-blue-800",
      "Em execução": "bg-purple-100 text-purple-800",
      "Concluído - Aguardando aprovação": "bg-lime-100 text-lime-800",
      "Aprovado pelo cliente": "bg-green-100 text-green-800",
      "Rejeitado pelo cliente": "bg-red-100 text-red-800",
      Pago: "bg-emerald-100 text-emerald-800",
      Finalizado: "bg-green-100 text-green-800",
      Cancelado: "bg-red-100 text-red-800",
    };
    return `${baseClass} ${
      colorClasses[status] || "bg-gray-100 text-gray-800"
    }`;
  }

  paymentStatusClass(status: string): string {
    const baseClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const colorClasses: { [key: string]: string } = {
      Paid: "bg-green-100 text-green-800",
      Unpaid: "bg-orange-100 text-orange-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Processing: "bg-blue-100 text-blue-800",
      Released: "bg-emerald-100 text-emerald-800",
      Disputed: "bg-red-100 text-red-800",
    };
    return `${baseClass} ${
      colorClasses[status] || "bg-gray-100 text-gray-800"
    }`;
  }

  getUrgencyClass(urgency: string): string {
    const colorClasses: { [key: string]: string } = {
      low: "bg-green-100 text-green-800",
      normal: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colorClasses[urgency] || "bg-gray-100 text-gray-800";
  }

  getResponseStatusClass(status: string): string {
    const baseClass =
      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    const colorClasses: { [key: string]: string } = {
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    };
    return `${baseClass} ${
      colorClasses[status] || "bg-gray-100 text-gray-800"
    }`;
  }

  getActionButtonClass(action: any): string {
    const baseClass =
      "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";

    if (action.loading) {
      return `${baseClass} bg-gray-400 text-white cursor-not-allowed`;
    }

    const typeClasses: { [key: string]: string } = {
      provide_clarification: "bg-blue-600 hover:bg-blue-700 text-white",
      approve_quote: "bg-green-600 hover:bg-green-700 text-white",
      request_revision: "bg-yellow-600 hover:bg-yellow-700 text-white",
      respond_to_approval: "bg-purple-600 hover:bg-purple-700 text-white",
      accept_assignment: "bg-green-600 hover:bg-green-700 text-white",
      decline_assignment: "bg-red-600 hover:bg-red-700 text-white",
      schedule_service: "bg-teal-600 hover:bg-teal-700 text-white",
      start_work: "bg-indigo-600 hover:bg-indigo-700 text-white",
      complete_work: "bg-emerald-600 hover:bg-emerald-700 text-white",
      approve_completion: "bg-green-600 hover:bg-green-700 text-white",
      reject_completion: "bg-red-600 hover:bg-red-700 text-white",
      make_payment: "bg-blue-600 hover:bg-blue-700 text-white",
    };

    return `${baseClass} ${
      typeClasses[action.type] || "bg-gray-600 hover:bg-gray-700 text-white"
    }`;
  }

  // Métodos para lidar com eventos do controle de tempo
  handleStartWork(requestId: number): void {
    console.log("Trabalho iniciado para pedido:", requestId);
  }

  handleFinishWork(requestId: number): void {
    console.log("Trabalho finalizado para pedido:", requestId);
  }

  handleUpdateDuration(event: { requestId: number; duration: number }): void {
    console.log(
      "Duração atualizada para pedido:",
      event.requestId,
      "duração:",
      event.duration
    );
  }

  // Método para lidar com esclarecimentos adicionados
  onClarificationAdded(): void {
    console.log(
      "Novo esclarecimento adicionado para pedido:",
      this.request().id
    );
    // O componente de esclarecimentos já atualiza automaticamente
    // Este método pode ser usado para outras ações se necessário
  }
}
