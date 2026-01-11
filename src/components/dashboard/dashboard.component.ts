import {
  Component,
  input,
  computed,
  output,
  inject,
  signal,
  effect,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { User, ServiceRequest, ServiceStatus } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { WorkflowServiceSimplified } from "../../services/workflow-simplified.service";
import { ServiceListComponent } from "../service-list/service-list.component";
import { ServiceRequestDetailsComponent } from "../service-request-details/service-request-details.component";
import { I18nService } from "../../i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { extractPtAddressParts } from "../../utils/address-utils";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceListComponent, ServiceRequestDetailsComponent, I18nPipe],
  templateUrl: './dashboard.component.html',
  // TEMPORARIAMENTE removido OnPush para debug
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
    public selectedRequest = signal<ServiceRequest | null>(null);
    viewDetails = output<ServiceRequest>();

  private readonly activatedRoute = inject(ActivatedRoute);

  // Persistência de detalhes via query param (permite refresh no mobile sem voltar para a lista)
  private readonly requestIdFromUrl = signal<number | null>(null);

  private readRequestIdFromUrl(): void {
    const qs = globalThis.window?.location?.search ?? '';
    const sp = new URLSearchParams(qs);
    const raw = sp.get('requestId') ?? sp.get('sr');
    const parsed = Number.parseInt(String(raw ?? ''), 10);
    this.requestIdFromUrl.set(Number.isFinite(parsed) ? parsed : null);
  }

  private setRequestIdInUrl(requestId: number | null): void {
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { requestId },
      queryParamsHandling: 'merge',
    });
  }
  // Handler para detalhar solicitação
  handleViewDetails(request: ServiceRequest) {
    console.log('[Dashboard] handleViewDetails chamado com request:', request);
    if (!request?.id) {
      console.error('[Dashboard] Request inválido recebido:', request);
      return;
    }
    // Logar todos os campos principais
    console.log('[Dashboard] Request.id:', request.id);
    console.log('[Dashboard] Request.title:', request.title);
    console.log('[Dashboard] Request.status:', request.status);
    console.log('[Dashboard] Request.professional_id:', request.professional_id);
    console.log('[Dashboard] Request.valor:', request.valor);
    console.log('[Dashboard] Request.valor_prestador:', request.valor_prestador);
    
    // Setar o signal diretamente sem setTimeout
    this.selectedRequest.set(request);
    console.log('[Dashboard] selectedRequest após set:', this.selectedRequest());
    this.viewDetails.emit(request);

    // Persistir na URL para sobreviver a refresh
    this.requestIdFromUrl.set(request.id);
    this.setRequestIdInUrl(request.id);
  }

  handleViewGeolocation(request: ServiceRequest) {
    if (!request?.id) {
      console.error('[Dashboard] Request inválido para geolocalização:', request);
      return;
    }

    const isAdmin = this.user()?.role === "admin";
    const target = isAdmin
      ? ["/admin", "requests", request.id, "geolocation"]
      : ["/requests", request.id, "geolocation"];

    void this.router.navigate(target, { state: { request } });
  }

  // Effect para logar mudanças no signal selectedRequest
  readonly _logSelectedRequestEffect = effect(() => {
    console.log('[Dashboard] selectedRequest mudou:', this.selectedRequest());
  });

  // Reidrata o request selecionado a partir do query param após refresh
  readonly _rehydrateSelectedRequestEffect = effect(() => {
    const idFromUrl = this.requestIdFromUrl();
    const currentSelected = this.selectedRequest();
    const requests = this.dataService.serviceRequests();

    if (!idFromUrl) return;
    if (currentSelected?.id === idFromUrl) return;
    if (!Array.isArray(requests) || requests.length === 0) return;

    const found = requests.find((r) => r.id === idFromUrl);
    if (found) {
      this.selectedRequest.set(found);
    }
  });
    logAndCloseDetails() {
    console.log('closeDetails recebido (pai dashboard)');
    this.selectedRequest.set(null);
    console.log('[Dashboard] selectedRequest após fechar:', this.selectedRequest());

    // Limpar persistência da URL
    this.requestIdFromUrl.set(null);
    this.setRequestIdInUrl(null);
  }
  // Signal para exibir erro de negócio
  showBusinessError = signal(false);
  businessErrorMessage = signal<string>("");

  // PDF report
  isGeneratingPdfReport = signal(false);
  // Signal para controlar expansão dos filtros
  filtersExpanded = signal<boolean>(true);
  filterStatus = signal<string>("");
  filterStartDate = signal<string>("");
  filterEndDate = signal<string>("");
  filterCategory = signal<string>("");
  filterOrigin = signal<string>("");
  filterOS = signal<string>("");
  filterLocality = signal<string>("");
  filterService = signal<string>("");
  filterClient = signal<string>("");
  searchTerm = signal<string>("");

  // Ordenação
  sortBy = signal<string>("date");
  sortOrder = signal<"asc" | "desc">("desc");

  // Paginação
  currentPage = signal(1);
  itemsPerPage = signal(10);
  totalPages = computed(() =>
    Math.ceil(this.filteredRequests().length / this.itemsPerPage())
  );

  // Método para ordenar por coluna clicada
  sortByColumn(column: string) {
    if (this.sortBy() === column) {
      // Se já está ordenando por essa coluna, inverte a ordem
      this.toggleSortOrder();
    } else {
      // Se é uma nova coluna, ordena por ela em ordem decrescente
      this.sortBy.set(column);
      this.sortOrder.set("desc");
    }
  }

  // Método para alternar a ordem de ordenação
  toggleSortOrder() {
    this.sortOrder.set(this.sortOrder() === "asc" ? "desc" : "asc");
  }

  // Método para alternar expansão dos filtros
  toggleFilters() {
    this.filtersExpanded.set(!this.filtersExpanded());
  }

  quickFilterOptions = [
    { status: "Solicitado", label: "statusRequested" },
    { status: "Atribuído", label: "statusAssigned" },
    { status: "Data Definida", label: "statusScheduled" },
    { status: "Concluído", label: "statusCompleted" },
    { status: "Finalizado", label: "statusFinalized" },
  ];

  // Método utilitário para uso no template
  isArray(val: unknown): boolean {
    return Array.isArray(val);
  }
  user = input.required<User>();
  openChat = output<ServiceRequest>();
  payNow = output<ServiceRequest>();
  scheduleRequest = output<ServiceRequest>();
  provideClarification = output<ServiceRequest>();
  startService = output<ServiceRequest>();
  finishService = output<ServiceRequest>();

  statusAtivos = signal<{ value: string; label: string }[]>([]);
  // IDs com ações em andamento para feedback visual na lista
  actionLoadingIds = signal<number[]>([]);

  async handleFinishService(request: ServiceRequest) {
    // ativa loading do item
    this.actionLoadingIds.update((ids) =>
      Array.from(new Set([...(ids || []), request.id]))
    );
    try {
      const currentUser = this.user();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem concluir serviços");
      }

      const success = await this.workflowService.completeExecution(
        request.id,
        currentUser.id
      );

      if (success) {
        this.selectedRequest.set(null);
      }
    } catch (error: any) {
      console.error("Erro ao finalizar serviço:", error);
      this.showBusinessError.set(true);
      this.businessErrorMessage.set(
        this.i18n.translate("errorFinishingService")
      );
    } finally {
      // desativa loading do item
      this.actionLoadingIds.update((ids) =>
        (ids || []).filter((id) => id !== request.id)
      );
    }
  }

  async handleStartService(request: ServiceRequest) {
    // ativa loading do item
    this.actionLoadingIds.update((ids) =>
      Array.from(new Set([...(ids || []), request.id]))
    );
    try {
      const currentUser = this.user();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem iniciar serviços");
      }

      const success = await this.workflowService.startExecution(
        request.id,
        currentUser.id
      );

      if (success) {
        // Recarrega a lista após iniciar o serviço
        await this.dataService.reloadServiceRequests();
        this.selectedRequest.set(null);
      }
    } catch (error: any) {
      // Impedir início antes da data agendada
      if (
        error instanceof Error &&
        error.message.includes("Tentativa de início antes da data agendada")
      ) {
        this.showBusinessRuleError(
          "Não é permitido iniciar o serviço antes da data agendada!"
        );
      } else {
        console.error("Erro ao iniciar serviço:", error);
        this.showBusinessError.set(true);
        this.businessErrorMessage.set(this.i18n.translate("genericError"));
      }
    } finally {
      // desativa loading do item
      this.actionLoadingIds.update((ids) =>
        (ids || []).filter((id) => id !== request.id)
      );
    }
  }

  public ngOnInit(): void {
    // Ler query param no bootstrap (refresh)
    this.readRequestIdFromUrl();

    const allStatus: ServiceStatus[] = [
      "Solicitado",
      "Atribuído",
      "Aguardando Confirmação",
      "Aceito",
      "Recusado",
      "Data Definida",
      "Em Progresso",
      "Concluído",
      "Finalizado",
      "Cancelado"
    ];
    
    this.statusAtivos.set(
      allStatus.map((status) => ({
        value: status,
        label: this.i18n.translate(status),
      }))
    );

    // Inicializar filtros de data para profissionais
    const currentUser = this.user();
    if (currentUser?.role === 'professional') {
      // Default de ordenação para profissionais: Agendado (timeline)
      this.sortBy.set('scheduled');
      this.sortOrder.set('asc');

      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Formato YYYY-MM-DD para inputs de data
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      this.filterStartDate.set(formatDate(firstDayOfMonth));
      this.filterEndDate.set(formatDate(today));
    }

    // Recarrega as solicitações quando o componente é inicializado
    console.log('[Dashboard] ngOnInit - Recarregando solicitações de serviço');
    this.dataService.fetchOrigins();
    this.dataService.reloadServiceRequests();
  }

  // Removido duplicidade de selectedRequest

  readonly dataService = inject(DataService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly workflowService = inject(WorkflowServiceSimplified);

  // Método para navegar para criação de solicitação
  navigateToCreateRequest(): void {
    this.router.navigate(['/create-service-request']);
  }

  userRequests = computed(() => {
    const allRequests = this.dataService.serviceRequests();
    const currentUser = this.user();

    let filtered = [];
    if (currentUser.role === "professional") {
      filtered = allRequests.filter(
        (r) => r.professional_id === currentUser.id
      );
    } else if (currentUser.role === "admin") {
      filtered = allRequests;
    }

    return filtered;
  });

  // Computed para obter lista de localidades únicas ordenadas
  availableLocalities = computed(() => {
    const requests = this.userRequests();
    const localities = new Set<string>();
    
    requests.forEach(r => {
      const addressParts = extractPtAddressParts(r);
      const locality = addressParts.locality?.trim();
      if (locality) {
        localities.add(locality);
      }
    });
    
    return Array.from(localities).sort((a, b) => 
      a.localeCompare(b, 'pt-PT', { sensitivity: 'base' })
    );
  });

  // Computed para obter lista de serviços (títulos) únicos ordenados
  availableServices = computed(() => {
    const requests = this.userRequests();
    const services = new Set<string>();
    
    requests.forEach(r => {
      const title = r.title?.trim();
      if (title) {
        services.add(title);
      }
    });
    
    return Array.from(services).sort((a, b) => 
      a.localeCompare(b, 'pt-PT', { sensitivity: 'base' })
    );
  });

  // Computed para obter lista de clientes únicos ordenados
  availableClients = computed(() => {
    const requests = this.userRequests();
    const clients = new Set<string>();
    
    requests.forEach(r => {
      const clientName = r.client_name?.trim();
      if (clientName) {
        clients.add(clientName);
      }
    });
    
    return Array.from(clients).sort((a, b) => 
      a.localeCompare(b, 'pt-PT', { sensitivity: 'base' })
    );
  });

  availableOrigins = computed(() => {
    const origins = this.dataService.origins();
    return [...(origins || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", 'pt-PT', { sensitivity: 'base' })
    );
  });

  // Computed para filtrar e pesquisar solicitações
  filteredRequests = computed(() => {
    let reqs = this.userRequests();
    const status = this.filterStatus();
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const category = this.filterCategory();
    const origin = this.filterOrigin();
    const osFilter = this.filterOS().trim();
    const search = this.searchTerm().toLowerCase();

    // Filtro por status
    if (status) {
      reqs = reqs.filter((r) => r.status === status);
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      reqs = reqs.filter((r) => {
        if (!r.scheduled_start_datetime) return false;
        const scheduledDate = new Date(r.scheduled_start_datetime);
        return scheduledDate >= start && scheduledDate <= end;
      });
    }

    if (category) reqs = reqs.filter((r) => String(r.category_id) === category);

    if (origin) {
      reqs = reqs.filter((r) => String(r.origin_id ?? r.origin?.id ?? "") === origin);
    }

    // Filtro por OS (comparação por substring)
    if (osFilter) {
      reqs = reqs.filter((r) => {
        const osValue = (r as any)?.os;
        if (osValue === null || osValue === undefined) return false;
        return String(osValue).includes(osFilter);
      });
    }
    
    // Filtro por localidade (comparação exata)
    const locality = this.filterLocality();
    if (locality) {
      reqs = reqs.filter((r) => {
        const addressParts = extractPtAddressParts(r);
        return addressParts.locality?.trim() === locality;
      });
    }
    
    // Filtro por serviço/título (comparação exata)
    const service = this.filterService();
    if (service) {
      reqs = reqs.filter((r) => r.title?.trim() === service);
    }
    
    // Filtro por cliente (comparação exata)
    const client = this.filterClient();
    if (client) {
      reqs = reqs.filter((r) => r.client_name?.trim() === client);
    }
    
    if (search) {
      reqs = reqs.filter(
        (r) =>
          r.title?.toLowerCase().includes(search) ||
          r.zip_code?.toLowerCase().includes(search) ||
          String(r.id).includes(search)
      );
    }
    
    // Aplicar ordenação
    return this.sortRequests(reqs);
  });

  // Computed para requests paginados
  paginatedRequests = computed(() => {
    const reqs = this.filteredRequests();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return reqs.slice(start, end);
  });

  // Pagination helper methods
  get pageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    // Show first page
    pages.push(1);

    // Show pages around current page
    let start = Math.max(2, current - 2);
    let end = Math.min(total - 1, current + 2);

    // Add ellipsis if needed
    if (start > 2) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add middle pages
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        pages.push(i);
      }
    }

    // Add ellipsis if needed
    if (end < total - 1) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Show last page if more than 1 page
    if (total > 1) {
      pages.push(total);
    }

    return pages;
  }

  // Método para ordenar as solicitações
  private sortRequests(requests: ServiceRequest[]): ServiceRequest[] {
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();
    const multiplier = sortOrder === "asc" ? 1 : -1;

    const parseIsoTime = (raw?: string | null): number | null => {
      if (!raw) return null;
      const time = new Date(raw).getTime();
      return Number.isNaN(time) ? null : time;
    };

    // Keep null values at the end for both asc/desc.
    const compareNullableTime = (aTime: number | null, bTime: number | null): number => {
      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return aTime - bTime;
    };

    const getOriginName = (r: ServiceRequest): string => {
      const joined = r.origin?.name?.trim();
      if (joined) return joined;
      const originId = r.origin_id;
      if (!originId) return "";
      return this.dataService.origins().find((o) => o.id === originId)?.name?.trim() || "";
    };

    const getLocalityValue = (r: ServiceRequest): string => {
      return extractPtAddressParts(r).locality?.trim() || "";
    };

    const getClientValue = (r: ServiceRequest): string => {
      return r.client_name?.trim() || "";
    };

    const getPhoneComparable = (r: ServiceRequest): string | null => {
      const raw = (r as any)?.client_phone ?? (r as any)?.clientPhone;
      if (raw === null || raw === undefined) return null;
      const trimmed = String(raw).trim();
      if (!trimmed) return null;
      const digitsOnly = trimmed.replace(/\D/g, "");

      if (!digitsOnly) return trimmed;

      // Normalize Portuguese country code when present so sorting behaves naturally.
      // Examples:
      //  - +351 912 345 678  -> 912345678
      //  - 00351 912345678   -> 912345678
      let normalized = digitsOnly;
      if (normalized.startsWith("00351") && normalized.length === 14) {
        normalized = normalized.slice(5);
      } else if (normalized.startsWith("351") && normalized.length === 12) {
        normalized = normalized.slice(3);
      }

      return normalized;
    };

    const getExecutionTime = (r: ServiceRequest): number => {
      const raw = r.scheduled_start_datetime || r.requested_datetime || r.requested_date || "";
      if (!raw) return 0;
      const parsed = new Date(raw);
      const time = parsed.getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    const getValueAmount = (r: ServiceRequest): number => {
      const amount = r.valor_prestador ?? r.valor ?? 0;
      return Number.isFinite(amount) ? amount : 0;
    };

    const getOsComparable = (r: ServiceRequest): number | string | null => {
      const raw = (r as any)?.os;
      if (raw === null || raw === undefined || String(raw).trim() === "") return null;
      const rawStr = String(raw).trim();
      const asNumber = Number(rawStr);
      if (!Number.isNaN(asNumber)) return asNumber;
      return rawStr;
    };

    return [...requests].sort((a, b) => {
      let compareResult = 0;
      let applyMultiplier = true;

      switch (sortBy) {
        case "date": {
          const dateA = a.requested_date ? new Date(a.requested_date).getTime() : 0;
          const dateB = b.requested_date ? new Date(b.requested_date).getTime() : 0;
          compareResult = dateA - dateB;
          break;
        }

        // Ordenações específicas do fluxo do profissional
        case "scheduled": {
          const aTime = parseIsoTime(a.scheduled_start_datetime);
          const bTime = parseIsoTime(b.scheduled_start_datetime);
          // Keep null at the end regardless of asc/desc.
          compareResult = compareNullableTime(aTime, bTime);
          applyMultiplier = aTime !== null && bTime !== null;
          break;
        }

        case "start": {
          const aTime = parseIsoTime(a.actual_start_datetime);
          const bTime = parseIsoTime(b.actual_start_datetime);
          // Keep null at the end regardless of asc/desc.
          compareResult = compareNullableTime(aTime, bTime);
          applyMultiplier = aTime !== null && bTime !== null;
          break;
        }

        case "end": {
          const aTime = parseIsoTime(a.actual_end_datetime);
          const bTime = parseIsoTime(b.actual_end_datetime);
          // Keep null at the end regardless of asc/desc.
          compareResult = compareNullableTime(aTime, bTime);
          applyMultiplier = aTime !== null && bTime !== null;
          break;
        }

        case "status": {
          compareResult = (a.status || "").localeCompare(b.status || "");
          break;
        }

        case "id": {
          compareResult = a.id - b.id;
          break;
        }

        case "os": {
          const aOs = getOsComparable(a);
          const bOs = getOsComparable(b);

          if (aOs === null && bOs === null) {
            compareResult = 0;
            break;
          }
          if (aOs === null) {
            compareResult = 1;
            break;
          }
          if (bOs === null) {
            compareResult = -1;
            break;
          }

          if (typeof aOs === "number" && typeof bOs === "number") {
            compareResult = aOs - bOs;
            break;
          }

          compareResult = String(aOs).localeCompare(String(bOs), "pt-PT", {
            sensitivity: "base",
            numeric: true,
          });
          break;
        }

        case "category": {
          const catA = this.dataService.categories().find(c => c.id === a.category_id)?.name || "";
          const catB = this.dataService.categories().find(c => c.id === b.category_id)?.name || "";
          compareResult = catA.localeCompare(catB);
          break;
        }

        case "origin": {
          compareResult = getOriginName(a).localeCompare(getOriginName(b), 'pt-PT', { sensitivity: 'base' });
          break;
        }

        case "locality": {
          compareResult = getLocalityValue(a).localeCompare(getLocalityValue(b), 'pt-PT', { sensitivity: 'base' });
          break;
        }

        case "client": {
          compareResult = getClientValue(a).localeCompare(getClientValue(b), 'pt-PT', { sensitivity: 'base' });
          break;
        }

        case "phone": {
          const aPhone = getPhoneComparable(a);
          const bPhone = getPhoneComparable(b);

          if (aPhone === null && bPhone === null) {
            compareResult = 0;
            break;
          }
          if (aPhone === null) {
            compareResult = 1;
            break;
          }
          if (bPhone === null) {
            compareResult = -1;
            break;
          }

          compareResult = String(aPhone).localeCompare(String(bPhone), 'pt-PT', {
            sensitivity: 'base',
            numeric: true,
          });
          break;
        }

        case "execution": {
          compareResult = getExecutionTime(a) - getExecutionTime(b);
          break;
        }

        case "value": {
          compareResult = getValueAmount(a) - getValueAmount(b);
          break;
        }
      }

      return compareResult * (applyMultiplier ? multiplier : 1);
    });
  }

  // Computed para gerar a lista de filtros ativos
  activeFilters = computed(() => {
    const filters: { type: any; label: string; value: string }[] = [];
    if (this.filterStatus()) {
      // Encontra o label traduzido do status
      const statusLabel = this.statusAtivos().find(
        (s) => s.value === this.filterStatus()
      )?.label || this.filterStatus();
      filters.push({
        type: "status",
        label: "status",
        value: statusLabel,
      });
    }
    if (this.filterStartDate() && this.filterEndDate()) {
      filters.push({
        type: "period",
        label: "period",
        value: `${this.filterStartDate()} - ${this.filterEndDate()}`,
      });
    }
    if (this.filterCategory()) {
      const catName = this.dataService.categories().find(
        (c) => String(c.id) === String(this.filterCategory())
      )?.name || "";
      filters.push({
        type: "category",
        label: "category",
        value: catName,
      });
    }
    if (this.filterOrigin()) {
      const originName = this.availableOrigins().find(
        (o) => String(o.id) === String(this.filterOrigin())
      )?.name || "";
      filters.push({
        type: "origin",
        label: "origin",
        value: originName,
      });
    }
    if (this.filterOS()) {
      filters.push({
        type: "os",
        label: "os",
        value: this.filterOS(),
      });
    }
    if (this.filterLocality()) {
      filters.push({
        type: "locality",
        label: "locality",
        value: this.filterLocality(),
      });
    }
    if (this.filterService()) {
      filters.push({
        type: "service",
        label: "service",
        value: this.filterService(),
      });
    }
    if (this.filterClient()) {
      filters.push({
        type: "client",
        label: "client",
        value: this.filterClient(),
      });
    }
    if (this.searchTerm()) {
      filters.push({
        type: "search",
        label: "search",
        value: this.searchTerm(),
      });
    }
    return filters;
  });

  stats = computed(() => {
    const currentUser = this.user();
    // Os cards da Visão Geral devem refletir os mesmos filtros aplicados na lista
    const requests = this.filteredRequests();

    // Status que indicam serviços ativos (não finalizados)
    const activeStatuses = new Set<ServiceStatus>([
      "Solicitado",
      "Atribuído",
      "Aguardando Confirmação",
      "Aceito",
      "Data Definida",
      "Em Progresso"
    ]);
    
    const isActive = (status: string) => activeStatuses.has(status as ServiceStatus);

    if (currentUser.role === "admin") {
      return [
        {
          label: this.i18n.translate("activeRequests"),
          value: requests.filter((r) => isActive(r.status)).length,
          icon: "fas fa-cogs text-brand-primary-500",
        },
        {
          label: this.i18n.translate("completedRequests"),
          value: requests.filter(
            (r) => r.status === "Concluído" || r.status === "Finalizado"
          ).length,
          icon: "fas fa-check-circle text-green-500",
        },
      ];
    }

    if (currentUser.role === "professional") {
      const earnings = requests
        .filter((r) => r.payment_status === "Paid" && r.valor_prestador)
        .reduce((sum, r) => sum + (r.valor_prestador ?? 0), 0);

      const baseStats: Array<{ label: string; value: string | number; icon: string }> = [
        {
          label: this.i18n.translate("activeJobs"),
          value: requests.filter((r) => isActive(r.status)).length,
          icon: "fas fa-briefcase text-brand-primary-500",
        },
        {
          label: this.i18n.translate("completedJobs"),
          value: requests.filter(
            (r) => r.status === "Concluído" || r.status === "Finalizado"
          ).length,
          icon: "fas fa-check-double text-green-500",
        },
      ];

      // Adiciona o grid de Valor Total apenas se não for funcionário da Natan
      if (!currentUser.is_natan_employee) {
        baseStats.push({
          label: this.i18n.translate("totalEarnings"),
          value: `€ ${earnings.toFixed(2)}`,
          icon: "fas fa-euro-sign text-emerald-500",
        });
      }

      return baseStats;
    }

    return [];
  });

  async handleExecutionDateResponse(
    request: ServiceRequest,
    approved: boolean,
    rejectionReason?: string
  ) {
    this.actionLoadingIds.update((ids) =>
      Array.from(new Set([...(ids || []), request.id]))
    );
    try {
      await this.dataService.respondToExecutionDate(
        request.id,
        approved,
        rejectionReason
      );
    } catch (error) {
      console.error("Erro ao responder data de execução:", error);
      this.showBusinessError.set(true);
      this.businessErrorMessage.set(this.i18n.translate("genericError"));
    } finally {
      this.actionLoadingIds.update((ids) =>
        (ids || []).filter((id) => id !== request.id)
      );
    }
  }

  handleProvideClarification(request: ServiceRequest) {
    this.provideClarification.emit(request);
  }

  // Método para exibir erro de negócio
  showBusinessRuleError(message: string) {
    this.businessErrorMessage.set(message);
    this.showBusinessError.set(true);
    setTimeout(() => this.showBusinessError.set(false), 6000);
  }

  async exportOverviewPdfReport(): Promise<void> {
    if (this.isGeneratingPdfReport()) return;
    this.isGeneratingPdfReport.set(true);

    try {
      const currentUser = this.user();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem gerar este relatório");
      }

      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const autoTable: any =
        (autoTableModule as any).default ?? (autoTableModule as any).autoTable;

      const doc = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 12;
      let cursorY = 12;

      // Header
      const logo = await this.loadReportLogoForJsPdf();
      if (logo) {
        doc.addImage(logo.dataUrl, logo.format, marginX, cursorY, 18, 18);
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("NatanGeneralService", marginX + 22, cursorY + 6);
      doc.setFontSize(12);
      doc.text(this.i18n.translate("overviewTitle"), marginX + 22, cursorY + 12);

      const issuedAt = new Date();
      doc.setFontSize(9);
      doc.text(
        `${this.i18n.translate("reportIssuedAt")}: ${issuedAt.toLocaleString("pt-PT")}`,
        marginX,
        cursorY + 24
      );
      doc.text(
        `${this.i18n.translate("reportIssuedBy")}: ${currentUser.name} <${currentUser.email}>`,
        marginX,
        cursorY + 29
      );

      // KPI cards (same ones shown on the Overview screen)
      const requests = this.filteredRequests();
      const kpis = this.buildProfessionalReportKpis(requests, currentUser);
      if (kpis.length > 0) {
        cursorY += 36;

        const cardGap = 6;
        const availableWidth = pageWidth - marginX * 2;
        const cardWidth = (availableWidth - cardGap * (kpis.length - 1)) / kpis.length;
        const cardHeight = 18;

        doc.setDrawColor(229, 231, 235);
        doc.setTextColor(17, 24, 39);

        for (let i = 0; i < kpis.length; i++) {
          const kpi = kpis[i];
          const x = marginX + i * (cardWidth + cardGap);
          const y = cursorY;

          // Card border
          (doc as any).roundedRect?.(x, y, cardWidth, cardHeight, 2, 2, "S") ?? doc.rect(x, y, cardWidth, cardHeight);

          doc.setFontSize(9);
          doc.text(kpi.label, x + 3, y + 6);

          doc.setFontSize(12);
          doc.setFont(undefined, "bold");
          doc.text(kpi.value, x + 3, y + 14);
          doc.setFont(undefined, "normal");
        }

        cursorY += cardHeight + 8;
      } else {
        cursorY += 38;
      }

      // Active filters used for data query
      const activeFilters = this.activeFilters();
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(this.i18n.translate("activeFilters"), marginX, cursorY);
      cursorY += 6;

      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      if (activeFilters.length === 0) {
        doc.text(this.i18n.translate("all"), marginX, cursorY);
        cursorY += 6;
      } else {
        for (const f of activeFilters) {
          const label = this.i18n.translate(f.label);
          doc.text(`${label}: ${f.value}`, marginX, cursorY);
          cursorY += 5;
        }
      }

      // Requests list
      cursorY += 6;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(this.i18n.translate("reportRequestsList"), marginX, cursorY);

      const bodyRows = requests.map((r) => {
        const requested = r.requested_datetime || r.requested_date;
        const requestedStr = requested
          ? new Date(requested).toLocaleString("pt-PT")
          : "";
        const providerValue =
          r.valor_prestador !== undefined && r.valor_prestador !== null
            ? `€ ${Number(r.valor_prestador).toFixed(2)}`
            : "";

        return [
          String(r.id),
          r.title || "",
          r.client_name || "",
          String(r.status || ""),
          requestedStr,
          providerValue,
          String(r.payment_status || ""),
        ];
      });

      autoTable(doc, {
        startY: cursorY + 4,
        head: [
          [
            "ID",
            this.i18n.translate("service"),
            this.i18n.translate("client"),
            this.i18n.translate("status"),
            this.i18n.translate("requestDate"),
            this.i18n.translate("providerValue"),
            this.i18n.translate("payment"),
          ],
        ],
        body: bodyRows,
        margin: { left: marginX, right: marginX, top: 10, bottom: 14 },
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [245, 245, 245], textColor: 0 },
        didDrawPage: () => {
          // Leave space for footer (pagination is added after all content)
        },
      });

      // Footer: page x / total
      const totalPages = doc.getNumberOfPages();
      doc.setFontSize(9);
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);
        doc.text(
          `${this.i18n.translate("page")} ${page} ${this.i18n.translate("of")} ${totalPages}`,
          pageWidth - marginX,
          pageHeight - 8,
          { align: "right" }
        );
      }

      const fileName = this.buildPdfFileName(issuedAt);
      doc.save(fileName);
    } catch (error) {
      console.error("Erro ao gerar relatório PDF:", error);
      const message =
        error instanceof Error ? error.message : this.i18n.translate("exportError");
      this.showBusinessRuleError(message);
    } finally {
      this.isGeneratingPdfReport.set(false);
    }
  }

  private buildProfessionalReportKpis(
    requests: ServiceRequest[],
    currentUser: User
  ): Array<{ label: string; value: string }> {
    if (currentUser.role !== "professional") return [];

    const activeStatuses = new Set<ServiceStatus>([
      "Solicitado",
      "Atribuído",
      "Aguardando Confirmação",
      "Aceito",
      "Data Definida",
      "Em Progresso",
    ]);
    const isActive = (status: string) => activeStatuses.has(status as ServiceStatus);

    const activeJobs = requests.filter((r) => isActive(r.status)).length;
    const completedJobs = requests.filter(
      (r) => r.status === "Concluído" || r.status === "Finalizado"
    ).length;

    const kpis: Array<{ label: string; value: string }> = [
      { label: this.i18n.translate("activeJobs"), value: String(activeJobs) },
      { label: this.i18n.translate("completedJobs"), value: String(completedJobs) },
    ];

    if (!currentUser.is_natan_employee) {
      const earnings = requests
        .filter((r) => r.payment_status === "Paid" && r.valor_prestador)
        .reduce((sum, r) => sum + (r.valor_prestador ?? 0), 0);
      kpis.push({
        label: this.i18n.translate("totalEarnings"),
        value: `€ ${earnings.toFixed(2)}`,
      });
    }

    return kpis;
  }

  private buildPdfFileName(issuedAt: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = issuedAt.getFullYear();
    const mm = pad(issuedAt.getMonth() + 1);
    const dd = pad(issuedAt.getDate());
    const hh = pad(issuedAt.getHours());
    const min = pad(issuedAt.getMinutes());
    return `relatorio-visao-geral-${yyyy}${mm}${dd}-${hh}${min}.pdf`;
  }

  private async loadReportLogoDataUrl(): Promise<string | null> {
    const logo = await this.loadReportLogoForJsPdf();
    return logo?.dataUrl ?? null;
  }

  private async loadReportLogoForJsPdf(): Promise<
    | { dataUrl: string; format: "PNG" | "JPEG" | "WEBP" }
    | null
  > {
    // Prefer Angular assets path (resolved against <base href="...">)
    const candidates = [
      "assets/logo-new.png",
      "assets/logo.png",
      "assets/logo-natan.png",
    ];

    for (const url of candidates) {
      const dataUrl = await this.fetchAsDataUrl(url);
      if (!dataUrl) continue;

      const parsed = this.parseImageDataUrlForJsPdf(dataUrl);
      if (parsed) return parsed;
    }

    return null;
  }

  private parseImageDataUrlForJsPdf(
    dataUrl: string
  ): { dataUrl: string; format: "PNG" | "JPEG" | "WEBP" } | null {
    const trimmed = dataUrl.trim();

    if (trimmed.startsWith("data:image/png;base64,")) {
      const base64 = trimmed.slice("data:image/png;base64,".length);
      return this.base64HasPngSignature(base64)
        ? { dataUrl: trimmed, format: "PNG" }
        : null;
    }

    if (
      trimmed.startsWith("data:image/jpeg;base64,") ||
      trimmed.startsWith("data:image/jpg;base64,")
    ) {
      const base64 = trimmed.replace(/^data:image\/(jpeg|jpg);base64,/, "");
      return this.base64HasJpegSignature(base64)
        ? { dataUrl: trimmed, format: "JPEG" }
        : null;
    }

    if (trimmed.startsWith("data:image/webp;base64,")) {
      // jsPDF supports WEBP in modern builds, but still validate it's not HTML.
      const base64 = trimmed.slice("data:image/webp;base64,".length);
      return this.base64HasRiffSignature(base64)
        ? { dataUrl: trimmed, format: "WEBP" }
        : null;
    }

    // Avoid SVG/text/html etc (common source of "wrong PNG signature" when an asset path resolves to index.html)
    return null;
  }

  private base64HasPngSignature(base64: string): boolean {
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const bytes = this.decodeBase64Prefix(base64, 12);
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  private base64HasJpegSignature(base64: string): boolean {
    // JPEG magic bytes: FF D8 FF
    const bytes = this.decodeBase64Prefix(base64, 8);
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  private base64HasRiffSignature(base64: string): boolean {
    // WEBP/RIFF magic bytes: 52 49 46 46 ("RIFF")
    const bytes = this.decodeBase64Prefix(base64, 8);
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46
    );
  }

  private decodeBase64Prefix(base64: string, maxBytes: number): number[] {
    try {
      // Decode only a small prefix (rounded up to base64 4-char blocks).
      const neededChars = Math.ceil((maxBytes / 3) * 4);
      const slice = base64.replace(/\s/g, "").slice(0, neededChars);
      const decoded = atob(slice);
      const out: number[] = [];
      for (let i = 0; i < decoded.length && out.length < maxBytes; i++) {
        out.push(decoded.charCodeAt(i));
      }
      return out;
    } catch {
      return [];
    }
  }

  private async fetchAsDataUrl(url: string): Promise<string | null> {
    try {
      const resolvedUrl = new URL(url, document.baseURI).toString();
      const response = await fetch(resolvedUrl);
      if (!response.ok) return null;
      const blob = await response.blob();

      // Prevent passing HTML/text to jsPDF as an image (common in SPA route fallbacks)
      if (!blob.type || !blob.type.startsWith("image/")) return null;

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== "string") {
            reject(new Error("Falha ao carregar imagem do relatório"));
            return;
          }
          resolve(result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private renderStatusDistributionChartPng(requests: ServiceRequest[]): string {
    const counts = new Map<string, number>();
    for (const r of requests) {
      const key = String(r.status || "");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const data = Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const title = this.i18n.translate("reportStatusDistribution");
    return this.renderSimpleBarChartPng(title, data);
  }

  private renderEarningsByMonthChartPng(requests: ServiceRequest[]): string {
    const byMonth = new Map<string, number>();

    for (const r of requests) {
      if (r.payment_status !== "Paid") continue;
      if (r.valor_prestador === null || r.valor_prestador === undefined) continue;

      const dateStr = r.payment_date || r.completed_at || r.actual_end_datetime || r.requested_datetime || r.requested_date;
      if (!dateStr) continue;
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(r.valor_prestador));
    }

    const data = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([label, value]) => ({ label, value: Math.round(value) }));

    const title = this.i18n.translate("reportEarningsByMonth");
    return this.renderSimpleBarChartPng(title, data, { valuePrefix: "€ " });
  }

  private renderSimpleBarChartPng(
    title: string,
    data: Array<{ label: string; value: number }>,
    options?: { valuePrefix?: string }
  ): string {
    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = "#111827";
    ctx.font = "bold 26px Arial";
    ctx.fillText(title, 20, 40);

    // Chart area
    const left = 60;
    const top = 70;
    const right = canvas.width - 20;
    const bottom = canvas.height - 40;

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    if (data.length === 0) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "16px Arial";
      ctx.fillText(this.i18n.translate("noRequestsFound"), left + 20, top + 40);
      return canvas.toDataURL("image/png");
    }

    const maxValue = Math.max(...data.map((d) => d.value), 1);

    const plotLeft = left + 12;
    const plotRight = right - 12;
    const plotTop = top + 6;
    const plotBottom = bottom - 24;
    const plotWidth = Math.max(1, plotRight - plotLeft);
    const plotHeight = Math.max(1, plotBottom - plotTop);

    const slotWidth = plotWidth / Math.max(1, data.length);
    const barWidth = Math.min(90, Math.max(18, Math.floor(slotWidth * 0.6)));

    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const xCenter = plotLeft + i * slotWidth + slotWidth / 2;
      const x = Math.round(xCenter - barWidth / 2);
      const h = Math.round((plotHeight * d.value) / maxValue);
      const y = plotBottom - h;

      // Bar
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x, y, barWidth, h);

      // Value (above bar)
      const prefix = options?.valuePrefix ?? "";
      ctx.fillStyle = "#111827";
      const valueY = Math.max(plotTop + 14, y - 6);
      ctx.fillText(`${prefix}${d.value}`, xCenter, valueY);

      // Label (truncate)
      const label = d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label;
      ctx.fillStyle = "#374151";
      ctx.fillText(label, xCenter, bottom + 18);
    }

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    return canvas.toDataURL("image/png");
  }

  applyQuickFilter(status: string) {
    this.filterStatus.set(this.filterStatus() === status ? "" : status);
  }

  clearFilters() {
    this.filterStatus.set("");
    this.filterStartDate.set("");
    this.filterEndDate.set("");
    this.filterCategory.set("");
    this.filterOrigin.set("");
    this.filterOS.set("");
    this.filterLocality.set("");
    this.filterService.set("");
    this.filterClient.set("");
    this.searchTerm.set("");
  }

  removeFilter(
    filterType: "status" | "period" | "category" | "origin" | "os" | "locality" | "service" | "client" | "search"
  ) {
    switch (filterType) {
      case "status":
        this.filterStatus.set("");
        break;
      case "period":
        this.filterStartDate.set("");
        this.filterEndDate.set("");
        break;
      case "category":
        this.filterCategory.set("");
        break;
      case "origin":
        this.filterOrigin.set("");
        break;
      case "os":
        this.filterOS.set("");
        break;
      case "locality":
        this.filterLocality.set("");
        break;
      case "service":
        this.filterService.set("");
        break;
      case "client":
        this.filterClient.set("");
        break;
      case "search":
        this.searchTerm.set("");
        break;
    }
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  previousPage() {
    const current = this.currentPage();
    if (current > 1) {
      this.currentPage.set(current - 1);
    }
  }

  nextPage() {
    const current = this.currentPage();
    if (current < this.totalPages()) {
      this.currentPage.set(current + 1);
    }
  }

  setItemsPerPage(items: number) {
    this.itemsPerPage.set(items);
    this.currentPage.set(1); // Reset to first page when changing items per page
  }

  // Expose Math for template
  Math = Math;

  async handleConfirmAssignment(request: ServiceRequest) {
    this.actionLoadingIds.update((ids) =>
      Array.from(new Set([...(ids || []), request.id]))
    );
    try {
      const currentUser = this.user();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem confirmar atribuição");
      }

      // Responder positivamente à atribuição
      const success = await this.workflowService.respondToAssignment(
        request.id,
        currentUser.id,
        true,
        "Atribuição confirmada"
      );

      if (success) {
        await this.dataService.reloadServiceRequests();
        this.showBusinessError.set(true);
        this.businessErrorMessage.set(this.i18n.translate("assignmentConfirmed"));
        setTimeout(() => this.showBusinessError.set(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao confirmar atribuição:", error);
      this.showBusinessError.set(true);
      this.businessErrorMessage.set(this.i18n.translate("errorConfirmingAssignment"));
    } finally {
      this.actionLoadingIds.update((ids) =>
        (ids || []).filter((id) => id !== request.id)
      );
    }
  }

  async handleRejectAssignment(request: ServiceRequest) {
    this.actionLoadingIds.update((ids) =>
      Array.from(new Set([...(ids || []), request.id]))
    );
    try {
      const currentUser = this.user();
      if (currentUser?.role !== "professional") {
        throw new Error("Apenas profissionais podem rejeitar atribuição");
      }

      // Responder negativamente à atribuição
      const success = await this.workflowService.respondToAssignment(
        request.id,
        currentUser.id,
        false,
        "Atribuição recusada"
      );

      if (success) {
        await this.dataService.reloadServiceRequests();
        this.showBusinessError.set(true);
        this.businessErrorMessage.set(this.i18n.translate("assignmentRejected"));
        setTimeout(() => this.showBusinessError.set(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao rejeitar atribuição:", error);
      this.showBusinessError.set(true);
      this.businessErrorMessage.set(this.i18n.translate("errorRejectingAssignment"));
    } finally {
      this.actionLoadingIds.update((ids) =>
        (ids || []).filter((id) => id !== request.id)
      );
    }
  }
}

