import { StatusService } from "@/src/services/status.service";
import { ServiceStatus } from "@/src/models/maintenance.models";

export const statusServiceToServiceStatus: Record<StatusService, ServiceStatus> =
  {
  [StatusService.Requested]: "Solicitado",
  [StatusService.InAnalysis]: "Em análise",
  [StatusService.AwaitingClarifications]: "Aguardando esclarecimentos",
  [StatusService.QuoteSent]: "Orçamento enviado",
  [StatusService.AwaitingQuoteApproval]: "Aguardando aprovação do orçamento",
  [StatusService.QuoteApproved]: "Orçamento aprovado",
  [StatusService.QuoteRejected]: "Orçamento rejeitado",
  [StatusService.AwaitingExecutionDate]: "Aguardando data de execução",
  [StatusService.DateProposedByAdmin]: "Data proposta pelo administrador",
  [StatusService.AwaitingDateApproval]: "Aguardando aprovação da data",
  [StatusService.DateApprovedByClient]: "Data aprovada",
  [StatusService.DateRejectedByClient]: "Data rejeitada",
  [StatusService.SearchingProfessional]: "Buscando profissional",
  [StatusService.ProfessionalSelected]: "Profissional selecionado",
  [StatusService.AwaitingProfessionalConfirmation]:
    "Aguardando confirmação do profissional",
  [StatusService.Scheduled]: "Agendado",
  [StatusService.InProgress]: "Em execução",
  [StatusService.CompletedAwaitingApproval]: "Concluído - Aguardando aprovação",
  [StatusService.Completed]: "Finalizado",
  [StatusService.Cancelled]: "Cancelado",
};
