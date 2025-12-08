import { ServiceStatus } from "@/src/models/maintenance.models";

/**
 * Mapeamento simplificado de status - Sistema sem papel de cliente
 * 11 status ao invés de 23 (status depreciados removidos)
 */
export const statusDisplayMap: Record<ServiceStatus, string> = {
  // Novos status simplificados (português) - conforme ServiceStatus type
  "Solicitado": "Solicitado",
  "Atribuído": "Atribuído",
  "Aguardando Confirmação": "Aguardando Confirmação",
  "Aceito": "Aceito",
  "Recusado": "Recusado",
  "Data Definida": "Data Definida",
  "Em Progresso": "Em Progresso",
  "In Progress": "Em Progresso",
  "Aguardando Finalização": "Aguardando Finalização",
  "Pagamento Feito": "Pagamento Feito",
  "Concluído": "Concluído",
  "Cancelado": "Cancelado",
};
