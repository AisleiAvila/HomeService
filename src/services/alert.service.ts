import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { AuthService } from "./auth.service";
import { ServiceRequest, ServiceStatus } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class AlertService {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

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
      .is("deleted_at", null)
      .not("status", "in", '("Concluído","Finalizado","Cancelado")');

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
      .is("deleted_at", null)
      .not("status", "in", '("Concluído","Finalizado","Cancelado")');

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

    // Sistema de orçamentos removido - sempre retorna 0
    stats.quote_responses_needed = 0;

    // Confirmações de profissional
    const { count: professionalConfirmations } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
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
      .is("deleted_at", null)
      .eq("status", "Aprovado")
      .lt("approval_at", paymentDeadline.toISOString());

    stats.payments_overdue = paymentsOverdue || 0;

    // Avaliações pendentes
    const { count: evaluationsPending } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "Pago")
      .eq("mutual_evaluation_completed", false);

    stats.evaluations_pending = evaluationsPending || 0;

    // Trabalhos em atraso
    const workDeadline = new Date();
    workDeadline.setHours(workDeadline.getHours() - this.DEADLINES.work_start);

    const { count: workOverdue } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "Data Definida")
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
      case "Aguardando Confirmação":
        stakeholders = ["admin"];
        break;
      case "Atribuído":
        stakeholders = ["professional"];
        break;
      case "Data Definida":
        stakeholders = ["professional"];
        break;
      case "Aceito":
        stakeholders = ["admin"];
        break;
      case "Concluído":
      case "Finalizado":
        stakeholders = ["admin", "professional"];
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
        ? "Ação Necessária"
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
      // Novos status (10 status simplificados)
      "Solicitado": 1,
      "Atribuído": 2,
      "Aguardando Confirmação": 2,
      "Aceito": 3,
      "Recusado": 1,
      "Data Definida": 3,
      "Em Progresso": 4,
      "In Progress": 4,
      "Concluído": 0,
      "Finalizado": 0,
      "Cancelado": 0,
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
      .is("deleted_at", null)
      .eq("id", requestId)
      .single();

    if (error) {
      console.error("Error fetching service request:", error);
      return null;
    }

    return data as ServiceRequest;
  }

  private async checkRequestOverdue(request: ServiceRequest): Promise<void> {
    const overdueCheck = this.getOverdueStatus(request);
    
    if (overdueCheck.isOverdue) {
      await this.markRequestOverdue(request.id);
      await this.notifyStakeholders(request.id, "overdue_alert", overdueCheck.message);
    }
  }

  private getOverdueStatus(request: ServiceRequest): { isOverdue: boolean; message: string } {
    const now = new Date();

    switch (request.status) {
      case "Aguardando Confirmação":
        return this.checkProfessionalResponseOverdue(request, now);
      case "Data Definida":
        return this.checkWorkStartOverdue(request, now);
      case "Aceito":
        return this.checkPaymentOverdue(request, now);
      case "Concluído":
      case "Finalizado":
        return this.checkEvaluationOverdue(request, now);
      default:
        return { isOverdue: false, message: "" };
    }
  }

  private checkQuoteResponseOverdue(request: ServiceRequest, now: Date): { isOverdue: boolean; message: string } {
    // Orçamento removido do fluxo. Função mantida para compatibilidade, mas não faz nada.
    return { isOverdue: false, message: "" };
  }

  private checkProfessionalResponseOverdue(request: ServiceRequest, now: Date): { isOverdue: boolean; message: string } {
    if (!request.updated_at) {
      return { isOverdue: false, message: "" };
    }

    const deadline = new Date(request.updated_at);
    deadline.setHours(deadline.getHours() + this.DEADLINES.professional_response);

    if (now > deadline) {
      return {
        isOverdue: true,
        message: "Confirmação do profissional está em atraso. Por favor, aceite ou rejeite o trabalho."
      };
    }

    return { isOverdue: false, message: "" };
  }

  private checkWorkStartOverdue(request: ServiceRequest, now: Date): { isOverdue: boolean; message: string } {
    if (!request.scheduled_start_datetime || request.actual_start_datetime) {
      return { isOverdue: false, message: "" };
    }

    const scheduledTime = new Date(request.scheduled_start_datetime);
    const deadline = new Date(scheduledTime);
    deadline.setHours(deadline.getHours() + this.DEADLINES.work_start);
    const serviceLabel = request.title ? ` **${request.title}**` : "";

    if (now > deadline) {
      return {
        isOverdue: true,
        message: `O início do serviço${serviceLabel} está em atraso. O profissional deveria ter iniciado o atendimento conforme o horário combinado.`
      };
    }

    return { isOverdue: false, message: "" };
  }

  private checkPaymentOverdue(request: ServiceRequest, now: Date): { isOverdue: boolean; message: string } {
    if (!request.approval_at) {
      return { isOverdue: false, message: "" };
    }

    const deadline = new Date(request.approval_at);
    deadline.setHours(deadline.getHours() + this.DEADLINES.payment);

    if (now > deadline) {
      return {
        isOverdue: true,
        message: "Pagamento está em atraso. Por favor, efetue o pagamento para finalizar o serviço."
      };
    }

    return { isOverdue: false, message: "" };
  }

  private checkEvaluationOverdue(request: ServiceRequest, now: Date): { isOverdue: boolean; message: string } {
    if (!request.payment_completed_at || request.mutual_evaluation_completed) {
      return { isOverdue: false, message: "" };
    }

    const deadline = new Date(request.payment_completed_at);
    deadline.setHours(deadline.getHours() + this.DEADLINES.evaluation);

    if (now > deadline) {
      return {
        isOverdue: true,
        message: "Avaliações estão em atraso. Por favor, avaliem o serviço prestado."
      };
    }

    return { isOverdue: false, message: "" };
  }

  private async checkRequestDeadlines(request: ServiceRequest): Promise<void> {
    const warning = this.getDeadlineWarning(request);
    
    if (warning && !this.wasAlertSent(request, "deadline_warning")) {
      await this.notifyStakeholders(request.id, "deadline_warning", warning);
    }
  }

  private getDeadlineWarning(request: ServiceRequest): string | null {
    const now = new Date();
    const warningHours = 24;

    switch (request.status) {
      case "Aguardando Confirmação":
        return this.checkQuoteResponseDeadline(request, now, warningHours);
      case "Data Definida":
        return this.checkScheduledStartDeadline(request, now, warningHours);
      case "Aceito":
        return this.checkPaymentDeadline(request, now, warningHours);
      default:
        return null;
    }
  }

  private checkQuoteResponseDeadline(request: ServiceRequest, now: Date, warningHours: number): string | null {
    // Orçamento removido do fluxo. Função mantida para compatibilidade, mas não faz nada.
    return null;
  }

  private checkScheduledStartDeadline(request: ServiceRequest, now: Date, warningHours: number): string | null {
    if (!request.scheduled_start_datetime) return null;

    const scheduledTime = new Date(request.scheduled_start_datetime);
    
    if (this.isWithinWarningPeriod(now, scheduledTime, warningHours)) {
      return `Lembrete: Seu serviço está agendado para ${scheduledTime.toLocaleString("pt-PT")}.`;
    }
    
    return null;
  }

  private checkPaymentDeadline(request: ServiceRequest, now: Date, warningHours: number): string | null {
    if (!request.approval_at) return null;

    const deadline = new Date(request.approval_at);
    deadline.setHours(deadline.getHours() + this.DEADLINES.payment);
    
    if (this.isWithinWarningPeriod(now, deadline, warningHours)) {
      return `Lembrete: Você tem até ${deadline.toLocaleString("pt-PT")} para efetuar o pagamento.`;
    }
    
    return null;
  }

  private isWithinWarningPeriod(now: Date, deadline: Date, warningHours: number): boolean {
    const warningTime = new Date(deadline);
    warningTime.setHours(warningTime.getHours() - warningHours);
    return now > warningTime && now < deadline;
  }

  private async getOverdueRequests(): Promise<ServiceRequest[]> {
    const { data, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .is("deleted_at", null)
      .eq("overdue", true)
      .not("status", "in", '("Concluído","Finalizado","Cancelado")')
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
      .is("deleted_at", null)
      .not("status", "in", '("Concluído","Finalizado","Cancelado")')
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
      const warning = this.getDeadlineWarning(request);
      if (warning) {
        nearDeadline.push(request);
      }
    }

    return nearDeadline;
  }

  private async markRequestOverdue(requestId: number): Promise<void> {
    const { error } = await this.supabase.client
      .from("service_requests")
      .update({ overdue: true })
      .is("deleted_at", null)
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
        .is("deleted_at", null)
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
    // Verificar a cada 10 minutos
    setInterval(() => {
      this.checkOverdueRequests();
      this.sendDeadlineWarnings();
    }, 10 * 60 * 1000); // 10 minutos

    // Executar imediatamente
    setTimeout(() => {
      this.checkOverdueRequests();
      this.sendDeadlineWarnings();
    }, 5000); // 5 segundos após inicialização
  }
}
