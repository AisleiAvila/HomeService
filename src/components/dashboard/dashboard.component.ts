import {
  Component,
  ChangeDetectionStrategy,
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
import { Router } from "@angular/router";
import { User, ServiceRequest, ServiceStatus } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { WorkflowServiceSimplified } from "../../services/workflow-simplified.service";
import { ServiceListComponent } from "../service-list/service-list.component";
import { ServiceRequestDetailsComponent } from "../service-request-details/service-request-details.component";
import { I18nService } from "../../i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

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
  }

  // Effect para logar mudanças no signal selectedRequest
  readonly _logSelectedRequestEffect = effect(() => {
    console.log('[Dashboard] selectedRequest mudou:', this.selectedRequest());
  });
    logAndCloseDetails() {
    console.log('closeDetails recebido (pai dashboard)');
    this.selectedRequest.set(null);
    console.log('[Dashboard] selectedRequest após fechar:', this.selectedRequest());
  }
  // Signal para exibir erro de negócio
  showBusinessError = signal(false);
  businessErrorMessage = signal<string>("");
  filterStatus = signal<string>("");
  filterStartDate = signal<string>("");
  filterEndDate = signal<string>("");
  filterCategory = signal<string>("");
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

  quickFilterOptions = [
    { status: "Solicitado", label: "statusRequested" },
    { status: "Atribuído", label: "statusAssigned" },
    { status: "Data Definida", label: "statusScheduled" },
    { status: "Concluído", label: "statusCompleted" },
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

  public async ngOnInit() {
    const allStatus: ServiceStatus[] = [
      "Solicitado",
      "Atribuído",
      "Aguardando Confirmação",
      "Aceito",
      "Recusado",
      "Data Definida",
      "Em Progresso",
      "Aguardando Finalização",
      "Pagamento Feito",
      "Concluído",
      "Cancelado"
    ];
    
    this.statusAtivos.set(
      allStatus.map((status) => ({
        value: status,
        label: this.i18n.translate(status),
      }))
    );

    // Recarrega as solicitações quando o componente é inicializado
    console.log('[Dashboard] ngOnInit - Recarregando solicitações de serviço');
    await this.dataService.reloadServiceRequests();
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

  // Computed para filtrar e pesquisar solicitações
  filteredRequests = computed(() => {
    let reqs = this.userRequests();
    const status = this.filterStatus();
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const category = this.filterCategory();
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
        if (!r.requested_date) return false;
        const reqDate = new Date(r.requested_date);
        return reqDate >= start && reqDate <= end;
      });
    }

    if (category) reqs = reqs.filter((r) => String(r.category_id) === category);
    
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

    return [...requests].sort((a, b) => {
      let compareResult = 0;

      switch (sortBy) {
        case "date": {
          const dateA = a.requested_date ? new Date(a.requested_date).getTime() : 0;
          const dateB = b.requested_date ? new Date(b.requested_date).getTime() : 0;
          compareResult = dateA - dateB;
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

        case "category": {
          const catA = this.dataService.categories().find(c => c.id === a.category_id)?.name || "";
          const catB = this.dataService.categories().find(c => c.id === b.category_id)?.name || "";
          compareResult = catA.localeCompare(catB);
          break;
        }
      }

      return compareResult * multiplier;
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
    const requests = this.userRequests();

    // Status que indicam serviços ativos (não finalizados)
    const activeStatuses = new Set<ServiceStatus>([
      "Solicitado",
      "Atribuído",
      "Aguardando Confirmação",
      "Aceito",
      "Data Definida",
      "Em Progresso",
      "Aguardando Finalização",
      "Pagamento Feito"
    ]);
    
    const isActive = (status: string) => activeStatuses.has(status as ServiceStatus);

    if (currentUser.role === "admin") {
      return [
        {
          label: this.i18n.translate("activeRequests"),
          value: requests.filter((r) => isActive(r.status)).length,
          icon: "fas fa-cogs text-blue-500",
        },
        {
          label: this.i18n.translate("completedRequests"),
          value: requests.filter((r) => r.status === "Concluído").length,
          icon: "fas fa-check-circle text-green-500",
        },
      ];
    }

    if (currentUser.role === "professional") {
      const earnings = requests
        .filter((r) => r.payment_status === "Paid" && r.valor)
        .reduce((sum, r) => sum + r.valor!, 0);

      return [
        {
          label: this.i18n.translate("activeJobs"),
          value: requests.filter((r) => isActive(r.status)).length,
          icon: "fas fa-briefcase text-blue-500",
        },
        {
          label: this.i18n.translate("completedJobs"),
          value: requests.filter((r) => r.status === "Concluído").length,
          icon: "fas fa-check-double text-green-500",
        },
        {
          label: this.i18n.translate("totalEarnings"),
          value: `€ ${earnings.toFixed(2)}`,
          icon: "fas fa-euro-sign text-emerald-500",
        },
      ];
    }

    return [];
  });

  async handleQuoteResponse(request: ServiceRequest, approved: boolean) {
    this.actionLoadingIds.update((ids) =>
      Array.from(new Set([...(ids || []), request.id]))
    );
    try {
      await this.dataService.respondToQuote(request.id, approved);
    } catch (error) {
      console.error("Erro ao responder orçamento:", error);
      this.showBusinessError.set(true);
      this.businessErrorMessage.set(this.i18n.translate("genericError"));
    } finally {
      this.actionLoadingIds.update((ids) =>
        (ids || []).filter((id) => id !== request.id)
      );
    }
  }

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

  applyQuickFilter(status: string) {
    this.filterStatus.set(this.filterStatus() === status ? "" : status);
  }

  clearFilters() {
    this.filterStatus.set("");
    this.filterStartDate.set("");
    this.filterEndDate.set("");
    this.filterCategory.set("");
    this.searchTerm.set("");
  }

  removeFilter(
    filterType: "status" | "period" | "category" | "search"
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
