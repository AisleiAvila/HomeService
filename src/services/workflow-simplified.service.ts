import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { I18nService } from "../i18n.service";
import {
  ServiceRequest,
  ServiceStatus,
  UserRole,
} from "../models/maintenance.models";

/**
 * Serviço de Workflow Simplificado
 * 
 * Novo modelo sem participação de cliente:
 * - Admin cria e gerencia solicitações
 * - Profissional executa serviços atribuídos
 * - Admin paga e finaliza
 * 
 * Fluxo: Solicitado → Atribuído → Aceito → Data Definida → 
 *        Em Progresso → Aguardando Finalização → Pagamento Feito → Concluído
 */
@Injectable({
  providedIn: "root",
})
export class WorkflowServiceSimplified {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);

  /**
   * Mapeamento de transições válidas
   * Define quais mudanças de status são permitidas
   */
  private readonly validTransitions: Record<ServiceStatus, ServiceStatus[]> = {
    // Admin cria → Admin atribui ou Cancela
    "Solicitado": ["Atribuído", "Cancelado"],
    
    // Admin atribui → Sistema notifica profissional
    "Atribuído": ["Aguardando Confirmação", "Cancelado"],
    
    // Profissional decide → Aceita, Recusa ou Cancela
    "Aguardando Confirmação": ["Aceito", "Recusado", "Cancelado"],
    
    // Se aceito → Profissional define data
    "Aceito": ["Data Definida", "Cancelado"],
    
    // Se recusado → Estado final (admin pode reatribuir criando nova solicitação)
    "Recusado": [],
    
    // Data definida → Profissional inicia execução
    "Data Definida": ["Em Progresso", "Cancelado"],
    
    // Em execução → Profissional conclui ou volta se necessário
    "Em Progresso": ["Aguardando Finalização", "Cancelado"],
    
    // Aguardando → Admin paga ou volta para execução se houver problema
    "Aguardando Finalização": ["Pagamento Feito", "Em Progresso", "Cancelado"],
    
    // Pagamento → Admin finaliza
    "Pagamento Feito": ["Concluído"],
    
    // Estados finais
    "Concluído": [],
    "Cancelado": [],
  };

  /**
   * Valida se uma transição de status é permitida
   */
  canTransition(from: ServiceStatus, to: ServiceStatus): boolean {
    const allowedTransitions = this.validTransitions[from];
    return allowedTransitions?.includes(to) ?? false;
  }

  /**
   * Valida se um usuário tem permissão para fazer uma transição
   */
  canPerformTransition(
    from: ServiceStatus,
    to: ServiceStatus,
    userRole: UserRole
  ): boolean {
    // Verificar se a transição é válida
    if (!this.canTransition(from, to)) {
      return false;
    }

    // Admin pode fazer quase todas as transições
    if (userRole === "admin") {
      return true;
    }

    // Profissional pode fazer transições específicas
    if (userRole === "professional") {
      const allowedProfessionalTransitions = [
        "Aguardando Confirmação->Aceito",
        "Aguardando Confirmação->Recusado",
        "Aceito->Data Definida",
        "Data Definida->Em Progresso",
        "Em Progresso->Aguardando Finalização",
      ];
      
      const transitionKey = `${from}->${to}`;
      return allowedProfessionalTransitions.includes(transitionKey);
    }

    return false;
  }

  /**
   * FASE 1: CRIAÇÃO (Admin)
   */

  /**
   * Admin cria uma nova solicitação de serviço
   */
  async createServiceRequest(
    requestData: Partial<ServiceRequest>,
    adminId: number
  ): Promise<ServiceRequest | null> {
    try {
      const admin = await this.getCurrentUser();
      if (!admin || admin.role !== "admin") {
        throw new Error("Apenas administradores podem criar solicitações");
      }

      const newRequest: Partial<ServiceRequest> = {
        ...requestData,
        created_by_admin_id: adminId,
        status: "Solicitado",
        created_at: new Date().toISOString(),
        // professional_id será definido na atribuição
      };

      const { data, error } = await this.supabase.client
        .from("service_requests")
        .insert([newRequest])
        .select("*")
        .single();

      if (error) throw error;

      this.notificationService.showSuccess(
        this.i18n.translate("serviceRequestCreated")
      );

      return data;
    } catch (error) {
      console.error("Erro ao criar solicitação:", error);
      this.notificationService.showError(
        this.i18n.translate("errorCreatingServiceRequest")
      );
      return null;
    }
  }

  /**
   * FASE 2: ATRIBUIÇÃO (Admin → Profissional)
   */

  /**
   * Admin atribui profissional à solicitação
   */
  async assignProfessional(
    requestId: number,
    professionalId: number,
    adminId: number
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          professional_id: professionalId,
          assigned_by_admin_id: adminId,
          status: "Atribuído",
        })
        .eq("id", requestId);

      if (error) throw error;

      // Atualizar status para aguardando confirmação
      await this.updateStatus(requestId, "Aguardando Confirmação", adminId);

      // Notificar profissional
      await this.notifyProfessional(
        professionalId,
        "newServiceAssigned",
        `Nova solicitação atribuída #${requestId}`
      );

      this.notificationService.showSuccess(
        this.i18n.translate("professionalAssigned")
      );

      return true;
    } catch (error) {
      console.error("Erro ao atribuir profissional:", error);
      this.notificationService.showError(
        this.i18n.translate("errorAssigningProfessional")
      );
      return false;
    }
  }

  /**
   * Profissional aceita ou recusa a solicitação
   */
  async respondToAssignment(
    requestId: number,
    professionalId: number,
    accept: boolean,
    notes?: string
  ): Promise<boolean> {
    try {
      const newStatus: ServiceStatus = accept ? "Aceito" : "Recusado";

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: newStatus,
          admin_notes: notes
            ? `Resposta do profissional: ${notes}`
            : undefined,
        })
        .eq("id", requestId)
        .eq("professional_id", professionalId);

      if (error) throw error;

      // Notificar admin
      const request = await this.getRequest(requestId);
      if (request?.created_by_admin_id) {
        await this.notifyAdmin(
          request.created_by_admin_id,
          accept ? "serviceAccepted" : "serviceRejected",
          `Profissional ${accept ? "aceitou" : "recusou"} a solicitação #${requestId}`
        );
      }

      this.notificationService.showSuccess(
        this.i18n.translate(accept ? "serviceAccepted" : "serviceRejected")
      );

      return true;
    } catch (error) {
      console.error("Erro ao responder atribuição:", error);
      this.notificationService.showError(
        this.i18n.translate("errorRespondingToAssignment")
      );
      return false;
    }
  }

  /**
   * FASE 3: AGENDAMENTO (Profissional)
   */

  /**
   * Profissional define data de execução
   */
  async setScheduledDate(
    requestId: number,
    professionalId: number,
    scheduledDate: string,
    estimatedDuration?: number
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          scheduled_start_datetime: scheduledDate,
          estimated_duration_minutes: estimatedDuration,
          status: "Data Definida",
        })
        .eq("id", requestId)
        .eq("professional_id", professionalId);

      if (error) throw error;

      // Notificar admin
      const request = await this.getRequest(requestId);
      if (request?.created_by_admin_id) {
        await this.notifyAdmin(
          request.created_by_admin_id,
          "dateScheduled",
          `Data definida para solicitação #${requestId}`
        );
      }

      this.notificationService.showSuccess(
        this.i18n.translate("dateScheduledSuccessfully")
      );

      return true;
    } catch (error) {
      console.error("Erro ao definir data:", error);
      this.notificationService.showError(
        this.i18n.translate("errorSchedulingDate")
      );
      return false;
    }
  }

  /**
   * FASE 4: EXECUÇÃO (Profissional)
   */

  /**
   * Profissional inicia execução do serviço
   */
  async startExecution(
    requestId: number,
    professionalId: number
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: "Em Progresso",
          started_at: new Date().toISOString(),
          actual_start_datetime: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("professional_id", professionalId);

      if (error) throw error;

      this.notificationService.showSuccess(
        this.i18n.translate("serviceStarted")
      );

      return true;
    } catch (error) {
      console.error("Erro ao iniciar execução:", error);
      this.notificationService.showError(
        this.i18n.translate("errorStartingService")
      );
      return false;
    }
  }

  /**
   * Profissional marca serviço como concluído
   */
  async completeExecution(
    requestId: number,
    professionalId: number,
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: "Aguardando Finalização",
          completed_at: new Date().toISOString(),
          actual_end_datetime: new Date().toISOString(),
          admin_notes: notes
            ? `Notas de conclusão: ${notes}`
            : undefined,
        })
        .eq("id", requestId)
        .eq("professional_id", professionalId);

      if (error) throw error;

      // Notificar admin
      const request = await this.getRequest(requestId);
      if (request?.created_by_admin_id) {
        await this.notifyAdmin(
          request.created_by_admin_id,
          "serviceCompleted",
          `Serviço concluído - Solicitação #${requestId}`
        );
      }

      this.notificationService.showSuccess(
        this.i18n.translate("serviceCompleted")
      );

      return true;
    } catch (error) {
      console.error("Erro ao concluir execução:", error);
      this.notificationService.showError(
        this.i18n.translate("errorCompletingService")
      );
      return false;
    }
  }

  /**
   * FASE 5: PAGAMENTO E FINALIZAÇÃO (Admin)
   */

  /**
   * Admin registra pagamento ao profissional
   */
  async registerPayment(
    requestId: number,
    adminId: number,
    paymentData: {
      amount: number;
      method: "Dinheiro" | "Transferência" | "PIX" | "Cheque";
      notes?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          payment_date: new Date().toISOString(),
          payment_amount: paymentData.amount,
          payment_method: paymentData.method,
          payment_notes: paymentData.notes,
          paid_by_admin_id: adminId,
          status: "Pagamento Feito",
        })
        .eq("id", requestId);

      if (error) throw error;

      // Notificar profissional
      const request = await this.getRequest(requestId);
      if (request?.professional_id) {
        await this.notifyProfessional(
          request.professional_id,
          "paymentRegistered",
          `Pagamento registrado para solicitação #${requestId}`
        );
      }

      this.notificationService.showSuccess(
        this.i18n.translate("paymentRegistered")
      );

      return true;
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      this.notificationService.showError(
        this.i18n.translate("errorRegisteringPayment")
      );
      return false;
    }
  }

  /**
   * Admin finaliza o serviço
   */
  async finalizeService(
    requestId: number,
    adminId: number,
    adminNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          finalized_at: new Date().toISOString(),
          finalized_by_admin_id: adminId,
          admin_notes: adminNotes,
          status: "Concluído",
        })
        .eq("id", requestId);

      if (error) throw error;

      this.notificationService.showSuccess(
        this.i18n.translate("serviceFinalized")
      );

      return true;
    } catch (error) {
      console.error("Erro ao finalizar serviço:", error);
      this.notificationService.showError(
        this.i18n.translate("errorFinalizingService")
      );
      return false;
    }
  }

  /**
   * CANCELAMENTO (Admin ou Sistema)
   */

  /**
   * Cancela uma solicitação
   */
  async cancelRequest(
    requestId: number,
    userId: number,
    reason?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: "Cancelado",
          admin_notes: reason ? `Cancelado: ${reason}` : "Cancelado",
        })
        .eq("id", requestId);

      if (error) throw error;

      this.notificationService.showSuccess(
        this.i18n.translate("serviceCancelled")
      );

      return true;
    } catch (error) {
      console.error("Erro ao cancelar solicitação:", error);
      this.notificationService.showError(
        this.i18n.translate("errorCancellingService")
      );
      return false;
    }
  }

  /**
   * MÉTODOS AUXILIARES
   */

  private async updateStatus(
    requestId: number,
    newStatus: ServiceStatus,
    userId: number
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from("service_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (error) throw error;
  }

  private async getRequest(requestId: number): Promise<ServiceRequest | null> {
    const { data, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (error) {
      console.error("Erro ao buscar solicitação:", error);
      return null;
    }

    return data;
  }

  private async getCurrentUser() {
    return this.authService.appUser();
  }

  private async notifyProfessional(
    professionalId: number,
    messageKey: string,
    message: string
  ): Promise<void> {
    // Implementar notificação via NotificationService
    // TODO: Adicionar lógica de notificação real
    console.log(`Notificando profissional ${professionalId}: ${message}`);
  }

  private async notifyAdmin(
    adminId: number,
    messageKey: string,
    message: string
  ): Promise<void> {
    // Implementar notificação via NotificationService
    // TODO: Adicionar lógica de notificação real
    console.log(`Notificando admin ${adminId}: ${message}`);
  }

  /**
   * Obtém descrição legível de um status
   */
  getStatusDescription(status: ServiceStatus): string {
    const descriptions: Record<ServiceStatus, string> = {
      "Solicitado": "Aguardando atribuição de profissional",
      "Atribuído": "Profissional foi atribuído",
      "Aguardando Confirmação": "Aguardando resposta do profissional",
      "Aceito": "Profissional aceitou o serviço",
      "Recusado": "Profissional recusou o serviço",
      "Data Definida": "Data de execução agendada",
      "Em Progresso": "Serviço em execução",
      "Aguardando Finalização": "Aguardando finalização administrativa",
      "Pagamento Feito": "Pagamento ao profissional registrado",
      "Concluído": "Serviço finalizado",
      "Cancelado": "Serviço cancelado",
    };

    return descriptions[status as ServiceStatus] || status;
  }

  /**
   * Obtém próximas ações possíveis para um status
   */
  getNextActions(status: ServiceStatus, userRole: UserRole): string[] {
    const nextStatuses = this.validTransitions[status] || [];
    
    return nextStatuses.filter((nextStatus) =>
      this.canPerformTransition(status, nextStatus, userRole)
    );
  }
}
