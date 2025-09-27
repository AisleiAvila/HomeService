import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { I18nService } from "../i18n.service";
import {
  ClientApproval,
  ProfessionalResponse,
  ServiceRequest,
  ServiceStatus,
} from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class WorkflowService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private i18n = inject(I18nService);

  /**
   * FASE 1: SOLICITAÇÃO E ORÇAMENTO
   */

  // Admin analisa uma solicitação (move de "Solicitado" para "Em análise")
  async analyzeRequest(requestId: number, notes?: string): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      status: "Em análise",
      admin_requests: notes,
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      notes || "Solicitação em análise"
    );

    // Notificar cliente sobre o início da análise
    await this.notifyStakeholders(requestId, "analysis_started", "Cliente");
  }

  // Cliente solicita esclarecimentos ou admin solicita mais informações
  async requestClarification(
    requestId: number,
    questions: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      admin_requests: questions,
      status: "Aguardando esclarecimentos",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Solicitação de esclarecimentos"
    );

    // Notificar cliente
    await this.notifyStakeholders(
      requestId,
      "clarification_requested",
      "Cliente"
    );
  }

  // Cliente fornece esclarecimentos
  async provideClarification(
    requestId: number,
    answers: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      client_clarifications: answers,
      status: "Em análise",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Esclarecimentos fornecidos"
    );

    // Notificar admin
    await this.notifyStakeholders(requestId, "clarification_provided", "Admin");
  }

  // Admin envia orçamento
  async sendQuote(
    requestId: number,
    amount: number,
    description: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      quote_amount: amount,
      quote_description: description,
      quote_sent_at: new Date().toISOString(),
      status: "Orçamento enviado",
      cost: amount, // Manter compatibilidade
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      `Orçamento enviado: €${amount}`
    );

    // Notificar cliente
    await this.notifyStakeholders(requestId, "quote_sent", "Cliente");
  }

  // Cliente aprova orçamento
  async approveQuote(requestId: number): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      quote_approved_at: new Date().toISOString(),
      status: "Orçamento aprovado",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Orçamento aprovado pelo cliente"
    );

    // Notificar admin
    await this.notifyStakeholders(requestId, "quote_approved", "Admin");
  }

  // Cliente rejeita orçamento
  async rejectQuote(requestId: number, reason?: string): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      status: "Orçamento rejeitado",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      `Orçamento rejeitado: ${reason || "Sem motivo especificado"}`
    );

    // Notificar admin
    await this.notifyStakeholders(requestId, "quote_rejected", "Admin");
  }

  /**
   * FASE 2: SELEÇÃO E AGENDAMENTO
   */

  // Admin seleciona profissional
  async selectProfessional(
    requestId: number,
    professionalId: number
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      selected_professional_id: professionalId,
      professional_id: professionalId, // Manter compatibilidade
      status: "Profissional selecionado",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Profissional selecionado"
    );

    // Notificar profissional
    await this.notifySpecificUser(
      requestId,
      professionalId,
      "professional_assigned",
      "Novo trabalho atribuído"
    );
  }

  // Profissional aceita trabalho
  async professionalAcceptJob(requestId: number): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      professional_response: "accepted" as ProfessionalResponse,
      professional_response_at: new Date().toISOString(),
      status: "Aguardando confirmação do profissional",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Trabalho aceito pelo profissional"
    );

    // Notificar admin
    await this.notifyStakeholders(requestId, "professional_accepted", "Admin");
  }

  // Profissional rejeita trabalho
  async professionalRejectJob(
    requestId: number,
    reason?: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      professional_response: "rejected" as ProfessionalResponse,
      professional_response_at: new Date().toISOString(),
      selected_professional_id: null,
      professional_id: null, // Manter compatibilidade
      status: "Buscando profissional",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      `Trabalho rejeitado: ${reason || "Sem motivo especificado"}`
    );

    // Notificar admin
    await this.notifyStakeholders(requestId, "professional_rejected", "Admin");
  }

  // Admin agenda trabalho
  async scheduleWork(
    requestId: number,
    dateTime: Date,
    estimatedDuration?: number
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      scheduled_start_datetime: dateTime.toISOString(),
      scheduled_date: dateTime.toISOString(), // Manter compatibilidade
      estimated_duration_minutes: estimatedDuration,
      status: "Agendado",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      `Trabalho agendado para ${dateTime.toLocaleString()}`
    );

    // Notificar cliente e profissional
    await this.notifyStakeholders(
      requestId,
      "work_scheduled",
      "Cliente,Profissional"
    );
  }

  /**
   * FASE 3: EXECUÇÃO
   */

  // Profissional inicia trabalho
  async startWork(requestId: number): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    // Buscar pedido atual para validação da data agendada
    const request = await this.getServiceRequest(requestId);
    if (!request) throw new Error("Service request not found");

    const now = new Date();
    const scheduledDate = request.scheduled_date
      ? new Date(request.scheduled_date)
      : null;
    if (scheduledDate && now < scheduledDate) {
      // Notificar usuário e impedir início
      this.notificationService.addNotification(
        "Não é permitido iniciar o serviço antes da data agendada!"
      );
      throw new Error("Tentativa de início antes da data agendada");
    }

    const updates: Partial<ServiceRequest> = {
      work_started_at: now.toISOString(),
      actual_start_datetime: now.toISOString(), // Manter compatibilidade
      status: "Em execução",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Trabalho iniciado"
    );

    // Notificar cliente e admin
    await this.notifyStakeholders(requestId, "work_started", "Cliente,Admin");
  }

  // Profissional finaliza trabalho
  async completeWork(requestId: number, notes?: string): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      work_completed_at: new Date().toISOString(),
      actual_end_datetime: new Date().toISOString(), // Manter compatibilidade
      status: "Concluído - Aguardando aprovação",
    };

    if (notes) {
      // Adicionar nota às atualizações de progresso
      const currentUpdates = await this.getProgressUpdates(requestId);
      updates.progress_updates = [
        ...(currentUpdates || []),
        `Trabalho concluído: ${notes}`,
      ];
    }

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Trabalho concluído"
    );

    // Notificar cliente
    await this.notifyStakeholders(requestId, "work_completed", "Cliente");
  }

  // Adicionar atualização de progresso
  async addProgressUpdate(requestId: number, update: string): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const currentUpdates = await this.getProgressUpdates(requestId);
    const timestamp = new Date().toLocaleString();
    const newUpdate = `[${timestamp}] ${update}`;

    const updates: Partial<ServiceRequest> = {
      progress_updates: [...(currentUpdates || []), newUpdate],
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Atualização de progresso"
    );
  }

  /**
   * FASE 4: APROVAÇÃO E PAGAMENTO
   */

  // Cliente aprova trabalho
  async approveWork(requestId: number, feedback?: string): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      client_approval: "approved" as ClientApproval,
      client_approval_at: new Date().toISOString(),
      client_feedback: feedback,
      status: "Aprovado pelo cliente",
      payment_due_date: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(), // 7 dias para pagamento
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Trabalho aprovado pelo cliente"
    );

    // Notificar admin e profissional
    await this.notifyStakeholders(
      requestId,
      "payment_due",
      "Admin,Profissional"
    );
  }

  // Cliente rejeita trabalho
  async rejectWork(requestId: number, reason: string): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      client_approval: "rejected" as ClientApproval,
      client_approval_at: new Date().toISOString(),
      revision_requested: true,
      revision_reason: reason,
      status: "Rejeitado pelo cliente",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      `Trabalho rejeitado: ${reason}`
    );

    // Notificar admin e profissional
    await this.notifyStakeholders(
      requestId,
      "work_completed",
      "Admin,Profissional"
    );
  }

  // Processar pagamento
  async processPayment(
    requestId: number,
    paymentMethod?: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    // Buscar dados do pedido para calcular taxas
    const request = await this.getServiceRequest(requestId);
    if (!request || !request.quote_amount) {
      throw new Error("Request or quote amount not found");
    }

    const platformFee = this.calculatePlatformFee(request.quote_amount);
    const professionalPayment = request.quote_amount - platformFee;

    const updates: Partial<ServiceRequest> = {
      payment_completed_at: new Date().toISOString(),
      platform_fee: platformFee,
      professional_payment: professionalPayment,
      payment_status: "Paid",
      status: "Pago",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      `Pagamento processado: €${request.quote_amount}`
    );

    // Notificar profissional
    await this.notifyStakeholders(
      requestId,
      "payment_completed",
      "Profissional"
    );
  }

  // Finalizar processo com avaliações
  async finalizeWithEvaluations(
    requestId: number,
    clientRating: number,
    professionalRating: number
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) throw new Error("User not authenticated");

    const updates: Partial<ServiceRequest> = {
      client_rating: clientRating,
      professional_rating: professionalRating,
      mutual_evaluation_completed: true,
      status: "Finalizado",
    };

    await this.updateRequestWithHistory(
      requestId,
      updates,
      currentUser.id,
      "Processo finalizado com avaliações"
    );
  }

  /**
   * MÉTODOS AUXILIARES
   */

  // Atualizar pedido com histórico
  private async updateRequestWithHistory(
    requestId: number,
    updates: Partial<ServiceRequest>,
    changedBy: number,
    notes?: string
  ): Promise<void> {
    // Buscar histórico atual
    const currentRequest = await this.getServiceRequest(requestId);
    const currentHistory = currentRequest?.status_history || [];

    // Adicionar nova entrada ao histórico se o status mudou
    if (updates.status && updates.status !== currentRequest?.status) {
      const historyEntry = {
        status: updates.status,
        changed_at: new Date().toISOString(),
        changed_by: changedBy,
        notes: notes,
      };
      updates.status_history = [...currentHistory, historyEntry];
    }

    // Log do id e tipo antes do update
    console.log(
      "[WorkflowService] updateRequestWithHistory - requestId:",
      requestId,
      "tipo:",
      typeof requestId
    );
    // Atualizar no banco
    const { data, error } = await this.supabase.client
      .from("service_requests")
      .update(updates)
      .eq("id", requestId)
      .select("*");

    if (error) {
      console.error("Error updating service request:", error);
      throw error;
    }
    console.log("[WorkflowService] Update result:", data);
    this.notificationService.addNotification(
      `Pedido #${requestId} atualizado: ${notes || updates.status}`
    );
  }

  // Buscar pedido específico
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

  // Buscar atualizações de progresso
  private async getProgressUpdates(
    requestId: number
  ): Promise<string[] | null> {
    const request = await this.getServiceRequest(requestId);
    return request?.progress_updates || null;
  }

  // Calcular taxa da plataforma (7%)
  private calculatePlatformFee(amount: number): number {
    return Math.round(amount * 0.07 * 100) / 100;
  }

  // Notificar stakeholders específicos
  private async notifyStakeholders(
    requestId: number,
    type: string,
    roles: string
  ): Promise<void> {
    // Implementação será expandida quando o NotificationService for atualizado
    const message = this.getNotificationMessage(type);
    this.notificationService.addNotification(
      `${message} - Pedido #${requestId}`
    );
  }

  // Notificar usuário específico
  private async notifySpecificUser(
    requestId: number,
    userId: number,
    type: string,
    message: string
  ): Promise<void> {
    // Implementação será expandida quando o NotificationService for atualizado
    this.notificationService.addNotification(
      `${message} - Pedido #${requestId}`
    );
  }

  // Obter mensagem de notificação por tipo
  private getNotificationMessage(type: string): string {
    const messages: Record<string, string> = {
      clarification_requested: "Esclarecimentos solicitados",
      clarification_provided: "Esclarecimentos fornecidos",
      quote_sent: "Orçamento enviado",
      quote_approved: "Orçamento aprovado",
      quote_rejected: "Orçamento rejeitado",
      execution_date_proposal: "Data de execução proposta",
      execution_date_approved: "Data de execução aprovada",
      execution_date_rejected: "Data de execução rejeitada",
      professional_assigned: "Profissional atribuído",
      professional_accepted: "Trabalho aceito",
      professional_rejected: "Trabalho rejeitado",
      work_scheduled: "Trabalho agendado",
      work_started: "Trabalho iniciado",
      work_completed: "Trabalho concluído",
      payment_due: "Pagamento pendente",
      payment_completed: "Pagamento processado",
    };
    return messages[type] || "Atualização do pedido";
  }

  /**
   * MÉTODOS PÚBLICOS PARA CONSULTA
   */

  // Verificar se uma transição de status é válida
  canTransitionTo(
    currentStatus: ServiceStatus,
    newStatus: ServiceStatus,
    userRole: string
  ): boolean {
    const validTransitions: Record<
      ServiceStatus,
      { statuses: ServiceStatus[]; roles: string[] }
    > = {
      Solicitado: {
        statuses: ["Em análise", "Aguardando esclarecimentos", "Cancelado"],
        roles: ["admin"],
      },
      "Em análise": {
        statuses: [
          "Orçamento enviado",
          "Aguardando esclarecimentos",
          "Cancelado",
        ],
        roles: ["admin"],
      },
      "Aguardando esclarecimentos": {
        statuses: ["Em análise", "Cancelado"],
        roles: ["client"],
      },
      "Orçamento enviado": {
        statuses: ["Aguardando aprovação do orçamento"],
        roles: ["admin"],
      },
      "Aguardando aprovação do orçamento": {
        statuses: ["Orçamento aprovado", "Orçamento rejeitado"],
        roles: ["client"],
      },
      "Orçamento aprovado": {
        statuses: [
          "Aguardando data de execução",
          "Data proposta pelo administrador",
          "Buscando profissional",
        ],
        roles: ["admin"],
      },
      "Aguardando data de execução": {
        statuses: ["Data proposta pelo administrador"],
        roles: ["admin"],
      },
      "Data proposta pelo administrador": {
        statuses: ["Data aprovada pelo cliente", "Data rejeitada pelo cliente"],
        roles: ["client"],
      },
      "Aguardando aprovação da data": {
        statuses: ["Data aprovada pelo cliente", "Data rejeitada pelo cliente"],
        roles: ["client"],
      },
      "Data aprovada pelo cliente": {
        statuses: ["Agendado"],
        roles: ["admin"],
      },
      "Data rejeitada pelo cliente": {
        statuses: ["Data proposta pelo administrador", "Cancelado"],
        roles: ["admin"],
      },
      "Orçamento rejeitado": {
        statuses: ["Em análise", "Cancelado"],
        roles: ["admin"],
      },
      "Buscando profissional": {
        statuses: ["Profissional selecionado"],
        roles: ["admin"],
      },
      "Profissional selecionado": {
        statuses: ["Aguardando confirmação do profissional"],
        roles: ["professional"],
      },
      "Aguardando confirmação do profissional": {
        statuses: ["Agendado", "Buscando profissional"],
        roles: ["admin", "professional"],
      },
      Agendado: {
        statuses: ["Em execução", "Cancelado"],
        roles: ["professional", "admin"],
      },
      "Em execução": {
        statuses: ["Concluído - Aguardando aprovação"],
        roles: ["professional"],
      },
      "Concluído - Aguardando aprovação": {
        statuses: ["Aprovado pelo cliente", "Rejeitado pelo cliente"],
        roles: ["client"],
      },
      "Aprovado pelo cliente": {
        statuses: ["Pago"],
        roles: ["client", "admin"],
      },
      "Rejeitado pelo cliente": {
        statuses: ["Em execução", "Cancelado"],
        roles: ["admin"],
      },
      Pago: {
        statuses: ["Finalizado"],
        roles: ["admin", "client", "professional"],
      },
      Finalizado: {
        statuses: [],
        roles: [],
      },
      Cancelado: {
        statuses: [],
        roles: [],
      },
    };

    const transition = validTransitions[currentStatus];
    if (!transition) return false;

    return (
      transition.statuses.includes(newStatus) &&
      transition.roles.includes(userRole)
    );
  }

  // Obter próximas ações possíveis para um pedido
  getAvailableActions(request: ServiceRequest, userRole: string): string[] {
    const actions: string[] = [];

    switch (request.status) {
      case "Solicitado":
        if (userRole === "admin") {
          actions.push("analyze", "request_clarification");
        }
        break;
      case "Em análise":
        if (userRole === "admin") {
          actions.push("send_quote", "request_clarification");
        }
        break;
      case "Aguardando esclarecimentos":
        if (userRole === "client") {
          actions.push("provide_clarification");
        }
        break;
      case "Orçamento enviado":
        if (userRole === "client") {
          actions.push("approve_quote", "reject_quote");
        }
        break;
      case "Orçamento aprovado":
        if (userRole === "admin") {
          actions.push("select_professional");
        }
        break;
      case "Profissional selecionado":
        if (userRole === "professional") {
          actions.push("accept_job", "reject_job");
        }
        break;
      case "Aguardando confirmação do profissional":
        if (userRole === "admin") {
          actions.push("schedule_work");
        }
        break;
      case "Agendado":
        if (userRole === "professional") {
          actions.push("start_work");
        }
        break;
      case "Em execução":
        if (userRole === "professional") {
          actions.push("complete_work", "add_progress_update");
        }
        break;
      case "Concluído - Aguardando aprovação":
        if (userRole === "client") {
          actions.push("approve_work", "reject_work");
        }
        break;
      case "Aprovado pelo cliente":
        if (userRole === "client") {
          actions.push("process_payment");
        }
        break;
      case "Pago":
        if (userRole === "client" || userRole === "professional") {
          actions.push("submit_evaluation");
        }
        break;
    }

    return actions;
  }
}
