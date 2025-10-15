import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  output,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { User, ServiceRequest } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { WorkflowService } from "../../services/workflow.service";
import { ServiceListComponent } from "../service-list/service-list.component";
import { I18nService } from "../../i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { signal } from "@angular/core";
import { StatusService } from "../../services/status.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, ServiceListComponent, I18nPipe],
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
    Assigned: "Agendado",
    Pending: "Pendente",
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

  private dataService = inject(DataService);
  private workflowService = inject(WorkflowService);
  private i18n = inject(I18nService);

  private userRequests = computed(() => {
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

  // Filtros consistentes usando statusAtivos
  activeRequests = computed(() => {
    // Obtém os status ativos em português
    const ativosPt = this.statusAtivos()
      .map((s) => this.statusMap[s.value])
      .filter(Boolean);
    const requests = this.userRequests();
    console.log("[DashboardComponent] Status ativos (pt):", ativosPt);
    console.log("[DashboardComponent] Requests:", requests);
    const ativos = requests.filter((r) => ativosPt.includes(r.status));
    console.log("[DashboardComponent] Requests ativos:", ativos);
    return ativos;
  });
  completedRequests = computed(() => {
    // Considera como completados os que não estão nos ativos
    const ativosPt = this.statusAtivos()
      .map((s) => this.statusMap[s.value])
      .filter(Boolean);
    const requests = this.userRequests();
    const completados = requests.filter((r) => !ativosPt.includes(r.status));
    console.log("[DashboardComponent] Requests completados:", completados);
    return completados;
  });

  stats = computed(() => {
    const currentUser = this.user();
    const requests = this.userRequests();

    const ativosPt = this.statusAtivos()
      .map((s) => this.statusMap[s.value])
      .filter(Boolean);
    if (currentUser.role === "client" || currentUser.role === "admin") {
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
}
