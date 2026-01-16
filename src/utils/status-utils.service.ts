import { ServiceStatus } from "@/src/models/maintenance.models";
import { I18nService } from "@/src/i18n.service";

/**
 * Utilitários para trabalhar com os novos status simplificados
 * Sistema sem papel de cliente - 9 status conforme maintenance.models.ts
 */
export class StatusUtilsService {
  static readonly colorMap: Record<ServiceStatus, string> = {
    // Novos status simplificados (9 status) - conforme ServiceStatus type
    "Solicitado": "#eab308",
    "Atribuído": "#14b8a6",
    "Aguardando Confirmação": "#f97316",
    "Aceito": "#22c55e",
    "Recusado": "#ef4444",
    "Data Definida": "#3b82f6",
    "Em Progresso": "#8b5cf6",
    "In Progress": "#8b5cf6",
    "Concluído": "#059669",
    "Finalizado": "#059669",
    "Cancelado": "#6b7280",
  };

  static readonly statusMap: Record<ServiceStatus, string> = {
    // Novos status simplificados (9 status) - conforme ServiceStatus type
    "Solicitado": "statusRequested",
    "Atribuído": "statusAssigned",
    "Aguardando Confirmação": "statusAwaitingConfirmation",
    "Aceito": "statusAccepted",
    "Recusado": "statusRejected",
    "Data Definida": "statusScheduled",
    "Em Progresso": "statusInProgress",
    "In Progress": "statusInProgress",
    "Concluído": "statusCompleted",
    "Finalizado": "statusFinalized",
    "Cancelado": "statusCancelled",
  };

  static getColor(status: ServiceStatus): string {
    return this.colorMap[status] || "#6b7280";
  }

  static getReadableTextColor(backgroundHex: string): string {
    const hex = String(backgroundHex ?? "").trim().replace("#", "");
    if (hex.length !== 6) {
      return "#ffffff";
    }

    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) {
      return "#ffffff";
    }

    // Relative luminance (sRGB)
    const toLinear = (v: number) => {
      const srgb = v / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    };
    const luminance =
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    // Threshold tuned for typical Tailwind palette (yellow needs dark text)
    return luminance > 0.55 ? "#111827" : "#ffffff";
  }

  static getLabel(status: ServiceStatus, i18n: I18nService): string {
    return i18n.translate(this.statusMap[status] || "statusPending");
  }
}
