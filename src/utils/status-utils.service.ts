import { ServiceStatus } from "@/src/models/maintenance.models";
import { I18nService } from "@/src/i18n.service";

/**
 * Utilitários para trabalhar com os novos status simplificados
 * Sistema sem papel de cliente - 11 status conforme maintenance.models.ts
 */
export class StatusUtilsService {
  static readonly colorMap: Record<ServiceStatus, string> = {
    // Novos status simplificados (11 status) - conforme ServiceStatus type
    "Solicitado": "#eab308",
    "Atribuído": "#14b8a6",
    "Aguardando Confirmação": "#f97316",
    "Aceito": "#22c55e",
    "Recusado": "#ef4444",
    "Data Definida": "#3b82f6",
    "Em Progresso": "#8b5cf6",
    "In Progress": "#8b5cf6",
    "Aguardando Finalização": "#84cc16",
    "Pagamento Feito": "#10b981",
    "Concluído": "#059669",
    "Cancelado": "#6b7280",
  };

  static readonly statusMap: Record<ServiceStatus, string> = {
    // Novos status simplificados (11 status) - conforme ServiceStatus type
    "Solicitado": "statusRequested",
    "Atribuído": "statusAssigned",
    "Aguardando Confirmação": "statusAwaitingConfirmation",
    "Aceito": "statusAccepted",
    "Recusado": "statusRejected",
    "Data Definida": "statusScheduled",
    "Em Progresso": "statusInProgress",
    "In Progress": "statusInProgress",
    "Aguardando Finalização": "statusAwaitingFinalization",
    "Pagamento Feito": "statusPaid",
    "Concluído": "statusCompleted",
    "Cancelado": "statusCancelled",
  };

  static getColor(status: ServiceStatus): string {
    return this.colorMap[status] || "#6b7280";
  }

  static getLabel(status: ServiceStatus, i18n: I18nService): string {
    return i18n.translate(this.statusMap[status] || "statusPending");
  }
}
