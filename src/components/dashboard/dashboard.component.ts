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
import { I18nService } from "../../services/i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, ServiceListComponent, I18nPipe],
  templateUrl: "./dashboard.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();
  openChat = output<ServiceRequest>();
  payNow = output<ServiceRequest>();
  scheduleRequest = output<ServiceRequest>();
  provideClarification = output<ServiceRequest>();

  private dataService = inject(DataService);
  private workflowService = inject(WorkflowService);
  private i18n = inject(I18nService);

  private userRequests = computed(() => {
    const allRequests = this.dataService.serviceRequests();
    const currentUser = this.user();
    console.log("Dashboard - Total requests:", allRequests.length);
    console.log("Dashboard - Current user:", currentUser);
    if (currentUser.role === "client") {
      return allRequests.filter((r) => r.client_id === currentUser.id);
    } else if (currentUser.role === "professional") {
      return allRequests.filter((r) => r.professional_id === currentUser.id);
    } else if (currentUser.role === "admin") {
      return allRequests;
    }
    return [];
  });

  // Considera status ativos em português
  activeRequests = computed(() =>
    this.userRequests().filter((r) =>
      [
        // Português
        "Solicitado",
        "Em análise",
        "Aguardando esclarecimentos",
        "Orçamento enviado",
        "Aguardando aprovação do orçamento",
        "Orçamento aprovado",
        "Aguardando data de execução",
        "Data proposta pelo administrador",
        "Aguardando aprovação da data",
        "Data aprovada pelo cliente",
        "Buscando profissional",
        "Profissional selecionado",
        "Aguardando confirmação do profissional",
        "Agendado",
        "Em execução",
        "Concluído - Aguardando aprovação",
        // Inglês
        "Assigned",
        "Pending",
        "Scheduled",
        "In Progress",
      ].includes(r.status)
    )
  );
  completedRequests = computed(() =>
    this.userRequests().filter((r) => r.status === "Finalizado")
  );

  stats = computed(() => {
    const currentUser = this.user();
    const requests = this.userRequests();

    // Status ativos em português
    const statusAtivos = [
      // Português
      "Solicitado",
      "Em análise",
      "Aguardando esclarecimentos",
      "Orçamento enviado",
      "Aguardando aprovação do orçamento",
      "Orçamento aprovado",
      "Aguardando data de execução",
      "Data proposta pelo administrador",
      "Aguardando aprovação da data",
      "Data aprovada pelo cliente",
      "Buscando profissional",
      "Profissional selecionado",
      "Aguardando confirmação do profissional",
      "Agendado",
      "Em execução",
      "Concluído - Aguardando aprovação",
      // Inglês
      "Assigned",
      "Pending",
      "Scheduled",
      "In Progress",
    ];

    if (currentUser.role === "client" || currentUser.role === "admin") {
      return [
        {
          label: this.i18n.translate("activeRequests"),
          value: requests.filter((r) => statusAtivos.includes(r.status)).length,
          icon: "fas fa-cogs text-blue-500",
        },
        {
          label: this.i18n.translate("completed"),
          value: requests.filter((r) => r.status === "Finalizado").length,
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
          value: requests.filter((r) => statusAtivos.includes(r.status)).length,
          icon: "fas fa-briefcase text-blue-500",
        },
        {
          label: this.i18n.translate("completedJobs"),
          value: requests.filter((r) => r.status === "Finalizado").length,
          icon: "fas fa-check-double text-green-500",
        },
        {
          label: this.i18n.translate("totalEarnings"),
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
}
