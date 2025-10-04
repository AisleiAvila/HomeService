import { ServiceStatus } from "@/src/models/maintenance.models";
import { I18nService } from "@/src/i18n.service";

export class StatusUtilsService {
  static colorMap: Record<ServiceStatus, string> = {
    Solicitado: "#eab308",
    "Em análise": "#06b6d4",
    "Aguardando esclarecimentos": "#f59e0b",
    "Orçamento enviado": "#0ea5e9",
    "Aguardando aprovação do orçamento": "#6366f1",
    "Orçamento aprovado": "#22c55e",
    "Orçamento rejeitado": "#ef4444",
    "Aguardando data de execução": "#fbbf24",
    "Data proposta pelo administrador": "#3b82f6",
    "Aguardando aprovação da data": "#6366f1",
    "Data aprovada pelo cliente": "#22c55e",
    "Data rejeitada pelo cliente": "#ef4444",
    "Buscando profissional": "#a855f7",
    "Profissional selecionado": "#14b8a6",
    "Aguardando confirmação do profissional": "#f97316",
    Agendado: "#3b82f6",
    "Em execução": "#8b5cf6",
    "Concluído - Aguardando aprovação": "#84cc16",
    "Aprovado pelo cliente": "#22c55e",
    "Rejeitado pelo cliente": "#ef4444",
    Pago: "#10b981",
    Finalizado: "#059669",
    Cancelado: "#6b7280",
  };

  static statusMap: Record<ServiceStatus, string> = {
    Solicitado: "statusPending",
    "Em análise": "statusAnalyzing",
    "Aguardando esclarecimentos": "statusAwaitingClarification",
    "Orçamento enviado": "statusQuoted",
    "Aguardando aprovação do orçamento": "statusAwaitingQuoteApproval",
    "Orçamento aprovado": "statusApproved",
    "Orçamento rejeitado": "statusQuoteRejected",
    "Aguardando data de execução": "statusAwaitingExecutionDate",
    "Data proposta pelo administrador": "statusDateProposedByAdmin",
    "Aguardando aprovação da data": "statusAwaitingDateApproval",
    "Data aprovada pelo cliente": "statusDateApprovedByClient",
    "Data rejeitada pelo cliente": "statusDateRejectedByClient",
    "Buscando profissional": "statusSearchingProfessional",
    "Profissional selecionado": "statusProfessionalSelected",
    "Aguardando confirmação do profissional":
      "statusAwaitingProfessionalConfirmation",
    Agendado: "statusScheduled",
    "Em execução": "statusInProgress",
    "Concluído - Aguardando aprovação": "statusCompletedAwaitingApproval",
    "Aprovado pelo cliente": "statusApprovedByClient",
    "Rejeitado pelo cliente": "statusRejectedByClient",
    Pago: "statusPaid",
    Finalizado: "statusCompleted",
    Cancelado: "statusCancelled",
  };

  static getColor(status: ServiceStatus): string {
    return this.colorMap[status] || "#6b7280";
  }

  static getLabel(status: ServiceStatus, i18n: I18nService): string {
    return i18n.translate(this.statusMap[status] || "statusPending");
  }
}
