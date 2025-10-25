import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { AuthService } from "./auth.service";
import { ServiceRequest, ServiceStatus } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class AlertService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  // Configurações de prazos (em horas)
  private readonly DEADLINES = {
    quote_response: 72, // 3 dias para responder orçamento
    professional_response: 48, // 2 dias para profissional aceitar
    payment: 168, // 7 dias para pagamento
    work_start: 24, // 1 dia de tolerância para início do trabalho
    evaluation: 168, // 7 dias para avaliação
  };

  constructor() {
    // Executar verificações periódicas
    this.schedulePeriodicChecks();
  }

  /**
   * Verificar todos os pedidos em atraso
   */
  async checkOverdueRequests(): Promise<void> {
    const { data: requests, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .not("status", "in", '("Finalizado","Cancelado")');

    if (error) {
      console.error("Error fetching requests for overdue check:", error);
      return;
    }

    for (const request of requests) {
      await this.checkRequestOverdue(request as ServiceRequest);
    }
  }

  /**
   * Enviar alertas de prazo
   */
  async sendDeadlineWarnings(): Promise<void> {
    const { data: requests, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .not("status", "in", '("Finalizado","Cancelado")');

    if (error) {
      console.error("Error fetching requests for deadline warnings:", error);
      return;
    }

    for (const request of requests) {
      await this.checkRequestDeadlines(request as ServiceRequest);
    }
  }

  /**
   * Verificar ações pendentes
   */
  async checkPendingActions(): Promise<{
    quote_responses_needed: number;
    professional_confirmations_needed: number;
    payments_overdue: number;
    evaluations_pending: number;
    work_overdue: number;
  }> {
    const stats = {
      quote_responses_needed: 0,
      professional_confirmations_needed: 0,
      payments_overdue: 0,
      evaluations_pending: 0,
      work_overdue: 0,
    };

    // Orçamentos aguardando resposta
    const { count: quoteResponses } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Aguardando aprovação do orçamento");

    stats.quote_responses_needed = quoteResponses || 0;

    // Confirmações de profissional
    const { count: professionalConfirmations } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Profissional selecionado");

    stats.professional_confirmations_needed = professionalConfirmations || 0;

    // Pagamentos em atraso
    const paymentDeadline = new Date();
    paymentDeadline.setHours(
      paymentDeadline.getHours() - this.DEADLINES.payment
    );

    const { count: paymentsOverdue } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Aprovado pelo cliente")
      .lt("client_approval_at", paymentDeadline.toISOString());

    stats.payments_overdue = paymentsOverdue || 0;

    // Avaliações pendentes
    const { count: evaluationsPending } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pago")
      .eq("mutual_evaluation_completed", false);

    stats.evaluations_pending = evaluationsPending || 0;

    // Trabalhos em atraso
    const workDeadline = new Date();
    workDeadline.setHours(workDeadline.getHours() - this.DEADLINES.work_start);

    const { count: workOverdue } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Agendado")
      .lt("scheduled_start_datetime", workDeadline.toISOString())
      .is("actual_start_datetime", null);

    stats.work_overdue = workOverdue || 0;

    return stats;
  }

  /**
   * Notificar stakeholders sobre ação necessária
   */
  async notifyStakeholders(
    requestId: number,
    type: "deadline_warning" | "overdue_alert",
    message: string
  ): Promise<void> {
    const request = await this.getServiceRequest(requestId);
    if (!request) return;

    let stakeholders: ("client" | "professional" | "admin")[] = [];
    let priority: "low" | "medium" | "high" = "medium";

    // Determinar stakeholders baseado no status
    switch (request.status) {
      case "Aguardando aprovação do orçamento":
        stakeholders = ["client"];
        break;
      case "Profissional selecionado":
        stakeholders = ["professional"];
        break;
      case "Agendado":
        stakeholders = ["professional"];
        break;
      case "Aprovado pelo cliente":
        stakeholders = ["client"];
        break;
      case "Pago":
        stakeholders = ["client", "professional"];
        break;
      default:
        stakeholders = ["admin"];
    }

    if (type === "overdue_alert") {
      priority = "high";
      stakeholders.push("admin"); // Admin sempre recebe alertas de atraso
    }

    await this.notificationService.notifyServiceRequestStakeholders(
      requestId,
      type,
      type === "overdue_alert"
        ? "Ação Urgente Necessária"
        : "Prazo se Aproximando",
      message,
      stakeholders,
      {
        actionRequired: type === "overdue_alert",
        priority,
      }
    );

    // Marcar alerta como enviado
    await this.markAlertSent(requestId, type);
  }

  /**
   * Obter relatório de alertas
   */
  async getAlertReport(): Promise<{
    overdue_requests: ServiceRequest[];
    deadline_warnings: ServiceRequest[];
    pending_actions: any;
    summary: {
      total_overdue: number;
      total_warnings: number;
      most_critical_status: ServiceStatus | null;
    };
  }> {
    const [overdueRequests, warningRequests, pendingActions] =
      await Promise.all([
        this.getOverdueRequests(),
        this.getRequestsNearDeadline(),
        this.checkPendingActions(),
      ]);

    // Determinar status mais crítico
    let mostCriticalStatus: ServiceStatus | null = null;
    const statusPriority: Record<ServiceStatus, number> = {
      // Status em português
      "Aguardando aprovação do orçamento": 3,
      "Profissional selecionado": 2,
      Agendado: 4,
      "Aprovado pelo cliente": 5,
      "Em execução": 1,
      Pago: 1,
      Solicitado: 1,
      "Em análise": 1,
      "Aguardando esclarecimentos": 1,
      "Orçamento enviado": 1,
      "Orçamento aprovado": 1,
      "Orçamento rejeitado": 1,
      "Aguardando data de execução": 2,
      "Data proposta pelo administrador": 3,
      "Aguardando aprovação da data": 3,
      "Data aprovada pelo cliente": 2,
      "Data rejeitada pelo cliente": 2,
      "Buscando profissional": 1,
      "Aguardando confirmação do profissional": 2,
      "Concluído - Aguardando aprovação": 1,
      "Rejeitado pelo cliente": 1,
      Finalizado: 0,
      Cancelado: 0,
      // Status em inglês (prioridade 0)
      Requested: 0,
      InAnalysis: 0,
      AwaitingClarifications: 0,
      QuoteSent: 0,
      AwaitingQuoteApproval: 0,
      QuoteApproved: 0,
      QuoteRejected: 0,
      AwaitingExecutionDate: 0,
      DateProposedByAdmin: 0,
      AwaitingDateApproval: 0,
      DateApprovedByClient: 0,
      DateRejectedByClient: 0,
      SearchingProfessional: 0,
      ProfessionalSelected: 0,
      AwaitingProfessionalConfirmation: 0,
      Scheduled: 0,
      InProgress: 0,
      CompletedAwaitingApproval: 0,
      Completed: 0,
      Cancelled: 0,
      Paid: 0,
    };

    let highestPriority = 0;
    for (const request of [...overdueRequests, ...warningRequests]) {
      const priority = statusPriority[request.status] || 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        mostCriticalStatus = request.status;
      }
    }

    return {
      overdue_requests: overdueRequests,
      deadline_warnings: warningRequests,
      pending_actions: pendingActions,
      summary: {
        total_overdue: overdueRequests.length,
        total_warnings: warningRequests.length,
        most_critical_status: mostCriticalStatus,
      },
    };
  }

  /**
   * Métodos privados
   */
  private async getServiceRequest(
    requestId: number
  ): Promise<ServiceRequest | null> {
    const { data, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (error) {
      console.error("Error fetching service request:", error);
      return null;
    }

    return data as ServiceRequest;
  }

  private async checkRequestOverdue(request: ServiceRequest): Promise<void> {
    const now = new Date();
    let isOverdue = false;
    let message = "";

    switch (request.status) {
      case "Aguardando aprovação do orçamento":
        if (request.quote_sent_at) {
          const deadline = new Date(request.quote_sent_at);
          deadline.setHours(
            deadline.getHours() + this.DEADLINES.quote_response
          );
          if (now > deadline) {
            isOverdue = true;
            message =
              "Resposta ao orçamento está em atraso. Por favor, aprove ou rejeite o orçamento.";
          }
        }
        break;

      case "Profissional selecionado":
        if (request.updated_at) {
          const deadline = new Date(request.updated_at);
          deadline.setHours(
            deadline.getHours() + this.DEADLINES.professional_response
          );
          if (now > deadline) {
            isOverdue = true;
            message =
              "Confirmação do profissional está em atraso. Por favor, aceite ou rejeite o trabalho.";
          }
        }
        break;

      case "Agendado":
        if (
          request.scheduled_start_datetime &&
          !request.actual_start_datetime
        ) {
          const scheduledTime = new Date(request.scheduled_start_datetime);
          const deadline = new Date(scheduledTime);
          deadline.setHours(deadline.getHours() + this.DEADLINES.work_start);
          if (now > deadline) {
            isOverdue = true;
            message =
              "Início do trabalho está em atraso. O profissional deveria ter iniciado o serviço.";
          }
        }
        break;

      case "Aprovado pelo cliente":
        if (request.client_approval_at) {
          const deadline = new Date(request.client_approval_at);
          deadline.setHours(deadline.getHours() + this.DEADLINES.payment);
          if (now > deadline) {
            isOverdue = true;
            message =
              "Pagamento está em atraso. Por favor, efetue o pagamento para finalizar o serviço.";
          }
        }
        break;

      case "Pago":
        if (
          request.payment_completed_at &&
          !request.mutual_evaluation_completed
        ) {
          const deadline = new Date(request.payment_completed_at);
          deadline.setHours(deadline.getHours() + this.DEADLINES.evaluation);
          if (now > deadline) {
            isOverdue = true;
            message =
              "Avaliações estão em atraso. Por favor, avaliem o serviço prestado.";
          }
        }
        break;
    }

    if (isOverdue) {
      // Marcar como em atraso no banco
      await this.markRequestOverdue(request.id);

      // Enviar notificação
      await this.notifyStakeholders(request.id, "overdue_alert", message);
    }
  }

  private async checkRequestDeadlines(request: ServiceRequest): Promise<void> {
    const now = new Date();
    let warningNeeded = false;
    let message = "";
    const warningHours = 24; // Avisar 24h antes do deadline

    switch (request.status) {
      case "Aguardando aprovação do orçamento":
        if (request.quote_sent_at) {
          const deadline = new Date(request.quote_sent_at);
          deadline.setHours(
            deadline.getHours() + this.DEADLINES.quote_response
          );
          const warningTime = new Date(deadline);
          warningTime.setHours(warningTime.getHours() - warningHours);

          if (now > warningTime && now < deadline) {
            warningNeeded = true;
            message = `Lembrete: Você tem até ${deadline.toLocaleString(
              "pt-PT"
            )} para responder ao orçamento.`;
          }
        }
        break;

      case "Agendado":
        if (request.scheduled_start_datetime) {
          const scheduledTime = new Date(request.scheduled_start_datetime);
          const warningTime = new Date(scheduledTime);
          warningTime.setHours(warningTime.getHours() - warningHours);

          if (now > warningTime && now < scheduledTime) {
            warningNeeded = true;
            message = `Lembrete: Seu serviço está agendado para ${scheduledTime.toLocaleString(
              "pt-PT"
            )}.`;
          }
        }
        break;

      case "Aprovado pelo cliente":
        if (request.client_approval_at) {
          const deadline = new Date(request.client_approval_at);
          deadline.setHours(deadline.getHours() + this.DEADLINES.payment);
          const warningTime = new Date(deadline);
          warningTime.setHours(warningTime.getHours() - warningHours);

          if (now > warningTime && now < deadline) {
            warningNeeded = true;
            message = `Lembrete: Você tem até ${deadline.toLocaleString(
              "pt-PT"
            )} para efetuar o pagamento.`;
          }
        }
        break;
    }

    if (warningNeeded && !this.wasAlertSent(request, "deadline_warning")) {
      await this.notifyStakeholders(request.id, "deadline_warning", message);
    }
  }

  private async getOverdueRequests(): Promise<ServiceRequest[]> {
    const { data, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .eq("overdue", true)
      .not("status", "in", '("Finalizado","Cancelado")')
      .order("updated_at", { ascending: true });

    if (error) {
      console.error("Error fetching overdue requests:", error);
      return [];
    }

    return data as ServiceRequest[];
  }

  private async getRequestsNearDeadline(): Promise<ServiceRequest[]> {
    // Implementação simplificada - em produção, usar query mais complexa
    const { data, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .not("status", "in", '("Finalizado","Cancelado")')
      .order("updated_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Error fetching requests near deadline:", error);
      return [];
    }

    // Filtrar aqueles próximos do deadline
    const requests = data as ServiceRequest[];
    const nearDeadline: ServiceRequest[] = [];

    for (const request of requests) {
      // Lógica similar à checkRequestDeadlines mas sem enviar notificação
      // ... implementação detalhada
    }

    return nearDeadline;
  }

  private async markRequestOverdue(requestId: number): Promise<void> {
    const { error } = await this.supabase.client
      .from("service_requests")
      .update({ overdue: true })
      .eq("id", requestId);

    if (error) {
      console.error("Error marking request as overdue:", error);
    }
  }

  private async markAlertSent(
    requestId: number,
    alertType: string
  ): Promise<void> {
    // Buscar alertas atuais
    const request = await this.getServiceRequest(requestId);
    if (!request) return;

    const currentAlerts = request.deadline_alerts_sent || [];
    const alertKey = `${alertType}_${new Date().toISOString().split("T")[0]}`;

    if (!currentAlerts.includes(alertKey)) {
      const updatedAlerts = [...currentAlerts, alertKey];

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({ deadline_alerts_sent: updatedAlerts })
        .eq("id", requestId);

      if (error) {
        console.error("Error marking alert as sent:", error);
      }
    }
  }

  private wasAlertSent(request: ServiceRequest, alertType: string): boolean {
    const alerts = request.deadline_alerts_sent || [];
    const today = new Date().toISOString().split("T")[0];
    const alertKey = `${alertType}_${today}`;

    return alerts.includes(alertKey);
  }

  private schedulePeriodicChecks(): void {
    // Verificar a cada hora
    setInterval(() => {
      this.checkOverdueRequests();
      this.sendDeadlineWarnings();
    }, 60 * 60 * 1000); // 1 hora

    // Executar imediatamente
    setTimeout(() => {
      this.checkOverdueRequests();
      this.sendDeadlineWarnings();
    }, 5000); // 5 segundos após inicialização
  }
}
