import {
  Component,
  computed,
  input,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ServiceRequest, ServiceStatus } from "@/src/models/maintenance.models";
import { StatusUtilsService } from "@/src/utils/status-utils.service";
import { StatusMigrationUtil } from "@/src/utils/status-migration.util";
import { I18nService } from "../../i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

interface WorkflowPhase {
  id: number;
  title: string;
  description: string;
  statuses: ServiceStatus[]; // Agora usa apenas os 11 status novos
  completed: boolean;
  current: boolean;
  icon: string;
  color: string;
}

@Component({
  selector: "app-workflow-timeline",
  standalone: true,
  imports: [CommonModule, I18nPipe],
  templateUrl: "./workflow-timeline.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowTimelineComponent {
  // Input obrigatório
  serviceRequest = input.required<ServiceRequest>();

  // Injeção de serviços
  private readonly i18n = inject(I18nService);

  // Computed signals
  phases = computed(() => {
    const request = this.serviceRequest();
    // Migrar status deprecated automaticamente
    const currentStatus = StatusMigrationUtil.migrateStatus(request.status);

    const phases: WorkflowPhase[] = [
      {
        id: 1,
        title: this.i18n.translate("requestCreation"),
        description: this.i18n.translate("adminCreatesAndAssigns"),
        statuses: [
          "Solicitado",      // Admin criou
          "Atribuído",       // Admin atribuiu a profissional
        ],
        completed: this.isPhaseCompleted(1, currentStatus),
        current: this.isCurrentPhase(1, currentStatus),
        icon: "document-text",
        color: "blue",
      },
      {
        id: 2,
        title: this.i18n.translate("professionalConfirmation"),
        description: this.i18n.translate("professionalAcceptsOrRejects"),
        statuses: [
          "Aguardando Confirmação",  // Notificado
          "Aceito",                  // Profissional aceitou
          "Recusado",                // Profissional recusou
          "Data Definida",           // Profissional agendou
        ],
        completed: this.isPhaseCompleted(2, currentStatus),
        current: this.isCurrentPhase(2, currentStatus),
        icon: "calendar",
        color: "green",
      },
      {
        id: 3,
        title: this.i18n.translate("execution"),
        description: this.i18n.translate("serviceExecution"),
        statuses: [
          "Em Progresso",           // Profissional executando
          "Aguardando Finalização", // Profissional concluiu
        ],
        completed: this.isPhaseCompleted(3, currentStatus),
        current: this.isCurrentPhase(3, currentStatus),
        icon: "cog",
        color: "orange",
      },
      {
        id: 4,
        title: this.i18n.translate("paymentAndCompletion"),
        description: this.i18n.translate("adminPaysAndFinalizes"),
        statuses: [
          "Pagamento Feito",  // Admin registrou pagamento
          "Concluído",        // Admin finalizou
          "Cancelado",        // Cancelado
        ],
        completed: this.isPhaseCompleted(4, currentStatus),
        current: this.isCurrentPhase(4, currentStatus),
        icon: "check-circle",
        color: "purple",
      },
    ];

    return phases;
  });

  currentPhaseNumber = computed(() => {
    const phases = this.phases();
    const currentPhase = phases.find((p) => p.current);
    return currentPhase?.id || 1;
  });

  progressPercentage = computed(() => {
    const phases = this.phases();
    const completedPhases = phases.filter((p) => p.completed).length;
    const currentPhase = phases.find((p) => p.current);

    // Se há uma fase atual, adiciona 50% de progresso para ela
    const currentPhaseProgress = currentPhase ? 0.5 : 0;

    return ((completedPhases + currentPhaseProgress) / phases.length) * 100;
  });

  private isPhaseCompleted(
    phaseId: number,
    currentStatus: ServiceStatus
  ): boolean {
    const phaseStatuses = this.getPhaseStatuses(phaseId);
    const statusIndex = phaseStatuses.indexOf(currentStatus);

    // Se o status atual não está nesta fase, verifica se está numa fase posterior
    if (statusIndex === -1) {
      return this.isInLaterPhase(phaseId, currentStatus);
    }

    return false;
  }

  private isCurrentPhase(
    phaseId: number,
    currentStatus: ServiceStatus
  ): boolean {
    const phaseStatuses = this.getPhaseStatuses(phaseId);
    return phaseStatuses.includes(currentStatus);
  }

  private isInLaterPhase(
    phaseId: number,
    currentStatus: ServiceStatus
  ): boolean {
    for (let i = phaseId + 1; i <= 4; i++) {
      const laterPhaseStatuses = this.getPhaseStatuses(i);
      if (laterPhaseStatuses.includes(currentStatus)) {
        return true;
      }
    }
    return false;
  }

  private getPhaseStatuses(phaseId: number): ServiceStatus[] {
    switch (phaseId) {
      case 1:
        return [
          "Solicitado",
          "Atribuído",
        ];
      case 2:
        return [
          "Aguardando Confirmação",
          "Aceito",
          "Recusado",
          "Data Definida",
        ];
      case 3:
        return [
          "Em Progresso",
          "Aguardando Finalização",
        ];
      case 4:
        return [
          "Pagamento Feito",
          "Concluído",
          "Cancelado",
        ];
      default:
        return [];
    }
  }

  getPhaseIcon(icon: string): string {
    const icons: { [key: string]: string } = {
      "document-text": "📄",
      calendar: "📅",
      cog: "⚙️",
      "check-circle": "✅",
    };
    return icons[icon] || "📄";
  }

  getStatusColor(status: ServiceStatus): string {
    // Usa cor do utilitário centralizado
    return StatusUtilsService.getColor(status);
  }
}
