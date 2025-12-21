import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  computed,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ServiceRequest,
  User,
  Address,
  ServiceStatus,
} from "@/src/models/maintenance.models";
import { StatusUtilsService } from "@/src/utils/status-utils.service";
import { DataService } from "../../services/data.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { PaymentModalComponent } from "../payment-modal/payment-modal.component";
import { I18nService } from "@/src/i18n.service";
import { formatPtAddress, extractPtAddressParts } from "@/src/utils/address-utils";

@Component({
  selector: "app-service-list",
  standalone: true,
  imports: [
    CommonModule,
    I18nPipe,
    PaymentModalComponent,
  ],
  templateUrl: "./service-list.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceListComponent {
  constructor() {
    this.itemsPerPage.set(this.itemsPerPageDefault());
  }
  serviceRequests = input<ServiceRequest[]>();
  currentUser = input.required<User>();
  enablePagination = input<boolean>(false); // New input to enable pagination
  itemsPerPageDefault = input<number>(10); // Default items per page
  
  // Ordenação
  sortBy = input<string>("date");
  sortOrder = input<"asc" | "desc">("desc");
  sortChange = output<string>(); // Emite a coluna clicada

  viewDetails = output<ServiceRequest>();
  viewGeolocation = output<ServiceRequest>();

  logAndEmitViewDetails(request: ServiceRequest) {
    console.log('[ServiceListComponent] Botão detalhes clicado. Request:', request);
    if (request) {
      console.log('[ServiceListComponent] Emitindo viewDetails com:', request.id, request.title);
      this.viewDetails.emit(request);
    } else {
      console.error('[ServiceListComponent] Request inválido ao tentar emitir detalhes:', request);
    }
  }
  openChat = output<ServiceRequest>();
  approveExecutionDate = output<ServiceRequest>();
  rejectExecutionDate = output<{ request: ServiceRequest; reason: string }>();
  payNow = output<ServiceRequest>();
  showPaymentModal = signal(false);
  selectedRequestForPayment = signal<ServiceRequest | null>(null);
  scheduleRequest = output<ServiceRequest>();
  provideClarification = output<ServiceRequest>();
  startService = output<ServiceRequest>();
  finishService = output<ServiceRequest>();
  confirmAssignment = output<ServiceRequest>();
  rejectAssignment = output<ServiceRequest>();
  // Ids de requests com ação em andamento (controlado pelo pai)
  actionLoadingIds = input<number[]>([]);

  private readonly dataService = inject(DataService);
  private readonly i18n = inject(I18nService);

  // Expose Math for template use
  Math = Math;

  // Pagination state
  currentPage = signal(1);
  itemsPerPage = signal(10);

  private readonly overdueRequestsList = computed(() => {
    const requests = this.serviceRequests();
    if (!requests || !Array.isArray(requests)) {
      return [];
    }
    return requests.filter((request) => this.isRequestOverdue(request));
  });
  delayedRequestsCount = computed(() => this.overdueRequestsList().length);
  delayedRequestsPreview = computed(() =>
    this.overdueRequestsList().slice(0, 3)
  );
  showAdminOverdueBanner = computed(() => {
    const user = this.currentUser();
    return user.role === "admin" && this.delayedRequestsCount() > 0;
  });
  overdueBannerTitle = computed(() => {
    const label =
      this.i18n.translate("overdueRequestsAwaitingAction") ||
      "solicitações aguardando início";
    return `${this.delayedRequestsCount()} ${label}`;
  });
  overdueBannerDescription = computed(
    () =>
      this.i18n.translate("overdueRequestsAdminDescription") ||
      "Os alertas automáticos já foram emitidos, mas valide com o profissional responsável."
  );

  // Initialize items per page based on input
  // ...existing code...

  // Computed properties for pagination
  totalPages = computed(() => {
    if (!this.enablePagination()) return 1;
    return Math.ceil(this.serviceRequests().length / this.itemsPerPage());
  });

  ngOnInit() {
    console.log("[ServiceListComponent] currentUser:", this.currentUser().name);
  }

  // Método para lidar com clique na coluna
  handleSortColumn(column: string) {
    this.sortChange.emit(column);
  }

  // Método para verificar se a coluna está sendo ordenada
  isSortedBy(column: string): boolean {
    return this.sortBy() === column;
  }

  displayedRequests = computed(() => {
    if (!this.enablePagination()) {
      const reqs = this.serviceRequests();
      console.log(
        "[ServiceListComponent] displayedRequests (no pagination):",
        reqs
      );
      if (Array.isArray(reqs)) {
        reqs.forEach((r, i) => {
          console.log(
            `[ServiceListComponent] Request[${i}].id:`,
            r.id,
            "client_name:",
            r.client_name,
            "status:",
            r.status
          );
        });
      }
      return reqs;
    }

    const requests = this.serviceRequests();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    const paginated = requests.slice(start, end);
    console.log(
      `[ServiceListComponent] displayedRequests (paginated):`,
      paginated
    );
    if (Array.isArray(paginated)) {
      paginated.forEach((r, i) => {
        console.log(
          `[ServiceListComponent] Paginated[${i}].id:`,
          r.id,
          "status:",
          r.status
        );
      });
    }
    return paginated;
  });

  // Pagination helper methods
  get pageNumbers(): number[] {
    if (!this.enablePagination()) return [];

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

  // Computed property to get all users for lookup
  allUsers = this.dataService.users;

  // Verifica se deve mostrar a coluna de valor (ocultar para funcionários da Natan)
  shouldShowValueColumn = computed(() => {
    const user = this.currentUser();
    // Oculta para profissionais que são funcionários da Natan
    if (user.role === 'professional' && user.is_natan_employee === true) {
      return false;
    }
    return true;
  });

  formatAddress(src: ServiceRequest | Address): string {
    return formatPtAddress(src);
  }

  getAddressParts(src: ServiceRequest | Address) {
    return extractPtAddressParts(src);
  }

  getProfessionalProfile(professionalId: number | null): User | null {
    if (!professionalId) return null;
    return this.allUsers().find((u) => u.id === professionalId) ?? null;
  }

  getProfessionalName(professionalId: number | null): string {
    return (
      this.getProfessionalProfile(professionalId)?.name ||
      this.i18n.translate("unassigned")
    );
  }

  statusClass(status: ServiceStatus): string {
    const baseClass =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const color = StatusUtilsService.getColor(status);
    // Gera classes Tailwind a partir da cor hex (padrão: bg-[cor] text-white)
    // Para manter compatibilidade, usa bg-[cor] inline style e text color fixo
    return `${baseClass} text-white`;
  }

  getStatusLabel(status: ServiceStatus): string {
    const label = StatusUtilsService.getLabel(status, this.i18n);
    console.log(
      `[ServiceListComponent] getStatusLabel: status='${status}' => label='${label}'`
    );
    return label;
  }

  isLoading(requestId: number): boolean {
    return (this.actionLoadingIds() || []).includes(requestId);
  }

  handlePayNow(request: ServiceRequest) {
    this.selectedRequestForPayment.set(request);
    this.showPaymentModal.set(true);
  }

  handlePaymentModalClose() {
    this.showPaymentModal.set(false);
    this.selectedRequestForPayment.set(null);
  }

  handlePaymentConfirmed(event: { request: ServiceRequest; method: string }) {
    // Emitir evento para processar pagamento
    this.payNow.emit(event.request);
    this.showPaymentModal.set(false);
    this.selectedRequestForPayment.set(null);
  }

  isRequestOverdue(request: ServiceRequest): boolean {
    if (request.overdue === true) {
      return true;
    }

    const schedulingStatus = this.dataService.getSchedulingStatus(request);
    return schedulingStatus === "Delayed";
  }

  getOverdueBadgeLabel(request: ServiceRequest): string {
    const schedulingStatus = this.dataService.getSchedulingStatus(request);

    switch (request.status) {
      case "Data Definida":
        return this.i18n.translate("workStartLate") || "Início atrasado";
      case "Aceito":
        return this.i18n.translate("paymentLate") || "Pagamento atrasado";
      case "Concluído":
        return this.i18n.translate("evaluationLate") || "Avaliação pendente";
      case "Aguardando Confirmação":
        return (
          this.i18n.translate("professionalConfirmationLate") ||
          "Confirmação em atraso"
        );
      default:
        if (schedulingStatus === "Scheduled" || schedulingStatus === "Scheduled Today") {
          return this.i18n.translate("workStartLate") || "Início atrasado";
        }
        return this.i18n.translate("actionOverdue") || "Ação em atraso";
    }
  }

  getOverdueDescription(request: ServiceRequest): string {
    const schedulingStatus = this.dataService.getSchedulingStatus(request);
    const serviceNameTag = request.title ? ` — ${request.title}` : "";

    switch (request.status) {
      case "Data Definida":
        return (
          this.i18n.translate("workStartOverdueDescription") ||
          "O trabalho deveria ter começado após o horário combinado."
        ) + serviceNameTag;
      case "Aceito":
        return (
          this.i18n.translate("paymentOverdueDescription") ||
          "O pagamento não foi confirmado dentro do prazo esperado."
        ) + serviceNameTag;
      case "Concluído":
        return (
          this.i18n.translate("evaluationOverdueDescription") ||
          "As avaliações do serviço ainda não foram preenchidas."
        ) + serviceNameTag;
      case "Aguardando Confirmação":
        return (
          this.i18n.translate("professionalConfirmationOverdueDescription") ||
          "O profissional precisa confirmar ou recusar o atendimento."
        ) + serviceNameTag;
      default:
        if (schedulingStatus === "Scheduled" || schedulingStatus === "Scheduled Today") {
          return (
            this.i18n.translate("workStartOverdueDescription") ||
            "O trabalho deveria ter começado após o horário combinado."
          ) + serviceNameTag;
        }
        return (
          this.i18n.translate("genericOverdueDescription") ||
          "Existe uma ação pendente além do prazo configurado."
        ) + serviceNameTag;
    }
  }
}
