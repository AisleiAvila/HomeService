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
  // Handler para detalhar solicitação
  handleViewDetails(request: ServiceRequest) {
    this.viewDetails.emit(request);
    // Aqui pode abrir modal, navegar ou atualizar view conforme necessário
  }
  // Signal para exibir erro de negócio
  showBusinessError = signal(false);
  businessErrorMessage = signal<string>("");
  // Método utilitário para uso no template
  isArray(val: any): boolean {
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
      this.showBusinessRuleError("Erro ao finalizar serviço. Tente novamente.");
      console.error("Erro ao finalizar serviço:", error);
    }
  }

  public ngOnInit() {
    this.statusAtivos.set(
      Object.values(StatusService).map((status) => ({
        value: status,
        label: this.i18n.translateStatus(status),
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
    console.log(
      "[DashboardComponent] Requests após filtro:",
      filtered.length,
      filtered
    );
    return filtered;
  });

  // Considera status ativos em português
  activeRequests = computed(() => {
    const reqs = this.userRequests().filter(
      (r) => r.status !== "Finalizado" && r.status !== "Completed"
    );
    if (Array.isArray(reqs)) {
      return reqs;
    }
    if (reqs === undefined || reqs === null) {
      return [];
    }
    // Se for outro tipo, tenta converter para array
    try {
      return Array.from(reqs);
    } catch {
      return [];
    }
  });
  completedRequests = computed(() =>
    this.userRequests().filter(
      (r) => r.status === "Finalizado" || r.status === "Completed"
    )
  );

  stats = computed(() => {
    const currentUser = this.user();
    const requests = this.userRequests();

    if (currentUser.role === "client" || currentUser.role === "admin") {
      return [
        {
          label: "activeRequests",
          value: requests.filter((r) =>
            this.statusAtivos()
              .map((s) => s.value)
              .includes(r.status)
          ).length,
          icon: "fas fa-cogs text-blue-500",
        },
        {
          label: "completed",
          value: requests.filter(
            (r) => r.status === "Finalizado" || r.status === "Completed"
          ).length,
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
          label: "activeJobs",
          value: requests.filter((r) =>
            this.statusAtivos()
              .map((s) => s.value)
              .includes(r.status)
          ).length,
          icon: "fas fa-briefcase text-blue-500",
        },
        {
          label: "completedJobs",
          value: requests.filter((r) => r.status === "Finalizado").length,
          icon: "fas fa-check-double text-green-500",
        },
        {
          label: "totalEarnings",
          value: `€${earnings.toFixed(2)}`,
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
