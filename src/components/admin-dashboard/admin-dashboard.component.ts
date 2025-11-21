
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit, OnDestroy, HostListener, ElementRef, ViewChildren, QueryList, input, effect } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ServiceCategory, ServiceRequest, User } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { DataService } from "../../services/data.service";
import { I18nService } from "../../i18n.service";
import { NotificationService } from "../../services/notification.service";
import { WorkflowService } from "../../services/workflow.service";
import { StatusPieChartComponent } from "../status-pie-chart.component";
import { CategoryBarChartComponent } from "../category-bar-chart.component";
import { TemporalEvolutionChartComponent } from "../temporal-evolution-chart.component";
import { CategoryManagementComponent } from "../category-management/category-management.component";
import { StatusService } from "@/src/services/status.service";
import { SupabaseService } from "../../services/supabase.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    I18nPipe,
    StatusPieChartComponent,
    CategoryBarChartComponent,
    TemporalEvolutionChartComponent,
    CategoryManagementComponent,
  ],
  templateUrl: "./admin-dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  // Input para receber a visualização do componente pai
  readonly viewFromParent = input<'overview' | 'requests' | 'approvals' | 'finances' | 'professionals' | 'clients' | 'categories'>();

  // Filtros avançados e pesquisa
  filterStatus = signal<string>("");
  filterStartDate = signal<string>("");
  filterEndDate = signal<string>("");
  filterDistrict = signal<string>("");
  filterProfessional = signal<string>("");
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
    { status: "Solicitado", label: "statusRequested" },
    { status: "Em análise", label: "statusInAnalysis" },
    { status: "Agendado", label: "statusScheduled" },
    { status: "Finalizado", label: "statusCompleted" },
  ];

  statusOptions = signal<{ value: string; label: string }[]>([]);

  districtOptions = [
    "Lisboa",
    "Porto",
    "Setúbal",
    "Braga",
    "Coimbra",
    "Aveiro",
  ];
  professionalOptions: User[] = [];
  
  ngOnInit() {
    this.startAutoRefresh();
    this.professionalOptions = this.professionals();

    this.statusOptions.set(
      Object.values(StatusService).map((status) => ({
        value: status,
        label: this.i18n.translate(status),
      }))
    );
  }

  applyQuickFilter(status: string) {
    // Se o filtro rápido clicado já estiver ativo, desativa-o. Senão, ativa-o.
    this.filterStatus.set(this.filterStatus() === status ? "" : status);
  }

  clearFilters() {
    this.filterStatus.set("");
    this.filterStartDate.set("");
    this.filterEndDate.set("");
    this.filterDistrict.set("");
    this.filterProfessional.set("");
    this.searchTerm.set("");
  }

  removeFilter(
    filterType: "status" | "period" | "district" | "professional" | "search"
  ) {
    switch (filterType) {
      case "status":
        this.filterStatus.set("");
        break;
      case "period":
        this.filterStartDate.set("");
        this.filterEndDate.set("");
        break;
      case "district":
        this.filterDistrict.set("");
        break;
      case "professional":
        this.filterProfessional.set("");
        break;
      case "search":
        this.searchTerm.set("");
        break;
    }
  }

  // Computed para gerar a lista de filtros ativos
  activeFilters = computed(() => {
    const filters: { type: any; label: string; value: string }[] = [];
    if (this.filterStatus()) {
      filters.push({
        type: "status",
        label: "status",
        value: this.filterStatus(),
      });
    }
    if (this.filterStartDate() && this.filterEndDate()) {
      filters.push({
        type: "period",
        label: "period",
        value: `${this.filterStartDate()} - ${this.filterEndDate()}`,
      });
    }
    if (this.filterDistrict()) {
      filters.push({
        type: "district",
        label: "district",
        value: this.filterDistrict(),
      });
    }
    if (this.filterProfessional()) {
      const profName =
        this.professionalOptions.find(
          (p) => String(p.id) === String(this.filterProfessional())
        )?.name || "";
      filters.push({
        type: "professional",
        label: "professional",
        value: profName,
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

  // Computed para filtrar e pesquisar solicitações
  filteredRequests = computed(() => {
    let reqs = this.allRequests();
    const status = this.filterStatus();
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const district = this.filterDistrict();
    const professional = this.filterProfessional();
    const search = this.searchTerm().toLowerCase();

    if (status) reqs = reqs.filter((r) => r.status === status);

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Adjust end date to include the whole day
      end.setHours(23, 59, 59, 999);

      reqs = reqs.filter((r) => {
        if (!r.requested_date) return false;
        const reqDate = new Date(r.requested_date);
        return reqDate >= start && reqDate <= end;
      });
    }

    if (district) reqs = reqs.filter((r) => r.state === district);
    if (professional)
      reqs = reqs.filter(
        (r) => String(r.professional_id) === String(professional)
      );
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

        case "client": {
          // Client sorting not implemented yet - maintains current order
          break;
        }

        case "professional": {
          const profA = this.getProfessionalName(a.professional_id) || "";
          const profB = this.getProfessionalName(b.professional_id) || "";
          compareResult = profA.localeCompare(profB);
          break;
        }
      }

      return compareResult * multiplier;
    });
  }

  // Computed para paginação dos resultados filtrados
  filteredPaginatedRequests = computed(() => {
    const reqs = this.filteredRequests();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return reqs.slice(start, end);
  });
  private readonly dataService = inject(DataService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  
  // Método para navegar para criação de solicitação
  navigateToCreateRequest(): void {
    this.router.navigate(['/create-service-request']);
  }
  
  // Título do gráfico de status, internacionalizado
  statusGraphTitle = this.i18n.translate("statusGraphTitle");
  // Labels internacionalizados para status
  statusLabels: Record<string, string> = {
    Solicitado: this.i18n.translate("statusRequested"),
    "Em análise": this.i18n.translate("statusInAnalysis"),
    "Aguardando esclarecimentos": this.i18n.translate(
      "statusAwaitingClarifications"
    ),
    "Orçamento enviado": this.i18n.translate("statusQuoteSent"),
    "Aguardando aprovação do orçamento": this.i18n.translate(
      "statusAwaitingQuoteApproval"
    ),
    "Orçamento aprovado": this.i18n.translate("statusQuoteApproved"),
    "Aguardando data de execução": this.i18n.translate(
      "statusAwaitingExecutionDate"
    ),
    "Data proposta pelo administrador": this.i18n.translate(
      "statusDateProposedByAdmin"
    ),
    "Aguardando aprovação da data": this.i18n.translate(
      "statusAwaitingDateApproval"
    ),
    "Data aprovada pelo cliente": this.i18n.translate(
      "statusDateApprovedByClient"
    ),
    "Buscando profissional": this.i18n.translate("statusSearchingProfessional"),
    "Profissional selecionado": this.i18n.translate(
      "statusProfessionalSelected"
    ),
    "Aguardando confirmação do profissional": this.i18n.translate(
      "statusAwaitingProfessionalConfirmation"
    ),
    Agendado: this.i18n.translate("statusScheduled"),
    "Em execução": this.i18n.translate("statusInExecution"),
    "Concluído - Aguardando aprovação": this.i18n.translate(
      "statusCompletedAwaitingApproval"
    ),
    Assigned: this.i18n.translate("statusAssigned"),
    Pending: this.i18n.translate("statusPending"),
    Scheduled: this.i18n.translate("statusScheduledEn"),
    "In Progress": this.i18n.translate("statusInProgress"),
    Finalizado: this.i18n.translate("statusCompleted"),
    Cancelado: this.i18n.translate("statusCancelled"),
    // Adicionados para garantir exibição dos dados reais do banco
    Completed: this.i18n.translate("statusCompletedEn"),
  };
  private readonly notificationService = inject(NotificationService);
  private readonly workflowService = inject(WorkflowService);

  // Expose Math for template use
  Math = Math;

  constructor() {
    // Sincronizar a visualização com o componente pai
    effect(() => {
      const parentView = this.viewFromParent();
      if (parentView) {
        this.currentView.set(parentView);
      }
    });
  }

  // ngOnInit já definido acima

  /**
   * Retorna um objeto com todos os status esperados para o gráfico, preenchendo com zero onde não houver dados.
   * Adiciona logs para depuração dos dados recebidos e enviados ao gráfico.
   */
  statusPieChartData(): Record<string, number> {
    // Retorna todos os status presentes nos dados, sem filtrar
    const statusCounts = this.servicesByStatus();
    console.log("[PieChart] Dados enviados ao gráfico:", statusCounts);
    return statusCounts;
  }

  // Environment check
  isProduction = false; // Could be injected from environment in production

  // UI State for Actions Menu
  openActionsMenuId = signal<number | null>(null);
  @ViewChildren("actionsMenu") actionsMenus!: QueryList<ElementRef>;

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    if (this.openActionsMenuId() === null) {
      return; // No menu is open, do nothing
    }

    const clickedInside = this.actionsMenus.some((menuRef) =>
      menuRef.nativeElement.contains(event.target as Node)
    );

    if (!clickedInside) {
      this.openActionsMenuId.set(null); // Close the menu
    }
  }

  // UI State
  currentView = signal<
    | "overview"
    | "requests"
    | "approvals"
    | "finances"
    | "professionals"
    | "categories"
    | "clients"
  >("overview");
  showAddProfessionalForm = signal(false);
  editingCategory = signal<ServiceCategory | null>(null);
  editingCategoryName = signal("");

  // Auto-refresh state
  lastUpdate = signal<Date>(new Date());
  refreshInterval: any = null;

  // Form data
  newCategory = signal("");
  newProfessionalName = signal("");
  newProfessionalEmail = signal("");
  newProfessionalSpecialties = signal<ServiceCategory[]>([]);

  // Edit professional data
  editingProfessional = signal<User | null>(null);
  editingProfessionalName = signal("");
  editingProfessionalEmail = signal("");
  editingProfessionalSpecialties = signal<ServiceCategory[]>([]);

  // Quote and assignment data
  quoteRequest = signal<ServiceRequest | null>(null);
  quoteAmount = signal<number | null>(null);
  assignmentRequest = signal<ServiceRequest | null>(null);
  assigningProfessionalId = signal<number | null>(null);
  invoiceRequest = signal<ServiceRequest | null>(null);

  // Scheduling data for assignment
  scheduledDate = signal<string>("");
  scheduledTime = signal<string>("");
  estimatedDurationMinutes = signal<number | null>(null);
  
  // Direct assignment data (nova funcionalidade)
  directAssignmentRequest = signal<ServiceRequest | null>(null);
  directAssignmentProfessionalId = signal<number | null>(null);
  directAssignmentDate = signal<string>("");
  directAssignmentTime = signal<string>("");
  directAssignmentDuration = signal<number | null>(null);

  // Computed: total de serviços por status
  servicesByStatus = computed(() => {
    const requests = this.dataService.serviceRequests();
    const statusMap: Record<string, number> = {};
    for (const req of requests) {
      // Normaliza status: remove espaços e converte para minúsculas
      const normalized = req.status?.trim().toLowerCase();
      statusMap[normalized] = (statusMap[normalized] || 0) + 1;
    }
    return statusMap;
  });

  // Computed: distribuição de pedidos por categoria
  ordersByCategory = computed(() => {
    const requests = this.dataService.serviceRequests();
    const categories = this.dataService.categories();
    const categoryMap: Record<string, number> = {};

    for (const req of requests) {
      // Se existir category_id, conta pelo id, senão agrupa como "Sem categoria"
      const catId = req.category_id || "none";
      categoryMap[catId] = (categoryMap[catId] || 0) + 1;
    }

    // Garante que todas categorias aparecem, mesmo sem pedidos
    for (const cat of categories) {
      if (!(cat.id in categoryMap)) categoryMap[cat.id] = 0;
    }

    // "Sem categoria" já está incluído no categoryMap se existir

    return categoryMap;
  });

  // Labels para o gráfico de categorias
  categoryLabels = computed(() => {
    const categories = this.dataService.categories();
    const labels: Record<string, string> = {};

    // Mapeia as categorias existentes pelo id
    for (const category of categories) {
      labels[category.id] = category.name;
    }

    // Adiciona label para "Sem categoria"
    labels["none"] = this.i18n.translate("noCategory");

    return labels;
  });

  // Dados temporais para o gráfico de evolução
  temporalData = computed(() => {
    const requests = this.allRequests();
    const data: Record<string, number> = {};

    // Gerar dados dos últimos 30 dias
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Contar solicitações criadas neste dia
      const count = requests.filter((req) => {
        const reqDate = new Date(req.requested_date);
        return reqDate.toISOString().split("T")[0] === dateStr;
      }).length;

      data[dateStr] = count;
    }

    return data;
  });

  // Atividades recentes
  recentActivities = computed(() => {
    const requests = this.allRequests();
    const users = this.allUsers();
    const activities: any[] = [];

    // Simular atividades recentes baseadas nos dados existentes
    for (const req of requests.slice(0, 5)) {
      activities.push({
        type: "request",
        message: this.i18n.translate("requestCreated") + ` #${req.id}`,
        time: this.getRelativeTime(req.requested_date),
        icon: "fas fa-file-alt",
        color: "text-blue-600",
      });
    }

    for (const user of users.slice(0, 3)) {
      activities.push({
        type: "user",
        message: this.i18n.translate("userRegistered") + `: ${user.name}`,
        time: this.getRelativeTime(new Date().toISOString()),
        icon: "fas fa-user-plus",
        color: "text-green-600",
      });
    }

    // Ordenar por tempo (mais recente primeiro)
    return [...activities]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  });

  // Execution date proposal data
  dateProposalRequest = signal<ServiceRequest | null>(null);
  proposedExecutionDate = signal<string>("");
  proposedExecutionTime = signal<string>("");
  proposedExecutionNotes = signal<string>("");

  // Pagination data
  currentPage = signal(1);
  itemsPerPage = signal(5); // Changed to 5 to see pagination with fewer items
  totalPages = computed(() =>
    Math.ceil(this.allRequests().length / this.itemsPerPage())
  );

  // Computed property for paginated requests
  paginatedRequests = computed(() => {
    const requests = this.allRequests();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return requests.slice(start, end);
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

  // Data sources
  allUsers = this.dataService.users;
  allRequests = this.dataService.serviceRequests;
  allCategories = this.dataService.categories;

  // Computed properties for different views
  views = computed(() => [
    {
      id: "overview" as const,
      label: this.i18n.translate("overview"),
      icon: "fas fa-tachometer-alt",
    },
    {
      id: "requests" as const,
      label: this.i18n.translate("requests"),
      icon: "fas fa-list",
    },
    {
      id: "approvals" as const,
      label: this.i18n.translate("approvals"),
      icon: "fas fa-user-check",
    },
    {
      id: "finances" as const,
      label: this.i18n.translate("finances"),
      icon: "fas fa-chart-line",
    },
    {
      id: "professionals" as const,
      label: this.i18n.translate("professionals"),
      icon: "fas fa-users",
    },
    {
      id: "clients" as const,
      label: this.i18n.translate("clients"),
      icon: "fas fa-user-friends",
    },
    {
      id: "categories" as const,
      label: this.i18n.translate("categories"),
      icon: "fas fa-tags",
    },
  ]);

  pendingRegistrations = computed(() =>
    this.allUsers().filter(
      (u) =>
        (u.role === "professional") &&
        (u.status === "Pending" || u.email_verified === false)
    )
  );

  pendingApprovalCount = computed(() => this.pendingRegistrations().length);

  actionableRequests = computed(() =>
    this.allRequests().filter(
      (r) =>
        r.status === "Solicitado" ||
        r.status === "Orçamento enviado" ||
        r.status === "Orçamento aprovado"
    )
  );

  professionals = computed(() =>
    this.allUsers().filter(
      (u) => u.role === "professional" && u.status === "Active"
    )
  );

  clients = computed(() => this.allUsers().filter((u) => u.role === "admin"));

  completedRequests = computed(() =>
    this.allRequests().filter(
      (r) =>
        (r.status === "Finalizado" || r.status === ("Completed" as any)) &&
        r.cost
    )
  );

  financialStats = computed(() => {
    const completed = this.completedRequests();
    const totalRevenue = completed
      .filter((r) => r.payment_status === "Paid")
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    const totalTax = totalRevenue * 0.07;
    const outstandingAmount = completed
      .filter((r) => r.payment_status === "Unpaid")
      .reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      completedServices: completed.length,
      totalRevenue,
      totalTax,
      outstandingAmount,
    };
  });

  stats = computed(() => {
    const requests = this.allRequests();
    const users = this.allUsers();
    const financialData = this.financialStats();

    // Calcular tendências (simuladas para demonstração)
    const trends = this.calculateTrends();

    return [
      {
        label: this.i18n.translate("totalRevenue"),
        value: this.formatCost(financialData.totalRevenue),
        icon: "fas fa-euro-sign",
        bgColor: "bg-gradient-to-br from-green-100 to-green-200 text-green-700",
        trend: trends.revenue,
        trendColor: trends.revenue.includes("+")
          ? "text-green-600"
          : "text-red-600",
        badge: null,
      },
      {
        label: this.i18n.translate("pendingApprovals"),
        value: this.pendingApprovalCount(),
        icon: "fas fa-user-clock",
        bgColor:
          "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700",
        trend: trends.approvals,
        trendColor: trends.approvals.includes("+")
          ? "text-red-600"
          : "text-green-600",
        badge:
          this.getNewTodayCount() > 0
            ? `${this.getNewTodayCount()} ${this.i18n.translate("newToday")}`
            : null,
      },
      {
        label: this.i18n.translate("activeServices"),
        value: requests.filter((r) =>
          (Object.values(StatusService) as string[]).includes(r.status)
        ).length,
        icon: "fas fa-cogs",
        bgColor: "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700",
        trend: trends.activeServices,
        trendColor: trends.activeServices.includes("+")
          ? "text-green-600"
          : "text-red-600",
        badge:
          this.getUrgentCount() > 0
            ? `${this.getUrgentCount()} ${this.i18n.translate("urgentItems")}`
            : null,
      },
      {
        label: this.i18n.translate("totalProfessionals"),
        value: users.filter(
          (u) => u.role === "professional" && u.status === "Active"
        ).length,
        icon: "fas fa-users-cog",
        bgColor:
          "bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700",
        trend: trends.professionals,
        trendColor: trends.professionals.includes("+")
          ? "text-green-600"
          : "text-red-600",
        badge: null,
      },
      {
        label: this.i18n.translate("activeClients"),
        value: users.filter((u) => u.role === "admin" && u.status === "Active")
          .length,
        icon: "fas fa-user-friends",
        bgColor:
          "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700",
        trend: trends.clients,
        trendColor: trends.clients.includes("+")
          ? "text-green-600"
          : "text-red-600",
        badge: null,
      },
    ];
  });

  // Navigation methods
  setView(
    view:
      | "overview"
      | "requests"
      | "approvals"
      | "finances"
      | "professionals"
      | "categories"
      | "clients"
  ) {
    this.currentView.set(view);
  }

  // Navigate to finances tab when revenue card is clicked
  navigateToFinances() {
    this.setView("finances");
  }

  // Check if a stat is the revenue card
  isRevenueCard(statLabel: string): boolean {
    return statLabel === this.i18n.translate("totalRevenue");
  }

  // Check if a stat is the pending approvals card
  isPendingApprovalsCard(statLabel: string): boolean {
    return statLabel === this.i18n.translate("pendingApprovals");
  }

  // Check if a stat is the active services card
  isActiveServicesCard(statLabel: string): boolean {
    return statLabel === this.i18n.translate("activeServices");
  }

  // Check if a stat is the total professionals card
  isTotalProfessionalsCard(statLabel: string): boolean {
    return statLabel === this.i18n.translate("totalProfessionals");
  }

  // Check if a stat is the active clients card
  isActiveClientsCard(statLabel: string): boolean {
    return statLabel === this.i18n.translate("activeClients");
  }

  // Navigate to approvals tab when pending approvals card is clicked
  navigateToApprovals() {
    this.setView("approvals");
  }

  // Navigate to requests tab when active services card is clicked
  navigateToRequests() {
    this.setView("requests");
  }

  // Navigate to professionals tab when total professionals card is clicked
  navigateToProfessionals() {
    this.setView("professionals");
  }

  // Navigate to clients tab when active clients card is clicked
  navigateToClients() {
    this.setView("clients");
  }

  // Generic method to handle card clicks
  handleCardClick(statLabel: string) {
    if (this.isRevenueCard(statLabel)) {
      this.navigateToFinances();
    } else if (this.isPendingApprovalsCard(statLabel)) {
      this.navigateToApprovals();
    } else if (this.isActiveServicesCard(statLabel)) {
      this.navigateToRequests();
    } else if (this.isTotalProfessionalsCard(statLabel)) {
      this.navigateToProfessionals();
    } else if (this.isActiveClientsCard(statLabel)) {
      this.navigateToClients();
    }
  }

  // Check if a card is clickable
  isCardClickable(statLabel: string): boolean {
    return (
      this.isRevenueCard(statLabel) ||
      this.isPendingApprovalsCard(statLabel) ||
      this.isActiveServicesCard(statLabel) ||
      this.isTotalProfessionalsCard(statLabel) ||
      this.isActiveClientsCard(statLabel)
    );
  }

  // Get tooltip text for clickable cards
  getCardTooltip(statLabel: string): string {
    if (this.isRevenueCard(statLabel)) {
      return this.i18n.translate("clickToViewFinances");
    } else if (this.isPendingApprovalsCard(statLabel)) {
      return this.i18n.translate("clickToViewApprovals");
    } else if (this.isActiveServicesCard(statLabel)) {
      return this.i18n.translate("clickToViewRequests");
    } else if (this.isTotalProfessionalsCard(statLabel)) {
      return this.i18n.translate("clickToViewProfessionals");
    } else if (this.isActiveClientsCard(statLabel)) {
      return this.i18n.translate("clickToViewClients");
    }
    return "";
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

  // Helper methods
  getClientName(clientId: number | null): string {
    if (!clientId) return this.i18n.translate("unknownClient");
    return (
      this.allUsers().find((u) => u.id === clientId)?.name ||
      this.i18n.translate("unknownClient")
    );
  }

  getProfessionalName(professionalId: number | null): string {
    if (!professionalId) return this.i18n.translate("unassigned");
    return (
      this.allUsers().find((u) => u.id === professionalId)?.name ||
      this.i18n.translate("unassigned")
    );
  }

  statusClass(status: string): string {
    const statusClasses = {
      Pending:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800",
      Quoted:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800",
      Approved:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800",
      "In Progress":
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800",
      Completed:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800",
      Cancelled:
        "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800",
    };
    return (
      statusClasses[status as keyof typeof statusClasses] ||
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800"
    );
  }

  // Actions Menu methods
  toggleActionsMenu(requestId: number) {
    this.openActionsMenuId.set(
      this.openActionsMenuId() === requestId ? null : requestId
    );
  }

  isActionsMenuOpen(requestId: number): boolean {
    return this.openActionsMenuId() === requestId;
  }

  formatCost(amount: number | null | undefined): string {
    if (!amount) return "N/A";
    return `€ ${amount.toFixed(2)}`;
  }

  // Approval methods
  approveClient(userId: number) {
    this.dataService.updateUser(userId, { status: "Active" });
    this.notificationService.addNotification(
      this.i18n.translate("professionalApproved", {
        name:
          this.allUsers().find((u) => u.id === userId)?.name || "Professional",
      })
    );
  }

  rejectClient(userId: number) {
    if (confirm(this.i18n.translate("confirmRejectRegistration"))) {
      this.dataService.updateUser(userId, { status: "Rejected" });
      this.notificationService.addNotification(
        this.i18n.translate("professionalRejected", {
          name:
            this.allUsers().find((u) => u.id === userId)?.name ||
            "Professional",
        })
      );
    }
  }

  // Quote methods
  selectRequestForQuote(request: ServiceRequest) {
    this.quoteRequest.set(request);
    this.quoteAmount.set(request.cost || null);
  }

  submitQuote() {
    const request = this.quoteRequest();
    const amount = this.quoteAmount();

    if (!request || !amount || amount <= 0) return;

    this.dataService.updateServiceRequest(request.id, {
      cost: amount,
      status: "Orçamento enviado",
    });

    this.notificationService.addNotification(
      this.i18n.translate("quoteSubmitted", { id: request.id.toString() })
    );

    this.quoteRequest.set(null);
    this.quoteAmount.set(null);
  }

  respondToQuote(requestId: number, approved: boolean) {
    const status = approved ? "Orçamento aprovado" : "Orçamento rejeitado";
    this.dataService.updateServiceRequest(requestId, { status });

    this.notificationService.addNotification(
      approved
        ? this.i18n.translate("quoteApproved", { id: requestId.toString() })
        : this.i18n.translate("quoteRejected", { id: requestId.toString() })
    );
  }

  // Admin workflow methods
  async analyzeRequest(request: ServiceRequest) {
    try {
      await this.workflowService.analyzeRequest(request.id);
      this.notificationService.addNotification(
        this.i18n.translate("requestAnalysisStarted", { title: request.title })
      );
    } catch (error) {
      console.error("Error analyzing request:", error);
      this.notificationService.addNotification(
        this.i18n.translate("errorAnalyzingRequest")
      );
    }
  }

  async requestClarificationFromClient(request: ServiceRequest) {
    // In a real implementation, this would open a modal to input the clarification request
    // For now, we'll use a simple prompt
    const clarificationText = globalThis.prompt(
      this.i18n.translate("enterClarificationRequest")
    );

    if (!clarificationText?.trim()) return;

    try {
      await this.workflowService.requestClarification(
        request.id,
        clarificationText
      );
      this.notificationService.addNotification(
        this.i18n.translate("clarificationRequestSent", {
          title: request.title,
        })
      );
    } catch (error) {
      console.error("Error requesting clarification:", error);
      this.notificationService.addNotification(
        this.i18n.translate("errorRequestingClarification")
      );
    }
  }

  // Assignment methods
  selectRequestForAssignment(request: ServiceRequest) {
    this.assignmentRequest.set(request);
    this.assigningProfessionalId.set(null);
    this.resetSchedulingFields();
  }

  getProfessionalsForRequest(category_id: number): User[] {
    // category_id agora é number
    const filtered = this.professionals().filter(
      (p) =>
        p.specialties?.some((cat) => cat.id === category_id) ||
        !p.specialties?.length
    );
    return filtered.length > 0 ? filtered : this.professionals();
  }

  assignProfessional() {
    const request = this.assignmentRequest();
    const professionalId = this.assigningProfessionalId();
    const date = this.scheduledDate();
    const time = this.scheduledTime();
    const duration = this.estimatedDurationMinutes();

    if (!request || !professionalId || !date || !time || !duration) return;

    // Combine date and time into ISO datetime string
    const scheduledDateTime = this.combineDateTime(date, time);

    this.dataService
      .updateServiceRequest(request.id, {
        professional_id: professionalId,
        status: "Agendado",
        scheduled_start_datetime: scheduledDateTime,
        estimated_duration_minutes: duration,
      })
      .then(() => {
        // Atualiza a lista após atribuição
        const currentUser = this.dataService.authService.appUser();
        if (currentUser) {
          this.dataService.loadInitialData(currentUser);
        }
      });

    this.notificationService.addNotification(
      this.i18n.translate("professionalAssignedAndScheduled", {
        id: request.id.toString(),
        professional: this.getProfessionalName(professionalId),
        date: this.formatDateTime(scheduledDateTime),
      })
    );

    this.resetAssignmentForm();
  }

  // Scheduling helper methods
  resetSchedulingFields() {
    this.scheduledDate.set("");
    this.scheduledTime.set("");
    this.estimatedDurationMinutes.set(null);
  }

  resetAssignmentForm() {
    this.assignmentRequest.set(null);
    this.assigningProfessionalId.set(null);
    this.resetSchedulingFields();
  }

  cancelAssignment() {
    this.resetAssignmentForm();
  }

  getMinDate(): string {
    // Return today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split("T")[0];
  }

  setEstimatedDuration(minutes: number) {
    this.estimatedDurationMinutes.set(minutes);
  }

  combineDateTime(date: string, time: string): string {
    // Combine date and time into ISO datetime string
    return `${date}T${time}:00.000Z`;
  }

  formatDateTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      const locale = this.i18n.language() === "pt" ? "pt-PT" : "en-US";
      return date.toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return isoString;
    }
  }

  canAssignProfessional(): boolean {
    const duration = this.estimatedDurationMinutes();
    return !!(
      this.assigningProfessionalId() &&
      this.scheduledDate() &&
      this.scheduledTime() &&
      duration &&
      duration > 0
    );
  }

  // Verificar se uma solicitação precisa de atribuição de profissional
  needsProfessionalAssignment(request: ServiceRequest): boolean {
    return (
      // Status "Agendado" mas sem profissional
      (request.status === "Agendado" && !request.professional_id) ||
      // Status "Orçamento aprovado" (fluxo normal)
      request.status === "Orçamento aprovado" ||
      // Status "Aprovado" (novo fluxo)
      request.status === "Aprovado"
    );
  }

  // Execution date proposal methods
  openDateProposalModal(request: ServiceRequest) {
    this.dateProposalRequest.set(request);
    this.proposedExecutionDate.set("");
    this.proposedExecutionTime.set("");
    this.proposedExecutionNotes.set("");
  }

  proposeDateExecution() {
    const request = this.dateProposalRequest();
    const date = this.proposedExecutionDate();
    const time = this.proposedExecutionTime();
    const notes = this.proposedExecutionNotes();

    if (!request || !date || !time) {
      this.notificationService.addNotification(
        this.i18n.translate("fillRequiredFields")
      );
      return;
    }

    // Combine date and time into Date object
    const proposedDateTime = new Date(`${date}T${time}`);

    this.dataService.proposeExecutionDate(
      request.id,
      proposedDateTime,
      notes.trim() || undefined
    );

    this.notificationService.addNotification(
      this.i18n.translate("executionDateProposed", {
        id: request.id.toString(),
      })
    );

    this.cancelDateProposal();
  }

  cancelDateProposal() {
    this.dateProposalRequest.set(null);
    this.proposedExecutionDate.set("");
    this.proposedExecutionTime.set("");
    this.proposedExecutionNotes.set("");
  }

  canProposeDate(): boolean {
    return !!(this.proposedExecutionDate() && this.proposedExecutionTime());
  }

  isRequestAwaitingDateProposal(request: ServiceRequest): boolean {
    return request.status === "Orçamento aprovado";
  }

  // Professional management
  toggleAddProfessionalForm() {
    const currentValue = this.showAddProfessionalForm();
    console.log('toggleAddProfessionalForm - Current value:', currentValue);
    this.showAddProfessionalForm.set(!currentValue);
    console.log('toggleAddProfessionalForm - New value:', this.showAddProfessionalForm());
  }

  isProfessionalSpecialtySelected(categoryId: number): boolean {
    return this.editingProfessionalSpecialties().some(s => s.id === categoryId);
  }

  toggleNewProfessionalSpecialty(category: ServiceCategory, event: Event) {
    // category agora é ServiceCategory
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.newProfessionalSpecialties();
    if (checked) {
      if (!current.some((c) => c.id === category.id)) {
        this.newProfessionalSpecialties.set([...current, category]);
      }
    } else {
      this.newProfessionalSpecialties.set(
        current.filter((s) => s.id !== category.id)
      );
    }
  }

  async addProfessional() {
    console.log("🎯 AdminDashboard.addProfessional() chamado");
    const name = this.newProfessionalName().trim();
    const email = this.newProfessionalEmail().trim();

    console.log("📝 Dados do novo profissional:", { name, email });

    // 1. Validação básica
    if (!name || !email) {
      this.notificationService.addNotification(
        this.i18n.translate("fillRequiredFields")
      );
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.notificationService.addNotification(
        "Por favor, insira um e-mail válido (exemplo: usuario@email.com)"
      );
      return;
    }

    try {
      // 2. Verifica duplicidade
      const { data: existing, error: checkError } = await this.supabaseService.client
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (checkError) {
        throw checkError;
      }
      if (existing) {
        this.notificationService.addNotification(
          'Já existe um usuário cadastrado com este e-mail.'
        );
        return;
      }

      // 3. Cria o usuário via Supabase Auth (envia e-mail de confirmação automaticamente)
      const tempPassword = Math.random().toString(36).slice(-10) + Date.now();
      const { data, error: signUpError } = await this.supabaseService.client.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: { name, role: 'professional', status: 'Pending' }
        }
      });
      if (signUpError) {
        throw signUpError;
      }


      // Não insere mais na tabela users imediatamente!
      // A inserção será feita automaticamente após a confirmação do e-mail pelo profissional.
      // O admin será notificado e o profissional só aparecerá na lista após confirmar o e-mail.

      // --- Sincroniza email_verified após confirmação do e-mail ---
      // (pode ser chamado após confirmação, mas aqui já deixa o método pronto)
      const syncEmailVerified = async (authId: string) => {
        // Busca status do usuário no Supabase Auth
        const { data: userData, error: userError } = await this.supabaseService.client.auth.getUser();
        if (userError) return;
        if (userData?.user?.id === authId && userData.user.email_confirmed_at) {
          await this.supabaseService.client.from('users')
            .update({ email_verified: true })
            .eq('auth_id', authId);
        }
      };
      // Exemplo de uso: aguarda alguns segundos e tenta sincronizar
      setTimeout(() => {
        if (data.user?.id) syncEmailVerified(data.user.id);
      }, 5000);

      this.notificationService.addNotification(
        `✅ Profissional ${name} criado! E-mail de confirmação enviado pelo Supabase.\nO cadastro só será concluído após o profissional confirmar o e-mail.`
      );
      this.resetNewProfessionalForm();
    } catch (error: any) {
      console.error("❌ Erro ao adicionar profissional:", error);
      this.notificationService.addNotification(
        `Erro ao adicionar profissional: ${error.message || 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Envia e-mail customizado (mock: adapte para serviço real de e-mail)
   */
  async sendCustomEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    // Envia e-mail de verdade via backend Node.js/SendGrid
    try {
      const response = await fetch('http://localhost:4001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao enviar e-mail');
      }
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw error;
    }
  }

  /**
   * Limpa o formulário de novo profissional
   */
  resetNewProfessionalForm() {
    this.showAddProfessionalForm.set(false);
    this.newProfessionalName.set("");
    this.newProfessionalEmail.set("");
    this.newProfessionalSpecialties.set([]);
  }


/**
 * Limpa o formulário de novo profissional
 */


  cancelEditProfessional() {
    this.editingProfessional.set(null);
    this.editingProfessionalName.set("");
    this.editingProfessionalEmail.set("");
    this.editingProfessionalSpecialties.set([]);
  }

  // Category management
  startEditCategory(category: ServiceCategory) {
    // category agora é ServiceCategory
    this.editingCategory.set(category);
    this.editingCategoryName.set(category.name);
  }

  saveCategoryEdit() {
    const oldCategory = this.editingCategory();
    const newName = this.editingCategoryName().trim();
    if (!oldCategory || !newName || newName === oldCategory.name) {
      this.editingCategory.set(null);
      return;
    }
    if (this.allCategories().some((cat) => cat.name === newName)) {
      this.notificationService.addNotification(
        this.i18n.translate("categoryAlreadyExists")
      );
      return;
    }
    this.allCategories.update((cats) =>
      cats.map((cat) =>
        cat.id === oldCategory.id ? { ...cat, name: newName } : cat
      )
    );
    this.notificationService.addNotification(
      this.i18n.translate("categoryUpdated", {
        old: oldCategory.name,
        new: newName,
      })
    );
    this.editingCategory.set(null);
    this.editingCategoryName.set("");
  }

  addCategory() {
    const catName = this.newCategory().trim();
    if (catName && !this.allCategories().some((cat) => cat.name === catName)) {
      // Cria novo objeto ServiceCategory
      const newCat: ServiceCategory = { id: Date.now(), name: catName };
      this.allCategories.update((cats) => [...cats, newCat]);
      this.newCategory.set("");
      this.notificationService.addNotification(
        this.i18n.translate("categoryAdded", { category: catName })
      );
    } else if (this.allCategories().some((cat) => cat.name === catName)) {
      this.notificationService.addNotification(
        this.i18n.translate("categoryAlreadyExists")
      );
    }
  }

  deleteCategory(categoryToDelete: ServiceCategory) {
    if (
      confirm(
        this.i18n.translate("confirmDeleteCategory", {
          category: categoryToDelete.name,
        })
      )
    ) {
      this.allCategories.update((cats) =>
        cats.filter((c) => c.id !== categoryToDelete.id)
      );
      this.notificationService.addNotification(
        this.i18n.translate("categoryDeleted", {
          category: categoryToDelete.name,
        })
      );
    }
  }

  // Client management methods
  activateClient(userId: number) {
    this.dataService.updateUser(userId, { status: "Active" });
    this.notificationService.addNotification(
      this.i18n.translate("clientActivated", {
        name: this.allUsers().find((u) => u.id === userId)?.name || "Cliente",
      })
    );
  }

  deactivateClient(userId: number) {
    if (confirm(this.i18n.translate("confirmDeactivateClient"))) {
      this.dataService.updateUser(userId, { status: "Rejected" });
      this.notificationService.addNotification(
        this.i18n.translate("clientDeactivated", {
          name: this.allUsers().find((u) => u.id === userId)?.name || "Cliente",
        })
      );
    }
  }

  getClientStats(clientId: number) {
    const requests = this.allRequests().filter((r) => r.client_id === clientId);
    const completedRequests = requests.filter((r) => r.status === "Finalizado");
    const totalSpent = completedRequests.reduce(
      (sum, r) => sum + (r.cost || 0),
      0
    );

    return {
      totalRequests: requests.length,
      completedRequests: completedRequests.length,
      totalSpent: totalSpent,
      lastServiceDate:
        requests.length > 0
          ? Math.max(
              ...requests.map((r) => new Date(r.requested_date).getTime())
            )
          : null,
    };
  }

  // Financial methods
  exportToCSV() {
    this.exportFinancialsAsCSV();
  }

  generateInvoice(request: ServiceRequest) {
    this.invoiceRequest.set(request);
  }

  printInvoice() {
    globalThis.print();
  }

  exportFinancialsAsCSV() {
    const completedRequests = this.completedRequests();
    if (completedRequests.length === 0) {
      this.notificationService.addNotification(
        this.i18n.translate("noDataToExport")
      );
      return;
    }

    const i18n = this.i18n;
    const headers = [
      i18n.translate("csvId"),
      i18n.translate("csvClient"),
      i18n.translate("csvProfessional"),
      i18n.translate("csvService"),
      i18n.translate("csvCompletionDate"),
      i18n.translate("csvPaymentStatus"),
      i18n.translate("csvBaseValue"),
      i18n.translate("csvTax"),
      i18n.translate("csvTotalValue"),
    ];

    const rows = completedRequests.map((r) => {
      const client = this.getClientName(r.client_id);
      const professional = this.getProfessionalName(r.professional_id);
      const tax = (r.cost || 0) * 0.07;
      const total = (r.cost || 0) + tax;

      return [
        r.id,
        client,
        professional,
        r.title,
        r.scheduled_date || r.requested_date,
        r.payment_status,
        (r.cost || 0).toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financial_report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();

    this.notificationService.addNotification(
      this.i18n.translate("reportExported")
    );
  }

  // Legacy methods for compatibility
  handleApprove(user: User) {
    this.approveClient(user.id);
  }

  handleReject(user: User) {
    this.rejectClient(user.id);
  }

  // Admin Dashboard specific actions
  viewRequestDetails(request: ServiceRequest) {
    console.log("Admin Dashboard - viewRequestDetails called:", request);
    // Emit to parent component to open modal
    // For now, we'll just log - the parent app component should handle this
    globalThis.postMessage(
      {
        type: "OPEN_REQUEST_DETAILS",
        payload: request,
      },
      globalThis.location.origin
    );
  }

  openChat(request: ServiceRequest) {
    console.log("Admin Dashboard - openChat called:", request);
    // Emit to parent component to open chat
    globalThis.postMessage(
      {
        type: "OPEN_CHAT",
        payload: request,
      },
      globalThis.location.origin
    );
  }

  // New actions for changing professional and adjusting schedule
  changeProfessional(request: ServiceRequest) {
    console.log("Admin Dashboard - changeProfessional called:", request);
    globalThis.postMessage(
      {
        type: "OPEN_CHANGE_PROFESSIONAL",
        payload: request,
      },
      globalThis.location.origin
    );
    this.notificationService.addNotification(
      this.i18n.translate("changeProfessionalAction")
    );
  }

  adjustSchedule(request: ServiceRequest) {
    console.log("Admin Dashboard - adjustSchedule called:", request);
    globalThis.postMessage(
      {
        type: "OPEN_ADJUST_SCHEDULE",
        payload: request,
      },
      globalThis.location.origin
    );
    this.notificationService.addNotification(
      this.i18n.translate("adjustScheduleAction")
    );
  }
  
  // Direct Assignment Methods (nova funcionalidade)
  openDirectAssignmentModal(request: ServiceRequest) {
    this.directAssignmentRequest.set(request);
    this.directAssignmentProfessionalId.set(null);
    this.directAssignmentDate.set("");
    this.directAssignmentTime.set("");
    this.directAssignmentDuration.set(null);
  }

  canDirectAssign(): boolean {
    const duration = this.directAssignmentDuration();
    return !!(
      this.directAssignmentProfessionalId() &&
      this.directAssignmentDate() &&
      this.directAssignmentTime() &&
      duration &&
      duration > 0
    );
  }

  async submitDirectAssignment() {
    const request = this.directAssignmentRequest();
    const professionalId = this.directAssignmentProfessionalId();
    const date = this.directAssignmentDate();
    const time = this.directAssignmentTime();
    const duration = this.directAssignmentDuration();

    if (!request || !professionalId || !date || !time || !duration) {
      this.notificationService.addNotification(
        this.i18n.translate("fillRequiredFields")
      );
      return;
    }

    // Combine date and time into ISO datetime string
    const scheduledDateTime = this.combineDateTime(date, time);

    try {
      // Atualizar a solicitação com status "Aguardando confirmação do profissional"
      await this.dataService.updateServiceRequest(request.id, {
        professional_id: professionalId,
        status: "Aguardando confirmação do profissional",
        scheduled_start_datetime: scheduledDateTime,
        estimated_duration_minutes: duration,
      });

      const professionalName = this.getProfessionalName(professionalId);

      // Enviar notificação para o profissional
      await this.notificationService.createEnhancedNotification(
        professionalId,
        "professional_assigned",
        this.i18n.translate("newServiceAssignment"),
        this.i18n.translate("serviceAssignmentMessage", {
          id: request.id.toString(),
          title: request.title,
          date: this.formatDateTime(scheduledDateTime),
        }) + " " + this.i18n.translate("pleaseConfirmAssignment"),
        {
          serviceRequestId: request.id,
          actionRequired: true,
          priority: "high",
        }
      );

      this.notificationService.addNotification(
        this.i18n.translate("directAssignmentSuccess", {
          id: request.id.toString(),
          professional: professionalName,
        })
      );

      this.notificationService.addNotification(
        this.i18n.translate("professionalNotified", {
          professional: professionalName,
        })
      );

      // Refresh data
      const currentUser = this.dataService.authService.appUser();
      if (currentUser) {
        await this.dataService.loadInitialData(currentUser);
      }

      this.cancelDirectAssignment();
    } catch (error) {
      console.error("Error directing service request:", error);
      this.notificationService.addNotification(
        this.i18n.translate("directAssignmentError")
      );
    }
  }

  cancelDirectAssignment() {
    this.directAssignmentRequest.set(null);
    this.directAssignmentProfessionalId.set(null);
    this.directAssignmentDate.set("");
    this.directAssignmentTime.set("");
    this.directAssignmentDuration.set(null);
  }

  setDirectAssignmentDuration(minutes: number) {
    this.directAssignmentDuration.set(minutes);
  }

  // Computed properties for backward compatibility
  pendingProfessionals = this.pendingRegistrations;
  categories = this.allCategories;

  // Métodos para calcular tendências e badges
  calculateTrends() {
    // Simulação de tendências baseada em dados aleatórios para demonstração
    // Em um sistema real, isso seria calculado comparando com dados históricos
    return {
      revenue: "+12%",
      approvals: "+3",
      activeServices: "-5%",
      professionals: "+2",
      clients: "+8%",
    };
  }

  getNewTodayCount(): number {
    // Simulação: contar registros criados hoje
    // Em um sistema real, isso seria baseado em timestamps
    return Math.floor(Math.random() * 5);
  }

  getUrgentCount(): number {
    // Simulação: contar itens urgentes (pendentes há mais de 3 dias)
    // Em um sistema real, isso seria baseado em datas de criação
    return Math.floor(Math.random() * 3);
  }

  // Métodos para ações rápidas
  createNewService() {
    this.notificationService.addNotification(
      this.i18n.translate("newService") +
        " - " +
        this.i18n.translate("featureComingSoon")
    );
  }

  generateReport() {
    this.exportToCSV();
  }

  viewAllRequests() {
    this.setView("requests");
  }

  manageUsers() {
    this.setView("approvals");
  }

  // Métodos para auto-refresh e atividades
  getRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${this.i18n.translate("minutesAgo")}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ${this.i18n.translate("hoursAgo")}`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} ${this.i18n.translate("daysAgo")}`;
    }
  }

  startAutoRefresh() {
    // Limpar intervalo existente se houver
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Configurar auto-refresh a cada 30 segundos
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  refreshData() {
    // Atualizar dados do serviço apenas se a aba ativa for relevante
    const currentUser = this.dataService.authService.appUser();
    const activeView = this.currentView();
    // Defina aqui as abas que precisam de auto-refresh
    const viewsToRefresh = ["professionals", "requests", "overview"];
    if (currentUser && viewsToRefresh.includes(activeView)) {
      this.dataService.loadInitialData(currentUser);
      this.lastUpdate.set(new Date());
    }
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }
}
