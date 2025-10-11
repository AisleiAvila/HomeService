import { ServiceStatus } from "@/src/models/maintenance.models";
import { I18nService } from "@/src/i18n.service";

export class StatusUtilsService {
  static colorMap: Record<ServiceStatus, string> = {
    // Português
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
    // Inglês
    Requested: "#eab308",
    InAnalysis: "#06b6d4",
    AwaitingClarifications: "#f59e0b",
    QuoteSent: "#0ea5e9",
    AwaitingQuoteApproval: "#6366f1",
    QuoteApproved: "#22c55e",
    QuoteRejected: "#ef4444",
    AwaitingExecutionDate: "#fbbf24",
    DateProposedByAdmin: "#3b82f6",
    AwaitingDateApproval: "#6366f1",
    DateApprovedByClient: "#22c55e",
    DateRejectedByClient: "#ef4444",
    SearchingProfessional: "#a855f7",
    ProfessionalSelected: "#14b8a6",
    AwaitingProfessionalConfirmation: "#f97316",
    Assigned: "#3b82f6",
    Pending: "#eab308",
    Scheduled: "#3b82f6",
    InProgress: "#8b5cf6",
    CompletedAwaitingApproval: "#84cc16",
    Completed: "#059669",
    Cancelled: "#6b7280",
    Paid: "#10b981",
  };

  static statusMap: Record<ServiceStatus, string> = {
    // Português
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
    // Inglês
    Requested: "statusPending",
    InAnalysis: "statusAnalyzing",
    AwaitingClarifications: "statusAwaitingClarification",
    QuoteSent: "statusQuoted",
    AwaitingQuoteApproval: "statusAwaitingQuoteApproval",
    QuoteApproved: "statusApproved",
    QuoteRejected: "statusQuoteRejected",
    AwaitingExecutionDate: "statusAwaitingExecutionDate",
    DateProposedByAdmin: "statusDateProposedByAdmin",
    AwaitingDateApproval: "statusAwaitingDateApproval",
    DateApprovedByClient: "statusDateApprovedByClient",
    DateRejectedByClient: "statusDateRejectedByClient",
    SearchingProfessional: "statusSearchingProfessional",
    ProfessionalSelected: "statusProfessionalSelected",
    AwaitingProfessionalConfirmation: "statusAwaitingProfessionalConfirmation",
    Assigned: "statusScheduled",
    Pending: "statusPending",
    Scheduled: "statusScheduled",
    InProgress: "statusInProgress",
    CompletedAwaitingApproval: "statusCompletedAwaitingApproval",
    Completed: "statusCompleted",
    Cancelled: "statusCancelled",
    Paid: "statusPaid",
  };

  static getColor(status: ServiceStatus): string {
    return this.colorMap[status] || "#6b7280";
  }

  static getLabel(status: ServiceStatus, i18n: I18nService): string {
    return i18n.translate(this.statusMap[status] || "statusPending");
  }
}
