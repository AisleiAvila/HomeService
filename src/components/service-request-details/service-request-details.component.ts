import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  computed,
  inject,
  signal,
  effect,
  AfterViewInit,
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
import { WorkflowServiceSimplified } from "../../services/workflow-simplified.service";
import { extractPtAddressParts } from "@/src/utils/address-utils";
import { LeafletMapViewerComponent } from "../leaflet-map-viewer.component";
import { LeafletRouteMapComponent } from "../leaflet-route-map.component";
import { PortugalAddressDatabaseService } from "../../services/portugal-address-database.service";

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
    LeafletMapViewerComponent,
    LeafletRouteMapComponent,
  ],
  template: `
    @if (!request()) {
    <div class="bg-red-100 text-red-700 p-4 rounded text-center font-semibold">
      <h3 class="text-xl font-bold mb-2">❌ ERRO DE DADOS</h3>
      Erro: Nenhuma solicitação selecionada ou dados inválidos.<br />
      Volte e selecione uma solicitação válida.<br />
      <div style="font-size:11px; text-align:left; margin-top:10px; background:#fff; padding:10px; border-radius:4px;">
        <strong>DEBUG INFO:</strong><br>
        <code>request(): {{ request() | json }}</code><br>
        <code>_requestInput(): {{ _requestInput() | json }}</code><br>
        <code>loadedRequest(): {{ loadedRequest() | json }}</code>
      </div>
    </div>
    } @else {
    <!-- Cabeçalho com gradiente, ícone e título -->
    <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-blue-500">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center">
            <i class="fas fa-file-alt mr-3"></i>
            {{ "serviceRequestDetails" | i18n }}
          </h2>
          <p class="text-indigo-100 text-sm mt-1">
            {{ request().title }}
          </p>
        </div>
        <button
          (click)="logAndEmitCloseDetails()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-all transform hover:scale-105 shadow-lg"
          aria-label="{{ 'backToList' | i18n }}"
        >
          <i class="fas fa-arrow-left"></i>
          <span>{{ 'backToList' | i18n }}</span>
        </button>
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
              <!-- (Removido: sistema não usa mais orçamento) -->
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
                <p class="text-gray-900">{{ request().category?.name || '—' }}</p>
              </div>
              @if (request().subcategory) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "subcategory" | i18n }}
                </label>
                <p class="text-gray-900">{{ request().subcategory?.name || '—' }}</p>
              </div>
              }
              @if (request().origin) {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "origin" | i18n }}
                </label>
                <p class="text-gray-900">{{ request().origin?.name || '—' }}</p>
              </div>
              }
              @if (currentUser().role === "admin") {
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "TotalValue" | i18n }}
                </label>
                <p class="text-lg font-semibold text-green-600">
                  @if (request().valor && request().valor > 0) {
                    €{{ request().valor | number : '1.2-2' }}
                  } @else {
                    —
                  }
                </p>
              </div>
              }
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ "valorPrestador" | i18n }}
                </label>
                <p class="text-lg font-semibold text-blue-600">
                  @if (request().valor_prestador && request().valor_prestador > 0) {
                    €{{ request().valor_prestador | number : '1.2-2' }}
                  } @else {
                    —
                  }
                </p>
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
                  @if (request().status) {
                    {{ request().status }}
                  } @else {
                    —
                  }
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

        <!-- Geolocation / Geolocalização -->
        @if (serviceLatitude() && serviceLongitude()) {
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800">
              <i class="fas fa-map-marker-alt mr-2 text-blue-500"></i>
              {{ "geolocation" | i18n }}
            </h3>
            @if (currentUser().role === 'professional') {
              <button
                (click)="showRouteMap.set(!showRouteMap())"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
                <i class="fas fa-{{showRouteMap() ? 'map-marked-alt' : 'route'}}"></i>
                {{ (showRouteMap() ? 'geolocation' : 'viewRoute') | i18n }}
              </button>
            }
          </div>
          <div class="space-y-4">
            @if (!showRouteMap()) {
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">
                    Latitude
                  </label>
                  <p class="text-gray-900 font-mono">{{ serviceLatitude() }}</p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">
                    Longitude
                  </label>
                  <p class="text-gray-900 font-mono">{{ serviceLongitude() }}</p>
                </div>
              </div>
              <app-leaflet-map-viewer
                [latitude]="serviceLatitude()!"
                [longitude]="serviceLongitude()!">
              </app-leaflet-map-viewer>
            } @else {
              <app-leaflet-route-map
                [destinationLatitude]="serviceLatitude()!"
                [destinationLongitude]="serviceLongitude()!"
                [mapHeight]="'500px'"
                [showInstructions]="true">
              </app-leaflet-route-map>
            }
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
export class ServiceRequestDetailsComponent implements AfterViewInit {
  constructor() {
    console.error('🏗️🏗️🏗️ [CONSTRUTOR] Componente ServiceRequestDetails CRIADO - timestamp:', Date.now());
  }

  ngAfterViewInit(): void {
    console.error('🔵 [ngAfterViewInit] Executando...');
    console.error('🔵 [ngAfterViewInit] _requestInput():', this._requestInput()?.id, this._requestInput()?.title);
    console.error('🔵 [ngAfterViewInit] request():', this.request()?.id, this.request()?.title);
    console.error('🔵 [ngAfterViewInit] loadedRequest():', this.loadedRequest()?.id);
  }

  @Output() businessRuleError = new EventEmitter<string>();

  // Signals internos para armazenar os valores dos inputs
  private readonly _requestInput = signal<ServiceRequest | undefined>(undefined);
  private readonly _currentUserInput = signal<User | undefined>(undefined);

  // Inputs COM SETTERS que populam os signals
  @Input() 
  set requestInput(value: ServiceRequest | undefined) {
    console.error('✨✨✨ [SETTER] requestInput chamado!', value?.id, value?.title);
    this._requestInput.set(value);
  }
  
  @Input() 
  set currentUserInput(value: User | undefined) {
    console.error('✨✨✨ [SETTER] currentUserInput chamado!', value?.id);
    this._currentUserInput.set(value);
  }

  // Injeção de serviços
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workflowService = inject(WorkflowServiceSimplified);
  private readonly addressService = inject(PortugalAddressDatabaseService);

  // Signal para request carregado via rota
  private readonly loadedRequest = signal<ServiceRequest | undefined>(undefined);
  private readonly loadedUser = signal<User | undefined>(undefined);

  // Request e User efetivos usados no template
  request = computed(() => {
    const inputReq = this._requestInput();
    const loadedReq = this.loadedRequest();
    const final = inputReq || loadedReq;
    console.error('🟡 [COMPUTED] request() executando:');
    console.error('   ➜ inputReq:', inputReq?.id, inputReq?.title);
    console.error('   ➜ loadedReq:', loadedReq?.id, loadedReq?.title);
    console.error('   ➜ FINAL:', final?.id, final?.title);
    console.error('   ➜ RETORNANDO:', final ? 'OBJETO VÁLIDO' : 'UNDEFINED');
    return final;
  });
  currentUser = computed(() => this._currentUserInput() || this.loadedUser() || this.authService.appUser());

  // Effect para reagir a mudanças no requestInput e carregar via rota se necessário
  private readonly requestEffect = effect(() => {
    const inputReq = this._requestInput();
    console.log('[ServiceRequestDetails] Effect executando - requestInput:', inputReq?.id);
    
    if (inputReq) {
      console.log('[ServiceRequestDetails] ✅ Request recebido via input:', inputReq.id, inputReq.title);
      return;
    }
    
    // Se não há input, tentar carregar via rota
    const routeId = this.route.snapshot.params['id'];
    console.log('[ServiceRequestDetails] Sem input, verificando rota. ID:', routeId);
    
    if (routeId) {
      const requests = this.dataService.serviceRequests();
      const foundRequest = requests.find(r => r.id === Number.parseInt(routeId));
      if (foundRequest) {
        console.log('[ServiceRequestDetails] ✅ Request carregado via rota:', foundRequest.id);
        this.loadedRequest.set(foundRequest);
      } else {
        console.error('[ServiceRequestDetails] ❌ Request não encontrado na rota:', routeId);
        this.router.navigate(['/admin/requests']);
      }
    }
  });
  
  // Effect para garantir que o user está disponível
  private readonly userEffect = effect(() => {
    const inputUser = this._currentUserInput();
    if (!inputUser && !this.loadedUser()) {
      const authUser = this.authService.appUser();
      if (authUser) {
        this.loadedUser.set(authUser);
      }
    }
  });

  // Signals para UI state
  showMobileActions = signal(false);
  showPhotoModal = signal(false);
  selectedPhoto = signal<string | null>(null);
  showRouteMap = signal(false);

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

  // Signal para armazenar coordenadas do código postal
  private readonly postalCodeCoordinates = signal<{ latitude: number; longitude: number } | null>(null);

  // Effect para buscar coordenadas quando o código postal do request mudar
  private readonly coordinatesEffect = effect(async () => {
    const postalCode = this.addressParts().postalCode;
    
    if (!postalCode) {
      this.postalCodeCoordinates.set(null);
      return;
    }

    try {
      const result = await this.addressService.validateCodigoPostal(postalCode);
      if (result.valid && result.endereco?.latitude && result.endereco?.longitude) {
        this.postalCodeCoordinates.set({
          latitude: result.endereco.latitude,
          longitude: result.endereco.longitude
        });
      } else {
        this.postalCodeCoordinates.set(null);
      }
    } catch (error) {
      console.error('[ServiceRequestDetails] Erro ao buscar coordenadas:', error);
      this.postalCodeCoordinates.set(null);
    }
  });

  // Coordenadas finais (do request ou do código postal)
  serviceLatitude = computed(() => {
    const req = this.request();
    return req.latitude || this.postalCodeCoordinates()?.latitude || null;
  });
  
  serviceLongitude = computed(() => {
    const req = this.request();
    return req.longitude || this.postalCodeCoordinates()?.longitude || null;
  });

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
      const currentUser = this.currentUser();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem iniciar serviços");
      }

      const success = await this.workflowService.startExecution(
        this.request().id,
        currentUser.id
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
          "Não é permitido iniciar o serviço antes da data agendada!"
        );
      } else {
        console.error("Erro ao iniciar serviço:", error);
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
        currentUser.id
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
          "Não é permitido concluir o serviço antes do tempo mínimo!"
        );
      } else {
        console.error("Erro ao concluir serviço:", error);
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

  // Corrige o botão Voltar para emitir o evento closeDetails corretamente
  logAndEmitCloseDetails() {
    this.closeDetails.emit();
    this.router.navigate(["/admin/requests"]);
  }
}
