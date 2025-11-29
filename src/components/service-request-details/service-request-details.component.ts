import {
  Component,
  ChangeDetectionStrategy,
  input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
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
import { NotificationService } from "../../services/notification.service";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
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
              (click)="closeDetails.emit()"
              class="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="{{ 'backToList' | i18n }}"
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

        <!-- Professional Responses / Respostas dos Profissionais -->
        @if (professionalQuotes().length > 0) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "professionalResponses" | i18n }}
            <span class="text-sm font-normal text-gray-500 ml-2">
              ({{ professionalQuotes().length }} {{ professionalQuotes().length === 1 ? ('response' | i18n) : ('responses' | i18n) }})
            </span>
          </h3>
          <div class="space-y-4">
            @for (quote of professionalQuotes(); track quote.professional_id) {
            <div 
              class="border rounded-lg p-4 transition-all"
              [class.border-green-500]="quote.isSelected"
              [class.bg-green-50]="quote.isSelected"
              [class.border-gray-200]="!quote.isSelected"
            >
              <!-- Cabeçalho da resposta -->
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                <div class="flex items-center space-x-3 mb-2 sm:mb-0">
                  @if (quote.professional_avatar_url) {
                  <img 
                    [src]="quote.professional_avatar_url" 
                    [alt]="quote.professional_name"
                    class="w-10 h-10 rounded-full object-cover"
                  >
                  } @else {
                  <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-user text-blue-600"></i>
                  </div>
                  }
                  <div>
                    <h4 class="font-medium text-gray-800">
                      {{ quote.professional_name || ("professional" | i18n) }}
                    </h4>
                    @if (quote.professional_rating) {
                    <div class="flex items-center mt-1">
                      <i class="fas fa-star text-yellow-400 text-xs"></i>
                      <span class="text-xs text-gray-600 ml-1">{{ quote.professional_rating.toFixed(1) }}</span>
                    </div>
                    }
                  </div>
                </div>
                
                <div class="flex items-center space-x-2">
                  @if (quote.isSelected) {
                  <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    <i class="fas fa-check-circle mr-1"></i>
                    {{ "selected" | i18n }}
                  </span>
                  }
                  @if (quote.isLowest && quote.hasQuote) {
                  <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    <i class="fas fa-award mr-1"></i>
                    {{ "lowestQuote" | i18n }}
                  </span>
                  }
                  <span [class]="getResponseStatusClass(quote.response_status)">
                    {{ quote.response_status | i18n }}
                  </span>
                </div>
              </div>

              <!-- Valor e detalhes do orçamento - DEPRECATED: Sistema novo não usa orçamentos -->
              <!-- @if (quote.hasQuote) {
              <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                <div class="flex items-baseline justify-between mb-2">
                  <span class="text-sm text-gray-600">{{ "quoteValue" | i18n }}:</span>
                  <p class="text-2xl font-bold text-green-600">
                    €{{ quote.quote_amount | number : "1.2-2" }}
                  </p>
                </div>
                
                @if (quote.estimated_duration_hours) {
                <div class="flex items-center text-sm text-gray-600 mt-2">
                  <i class="fas fa-clock mr-2"></i>
                  <span>{{ "estimatedDuration" | i18n }}: {{ quote.estimated_duration_hours }}h</span>
                </div>
                }

                @if (quote.quote_notes) {
                <div class="mt-3 pt-3 border-t border-gray-200">
                  <p class="text-sm font-medium text-gray-700 mb-1">{{ "notes" | i18n }}:</p>
                  <p class="text-sm text-gray-600">{{ quote.quote_notes }}</p>
                </div>
                }

                @if (quote.responded_at) {
                <div class="mt-2 text-xs text-gray-500">
                  <i class="fas fa-calendar-alt mr-1"></i>
                  {{ "respondedAt" | i18n }}: {{ quote.responded_at | date : "short" }}
                </div>
                }
              </div>
              } @else { -->
              
              <!-- Status de resposta do profissional -->
              @if (quote.response_status === 'pending' || quote.response_status === 'responded') {
              <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p class="text-sm text-yellow-800">
                  <i class="fas fa-clock mr-2"></i>
                  {{ "awaitingQuote" | i18n }}
                </p>
              </div>
              }
              <!-- } FIM DA SEÇÃO DEPRECATED DE ORÇAMENTOS -->

              <!-- Botões de ação para admin - SIMPLIFICADO: apenas seleção de profissional -->
              @if (currentUser().role === "admin" && (quote.response_status === "responded" || quote.response_status === "accepted") && !quote.isSelected) {
              <div class="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  (click)="selectSpecificProfessional(quote.professional_id)"
                  class="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  <i class="fas fa-check mr-2"></i>
                  {{ "selectProfessional" | i18n }}
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

        <!-- Photos Gallery -->
        @if (hasPhotos()) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "photos" | i18n }}
            <span class="text-sm font-normal text-gray-500 ml-2">
              ({{ request().photos!.length }})
            </span>
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            @for (photo of request().photos; track photo; let idx = $index) {
            <div 
              class="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
              (click)="openPhotoModal(photo)"
            >
              <img 
                [src]="photo" 
                [alt]="'photoOf' | i18n : { number: idx + 1 }"
                class="w-full h-full object-cover"
                loading="lazy"
              >
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <i class="fas fa-search-plus text-white opacity-0 group-hover:opacity-100 text-2xl transition-opacity"></i>
              </div>
            </div>
            }
          </div>
        </div>
        }

        <!-- Attachments -->
        @if (hasAttachments()) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            {{ "attachments" | i18n }}
            <span class="text-sm font-normal text-gray-500 ml-2">
              ({{ request().attachments!.length }})
            </span>
          </h3>
          <div class="space-y-2">
            @for (attachment of request().attachments; track attachment; let idx = $index) {
            <a 
              [href]="attachment"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors"
            >
              <i class="fas fa-file-alt text-gray-400 text-xl mr-3"></i>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  {{ "attachment" | i18n }} {{ idx + 1 }}
                </p>
                <p class="text-xs text-gray-500">{{ "clickToView" | i18n }}</p>
              </div>
              <i class="fas fa-external-link-alt text-gray-400"></i>
            </a>
            }
          </div>
        </div>
        }

        <!-- Time Control (for professionals) -->
        @if ( currentUser().role === "professional" && request().professional_id
        === currentUser().id && (request().status === "Em Progresso" ||
        request().status === "Aceito") ) {
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
    }

    <!-- Photo Modal -->
    @if (showPhotoModal()) {
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      (click)="closePhotoModal()"
    >
      <button
        (click)="closePhotoModal()"
        class="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl z-10"
        aria-label="{{ 'close' | i18n }}"
      >
        <i class="fas fa-times"></i>
      </button>
      
      <div class="max-w-6xl max-h-full" (click)="$event.stopPropagation()">
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
export class ServiceRequestDetailsComponent implements OnInit {
  @Output() businessRuleError = new EventEmitter<string>();
  
  // Input opcional - usado quando o componente é chamado diretamente (via parent)
  protected requestInput = input<ServiceRequest | undefined>(undefined);
  protected currentUserInput = input<User | undefined>(undefined);

  // Injeção de serviços
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Signal para request carregado via rota
  private readonly loadedRequest = signal<ServiceRequest | undefined>(undefined);
  private readonly loadedUser = signal<User | undefined>(undefined);

  // Request e User efetivos usados em todo o template
  request = computed(() => this.requestInput() || this.loadedRequest());
  currentUser = computed(() => this.currentUserInput() || this.loadedUser() || this.authService.appUser());

  ngOnInit() {
    // Se não há request via input, buscar pelo ID da rota
    if (!this.requestInput()) {
      this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
          const requests = this.dataService.serviceRequests();
          const foundRequest = requests.find(r => r.id === Number.parseInt(id));
          if (foundRequest) {
            this.loadedRequest.set(foundRequest);
          } else {
            console.error('Request não encontrado:', id);
            this.router.navigate(['/admin/requests']);
          }
        }
      });
    }

    // Se não há user via input, usar o user autenticado
    if (!this.currentUserInput()) {
      const user = this.authService.appUser();
      if (user) {
        this.loadedUser.set(user);
      }
    }
  }

  // Signals para UI state
  showMobileActions = signal(false);
  showPhotoModal = signal(false);
  selectedPhoto = signal<string | null>(null);

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
  private readonly addressParts = computed(() => extractPtAddressParts(this.request()));
  addressLine1 = computed(() => this.addressParts().streetNumber);
  addressLine2 = computed(() => {
    const p = this.addressParts();
    return [p.postalCode, p.locality].filter(Boolean).join(" ");
  });
  addressLine3 = computed(() => this.addressParts().district);

  // Organiza e enriquece respostas de profissionais
  professionalQuotes = computed(() => {
    const req = this.request();
    const responses = req.professional_responses || [];
    
    if (responses.length === 0) return [];

    // Encontra o menor orçamento
    const amounts = responses
      .map(r => r.quote_amount)
      .filter((amt): amt is number => amt !== null && amt !== undefined);
    const lowestAmount = amounts.length > 0 ? Math.min(...amounts) : null;

    return responses.map(r => ({
      ...r,
      isSelected: r.professional_id === req.professional_id,
      isLowest: lowestAmount !== null && r.quote_amount === lowestAmount && r.quote_amount !== null,
      hasQuote: r.quote_amount !== null && r.quote_amount > 0,
    }));
  });

  // Verifica se há fotos anexadas
  hasPhotos = computed(() => {
    const photos = this.request().photos;
    return photos && photos.length > 0;
  });

  // Verifica se há anexos
  hasAttachments = computed(() => {
    const attachments = this.request().attachments;
    return attachments && attachments.length > 0;
  });

  // Outputs para eventos
  @Output() closeDetails = new EventEmitter<void>();
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

    console.log("🔍 [Actions Debug] User role:", user.role);
    console.log("🔍 [Actions Debug] Request status:", req.status);

    const allPossibleActions = [
      // SISTEMA NOVO: Sem fase de orçamentos
      // Profissional não fornece mais orçamento, apenas aceita/recusa atribuição
      
      // Fase 1: Agendamento (após profissional aceitar)
      {
        type: "schedule",
        label: "scheduleService",
        class: "primary",
        loading: false,
        condition: user.role === "professional" && req.professional_id === user.id && req.status === "Aceito" && !req.scheduled_date,
      },
      // Fase 2: Execução do Serviço
      {
        type: "start",
        label: "startService",
        class: "primary",
        loading: false,
        condition: user.role === "professional" && req.professional_id === user.id && req.status === "Data Definida",
      },
      {
        type: "complete",
        label: "completeService",
        class: "primary",
        loading: false,
        condition: user.role === "professional" && req.professional_id === user.id && req.status === "Em Progresso",
      },
      // Fase 3: Pagamento (Admin)
      {
        type: "pay",
        label: "payNow",
        class: "primary",
        loading: false,
        condition: user.role === "admin" && req.status === "Aguardando Finalização" && !req.payment_date,
      },
      // Chat sempre disponível para partes envolvidas
      {
        type: "chat",
        label: "chat",
        class: "secondary",
        loading: false,
        condition: (user.role === "admin" || (user.role === "professional" && req.professional_id === user.id)),
      },
    ];

    const actions = allPossibleActions
      .filter((action) => action.condition)
      .map(({ condition, ...action }) => action);

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
    return `${baseClasses} ${color} text-white`;
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
        // REMOVIDO: case "quote" - Sistema novo não tem orçamentos
        // REMOVIDO: case "approve"/"reject" - Admin não aprova mais orçamentos
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
      console.error(`Error executing action ${action.type}:`, error);
    } finally {
      action.loading = false;
    }
  }

  private async handleStartService(): Promise<void> {
    try {
      await this.dataService.updateServiceRequest(this.request().id, {
        status: "Em Progresso",
      });
      this.notificationService.addNotification(
        "Serviço iniciado com sucesso!"
      );
      this.refreshRequest.emit();
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.includes("Tentativa de início antes da data agendada")
      ) {
        this.businessRuleError.emit(
          "Não é permitido iniciar o serviço antes da data agendada!"
        );
      } else {
        throw error;
      }
    }
  }

  private async handleCompleteService(): Promise<void> {
    try {
      await this.dataService.updateServiceRequest(this.request().id, {
        status: "Aguardando Finalização",
      });
      this.notificationService.addNotification(
        "Serviço marcado como concluído!"
      );
      this.refreshRequest.emit();
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message.includes("Tentativa de conclusão antes do tempo mínimo")
      ) {
        this.businessRuleError.emit(
          "Não é permitido concluir o serviço antes do tempo mínimo!"
        );
      } else {
        throw error;
      }
    }
  }

  // Métodos para gerenciamento de fotos
  openPhotoModal(photoUrl: string): void {
    this.selectedPhoto.set(photoUrl);
    this.showPhotoModal.set(true);
  }

  closePhotoModal(): void {
    this.showPhotoModal.set(false);
    this.selectedPhoto.set(null);
  }

  // Método para selecionar profissional específico
  selectSpecificProfessional(professionalId: number): void {
    this.selectProfessional.emit({
      request: this.request(),
      professionalId: professionalId.toString(),
    });
  }
}
