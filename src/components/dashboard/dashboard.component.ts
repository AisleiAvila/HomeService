import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  output,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { User, ServiceRequest } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { WorkflowService } from "../../services/workflow.service";
import { ServiceListComponent } from "../service-list/service-list.component";
import { I18nService } from "../../i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { StatusService } from "../../services/status.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceListComponent, I18nPipe],
  templateUrl: "./dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  // Mapeamento entre status do enum e status dos dados
  private statusMap: Record<string, string> = {
    Requested: "Solicitado",
    InAnalysis: "Em análise",
    AwaitingClarifications: "Aguardando esclarecimentos",
    QuoteSent: "Orçamento enviado",
    AwaitingQuoteApproval: "Aguardando aprovação do orçamento",
    QuoteApproved: "Orçamento aprovado",
    QuoteRejected: "Orçamento rejeitado",
    AwaitingExecutionDate: "Aguardando data de execução",
    DateProposedByAdmin: "Data proposta pelo administrador",
    AwaitingDateApproval: "Aguardando aprovação da data",
    DateApprovedByClient: "Data aprovada pelo cliente",
    DateRejectedByClient: "Data rejeitada pelo cliente",
    SearchingProfessional: "Buscando profissional",
    ProfessionalSelected: "Profissional selecionado",
    AwaitingProfessionalConfirmation: "Aguardando confirmação do profissional",
    Scheduled: "Agendado",
    InProgress: "Em execução",
    CompletedAwaitingApproval: "Concluído - Aguardando aprovação",
    Completed: "Finalizado",
    Cancelled: "Cancelado",
  };
  // Handler para detalhar solicitação
  handleViewDetails(request: ServiceRequest) {
    this.viewDetails.emit(request);
    // Aqui pode abrir modal, navegar ou atualizar view conforme necessário
  }
  // Signal para exibir erro de negócio
  showBusinessError = signal(false);
  businessErrorMessage = signal<string>("");
  
  // Filtros avançados e pesquisa
  filterStatus = signal<string>("");
  filterStartDate = signal<string>("");
  filterEndDate = signal<string>("");
  filterCategory = signal<string>("");
  searchTerm = signal<string>("");

  // Ordenação
  sortBy = signal<string>("date");
  sortOrder = signal<"asc" | "desc">("desc");

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
    { status: "Requested", label: "statusRequested" },
    { status: "InAnalysis", label: "statusInAnalysis" },
    { status: "Scheduled", label: "statusScheduled" },
    { status: "Completed", label: "statusCompleted" },
  ];

  // Método utilitário para uso no template
  isArray(val: unknown): boolean {
    return Array.isArray(val);
  }
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();
  openChat = output<ServiceRequest>();
  payNow = output<ServiceRequest>();
  scheduleRequest = output<ServiceRequest>();
  provideClarification = output<ServiceRequest>();
  startService = output<ServiceRequest>();
  finishService = output<ServiceRequest>();

  statusAtivos = signal<{ value: string; label: string }[]>([]);

  async handleFinishService(request: ServiceRequest) {
    try {
      await this.dataService.finishServiceWork(request.id);
      this.selectedRequest.set(null);
    } catch (error) {
      this.showBusinessError.set(true);
      this.businessErrorMessage.set(
        this.i18n.translate("errorFinishingService")
      );
    }
  }

  public ngOnInit() {
    this.statusAtivos.set(
      Object.values(StatusService).map((status) => ({
        value: status,
        label: this.i18n.translate(status),
      }))
    );
  }

  public selectedRequest = signal<ServiceRequest | null>(null);

  dataService = inject(DataService);
  private workflowService = inject(WorkflowService);
  private i18n = inject(I18nService);

  userRequests = computed(() => {
    const allRequests = this.dataService.serviceRequests();
    const currentUser = this.user();

    let filtered = [];
    if (currentUser.role === "client") {
      filtered = allRequests.filter((r) => r.client_id === currentUser.id);
    } else if (currentUser.role === "professional") {
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

    // Filtro por status - converte o valor em inglês para português
    if (status) {
      const statusPt = this.statusMap[status];
      reqs = reqs.filter((r) => r.status === statusPt);
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

    const ativosPt = this.statusAtivos()
      .map((s) => this.statusMap[s.value])
      .filter(Boolean);
    if (currentUser.role === "client") {
      return [
        {
          label: this.i18n.translate("totalRequests"),
          value: requests.length,
          icon: "fas fa-list text-indigo-500",
        },
        {
          label: this.i18n.translate("activeRequests"),
          value: requests.filter((r) => ativosPt.includes(r.status)).length,
          icon: "fas fa-cogs text-blue-500",
        },
        {
          label: this.i18n.translate("completedRequests"),
          value: requests.filter((r) => !ativosPt.includes(r.status)).length,
          icon: "fas fa-check-circle text-green-500",
        },
      ];
    }

    if (currentUser.role === "admin") {
      return [
        {
          label: this.i18n.translate("activeRequests"),
          value: requests.filter((r) => ativosPt.includes(r.status)).length,
          icon: "fas fa-cogs text-blue-500",
        },
        {
          label: this.i18n.translate("completedRequests"),
          value: requests.filter((r) => !ativosPt.includes(r.status)).length,
          icon: "fas fa-check-circle text-green-500",
        },
      ];
    }

    if (currentUser.role === "professional") {
      const earnings = requests
        .filter((r) => r.payment_status === "Paid" && r.cost)
        .reduce((sum, r) => sum + r.cost!, 0);

      return [
        {
          label: this.i18n.translate("activeJobs"),
          value: requests.filter((r) => ativosPt.includes(r.status)).length,
          icon: "fas fa-briefcase text-blue-500",
        },
        {
          label: this.i18n.translate("completedJobs"),
          value: requests.filter((r) => !ativosPt.includes(r.status)).length,
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

  handleQuoteResponse(request: ServiceRequest, approved: boolean) {
    this.dataService.respondToQuote(request.id, approved);
  }

  handleExecutionDateResponse(
    request: ServiceRequest,
    approved: boolean,
    rejectionReason?: string
  ) {
    this.dataService.respondToExecutionDate(
      request.id,
      approved,
      rejectionReason
    );
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
}
