import { Injectable, inject } from "@angular/core";
import { SmsService } from "./sms.service";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { I18nService } from "../i18n.service";
import { StatusAuditService } from "./status-audit.service";
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
  private readonly auditService = inject(StatusAuditService);
  private readonly smsService = inject(SmsService);

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
    "In Progress": ["Aguardando Finalização", "Cancelado"],
    
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
        "Data Definida->In Progress",
        "Em Progresso->Aguardando Finalização",
        "In Progress->Aguardando Finalização",
        "Aguardando Finalização->Pagamento Feito",
        "Pagamento Feito->Concluído",
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
    console.log('🎯 [createServiceRequest] INICIANDO - adminId:', adminId, 'data:', requestData);
    try {
      const admin = await this.getCurrentUser();
      if (admin?.role !== "admin") {
        throw new Error("Apenas administradores podem criar solicitações");
      }

      const newRequest: Partial<ServiceRequest> = {
        ...requestData,
        created_by_admin_id: adminId,
        status: "Solicitado",
        created_at: new Date().toISOString(),
        ispaid: false,
        // professional_id será definido na atribuição
      };

      const { data, error } = await this.supabase.client
        .from("service_requests")
        .insert([newRequest])
        .select("*")
        .single();

      if (error) throw error;

      console.log('📝 [createServiceRequest] Novo serviço criado com ID:', data.id);

      // Registrar na tabela de histórico (primeira entrada - criação)
      if (data?.id) {
        console.log('📊 [createServiceRequest] ANTES DE updateStatus - Gravando status inicial "Solicitado" para ID:', data.id);
        const statusResult = await this.updateStatus(
          data.id,
          "Solicitado",
          adminId,
          "Solicitação criada pelo administrador"
        );
        console.log('✅ [createServiceRequest] APÓS updateStatus - Resultado:', statusResult);
      }

      // Auditoria: Log da criação (null → Solicitado)
      await this.auditService.logStatusChange(
        data.id,
        null,
        "Solicitado" as const,
        "Solicitação criada pelo administrador"
      );

      this.notificationService.showSuccess(
        this.i18n.translate("serviceRequestCreated")
      );

      console.log('[createServiceRequest] ✅ Solicitação criada com sucesso:', data);
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
    console.log('🎯 [assignProfessional] INICIANDO - requestId:', requestId, 'professionalId:', professionalId);
    try {
      // Buscar status atual antes da mudança
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;

      // Validar transição
      if (!this.canTransition(previousStatus, "Atribuído")) {
        throw new Error(`Não é possível atribuir a partir do status ${previousStatus}`);
      }

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          professional_id: professionalId,
          assigned_by_admin_id: adminId,
          status: "Atribuído",
        })
        .eq("id", requestId);

      if (error) throw error;
      console.log('✅ [assignProfessional] Tabela service_requests atualizada');

      // Registrar na tabela de histórico
      console.log('📝 [assignProfessional] Chamando updateStatus para "Atribuído"');
      await this.updateStatus(requestId, "Atribuído", adminId);

      // Auditoria: Log da atribuição (Solicitado → Atribuído)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Atribuído" as const,
        `Profissional ID ${professionalId} atribuído pelo admin`
      );

      // Atualizar status para aguardando confirmação
      console.log('📝 [assignProfessional] Chamando updateStatus para "Aguardando Confirmação"');
      await this.updateStatus(requestId, "Aguardando Confirmação", adminId);

      // Auditoria: Log da mudança automática (Atribuído → Aguardando Confirmação)
      await this.auditService.logStatusChange(
        requestId,
        "Atribuído" as const,
        "Aguardando Confirmação" as const,
        "Notificação enviada ao profissional (transição automática)"
      );

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
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;
      const newStatus: ServiceStatus = accept ? "Aceito" : "Recusado";

      if (!this.canTransition(previousStatus, newStatus)) {
        throw new Error(`Não é possível mudar de ${previousStatus} para ${newStatus}`);
      }

      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.canPerformTransition(previousStatus, newStatus, currentUser.role)) {
        throw new Error("Usuário não tem permissão para esta transição");
      }

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: newStatus,
          admin_notes: notes ? `Resposta do profissional: ${notes}` : undefined,
        })
        .eq("id", requestId)
        .eq("professional_id", professionalId);

      if (error) throw error;

      // Registrar na tabela de histórico
      if (currentUser) {
        await this.updateStatus(requestId, newStatus, currentUser.id, notes ? `Resposta do profissional: ${notes}` : this.buildAuditMessage(accept, notes));
      }

      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        newStatus,
        this.buildAuditMessage(accept, notes)
      );

      await this.notifyAssignmentResponse(request, accept, requestId);

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

  private buildAuditMessage(accept: boolean, notes?: string): string {
    const base = accept ? "Profissional aceitou a solicitação" : "Profissional recusou a solicitação";
    return notes ? `${base}: ${notes}` : base;
  }

  private async notifyAssignmentResponse(
    request: ServiceRequest,
    accept: boolean,
    requestId: number
  ): Promise<void> {
    if (request.created_by_admin_id) {
      await this.notifyAdmin(
        request.created_by_admin_id,
        accept ? "serviceAccepted" : "serviceRejected",
        `Profissional ${accept ? "aceitou" : "recusou"} a solicitação #${requestId}`
      );
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
      // Buscar status atual antes da mudança
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;

      // Validar transição
      if (!this.canTransition(previousStatus, "Data Definida")) {
        throw new Error(`Não é possível definir data a partir do status ${previousStatus}`);
      }

      // Validar permissão
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.canPerformTransition(previousStatus, "Data Definida", currentUser.role)) {
        throw new Error("Usuário não tem permissão para definir data");
      }

      // Validar que a data não é no passado
      const scheduledDateTime = new Date(scheduledDate);
      if (scheduledDateTime < new Date()) {
        throw new Error("A data agendada não pode ser no passado");
      }

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

      // Registrar na tabela de histórico
      const currentUserSchedule = await this.getCurrentUser();
      if (currentUserSchedule) {
        await this.updateStatus(
          requestId, 
          "Data Definida", 
          currentUserSchedule.id, 
          "Data agendada para " + new Date(scheduledDate).toLocaleString('pt-PT') + (estimatedDuration ? " (duração estimada: " + estimatedDuration + " min)" : "")
        );
      }

      // Auditoria: Log do agendamento (Aceito → Data Definida)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Data Definida" as const,
        "Data agendada para " + new Date(scheduledDate).toLocaleString('pt-PT') + (estimatedDuration ? " (duração estimada: " + estimatedDuration + " min)" : ""),
        { scheduled_date: scheduledDate, estimated_duration: estimatedDuration }
      );

      // Notificar admin
      if (request.created_by_admin_id) {
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
      // Buscar status atual antes da mudança
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;

      // Validar transição
      if (!this.canTransition(previousStatus, "Em Progresso")) {
        throw new Error(`Não é possível iniciar a partir do status ${previousStatus}`);
      }

      // Validar permissão
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.canPerformTransition(previousStatus, "Em Progresso", currentUser.role)) {
        throw new Error("Usuário não tem permissão para iniciar execução");
      }

      // Validar que não está iniciando antes da data agendada
      if (request.scheduled_start_datetime) {
        const scheduledDate = new Date(request.scheduled_start_datetime);
        const now = new Date();
        // Permitir iniciar até 30 minutos antes da data agendada
        const thirtyMinutesBefore = new Date(scheduledDate.getTime() - 30 * 60 * 1000);
        
        if (now < thirtyMinutesBefore) {
          throw new Error(
            `Não é possível iniciar antes da data agendada (${scheduledDate.toLocaleString('pt-PT')}). Pode iniciar até 30 minutos antes.`
          );
        }
      }

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

      // Registrar na tabela de histórico
      if (currentUser) {
        await this.updateStatus(requestId, "Em Progresso", currentUser.id, "Profissional iniciou a execução do serviço");
      }

      // Auditoria: Log do início (Data Definida → Em Progresso)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Em Progresso" as const,
        "Profissional iniciou a execução do serviço",
        { actual_start: new Date().toISOString() }
      );

      this.notificationService.showSuccess(
        this.i18n.translate("serviceStarted")
      );

      return true;
    } catch (error) {
      console.error("Erro ao iniciar execução:", error);
      this.notificationService.showError(
        error instanceof Error ? error.message : this.i18n.translate("errorStartingService")
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
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;
      const currentUser = await this.getCurrentUser();

      await this.validateExecutionCompletion(previousStatus, currentUser);
      this.validateExecutionDuration(request);

      await this.updateCompletionStatus(requestId, professionalId, notes);
      await this.recordCompletionAudit(requestId, previousStatus, currentUser, notes);
      await this.notifyCompletionToAdmin(request, requestId);

      this.notificationService.showSuccess(
        this.i18n.translate("serviceCompleted")
      );

      return true;
    } catch (error) {
      console.error("Erro ao concluir execução:", error);
      this.notificationService.showError(
        error instanceof Error ? error.message : this.i18n.translate("errorCompletingService")
      );
      return false;
    }
  }

  private async validateExecutionCompletion(previousStatus: ServiceStatus, currentUser: any): Promise<void> {
    if (!this.canTransition(previousStatus, "Aguardando Finalização")) {
      throw new Error(`Não é possível concluir a partir do status ${previousStatus}`);
    }

    console.log("[DEBUG] completeExecution - Usuário:", currentUser, "Status anterior:", previousStatus, "Tentando para:", "Aguardando Finalização");
    if (!currentUser || !this.canPerformTransition(previousStatus, "Aguardando Finalização", currentUser.role)) {
      console.error("[DEBUG] Permissão negada para concluir execução", { currentUser, previousStatus });
      throw new Error("Usuário não tem permissão para concluir execução");
    }
  }

  private validateExecutionDuration(request: ServiceRequest): void {
    if (!request.started_at || !request.estimated_duration_minutes) {
      return;
    }

    const startTime = new Date(request.started_at);
    const now = new Date();
    const actualDuration = (now.getTime() - startTime.getTime()) / (1000 * 60);
    const minimumDuration = request.estimated_duration_minutes * 0.5;

    if (actualDuration < minimumDuration) {
      console.warn(
        `Serviço concluído em ${actualDuration.toFixed(1)} minutos, abaixo do mínimo esperado de ${minimumDuration.toFixed(1)} minutos`
      );
    }
  }

  private async updateCompletionStatus(requestId: number, professionalId: number, notes?: string): Promise<void> {
    const { error } = await this.supabase.client
      .from("service_requests")
      .update({
        status: "Aguardando Finalização",
        completed_at: new Date().toISOString(),
        actual_end_datetime: new Date().toISOString(),
        admin_notes: notes ? `Notas de conclusão: ${notes}` : undefined,
      })
      .eq("id", requestId)
      .eq("professional_id", professionalId);

    if (error) throw error;
  }

  private async recordCompletionAudit(requestId: number, previousStatus: ServiceStatus, currentUser: any, notes?: string): Promise<void> {
    const auditMessage = notes ? `Profissional concluiu a execução: ${notes}` : "Profissional concluiu a execução";

    if (currentUser) {
      await this.updateStatus(requestId, "Aguardando Finalização", currentUser.id, auditMessage);
    }

    await this.auditService.logStatusChange(
      requestId,
      previousStatus,
      "Aguardando Finalização" as const,
      auditMessage,
      { actual_end: new Date().toISOString(), notes }
    );
  }

  private async notifyCompletionToAdmin(request: ServiceRequest, requestId: number): Promise<void> {
    if (request.created_by_admin_id) {
      await this.notifyAdmin(
        request.created_by_admin_id,
        "serviceCompleted",
        `Serviço concluído - Solicitação #${requestId}`
      );
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
      // Buscar status atual antes da mudança
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;

      // Validar transição
      if (!this.canTransition(previousStatus, "Pagamento Feito")) {
        throw new Error(`Não é possível registrar pagamento a partir do status ${previousStatus}`);
      }

      // Validar permissão (apenas admin)
      const currentUser = await this.getCurrentUser();
      if (currentUser?.role !== "admin") {
        throw new Error("Apenas administradores podem registrar pagamentos");
      }

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          payment_date: new Date().toISOString(),
          payment_amount: paymentData.amount,
          payment_method: paymentData.method,
          payment_notes: paymentData.notes,
          paid_by_admin_id: adminId,
          status: "Pagamento Feito",
          ispaid: true,
        })
        .eq("id", requestId);

      if (error) throw error;

      // Registrar na tabela de histórico
      if (currentUser) {
        await this.updateStatus(
          requestId, 
          "Pagamento Feito", 
          currentUser.id, 
          "Pagamento registrado: " + paymentData.amount + "€ via " + paymentData.method + (paymentData.notes ? " - " + paymentData.notes : "")
        );
      }

      // Auditoria: Log do pagamento (Aguardando Finalização → Pagamento Feito)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Pagamento Feito" as const,
        "Pagamento registrado: " +
        paymentData.amount +
        "€ via " +
        paymentData.method +
        (paymentData.notes ? " - " + paymentData.notes : ""),
        { 
          payment_amount: paymentData.amount, 
          payment_method: paymentData.method,
          payment_notes: paymentData.notes 
        }
      );

      // Notificar profissional
      if (request.professional_id) {
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
        error instanceof Error ? error.message : this.i18n.translate("errorRegisteringPayment")
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
    adminNotes?: string,
    onRefresh?: () => void
  ): Promise<boolean> {
    try {
      // Buscar status atual antes da mudança
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;

      // Validar transição
      if (!this.canTransition(previousStatus, "Concluído")) {
        throw new Error(`Não é possível finalizar a partir do status ${previousStatus}`);
      }

      // Validar permissão (admin ou profissional, conforme regras)
      const currentUser = await this.getCurrentUser();
      if (!currentUser || !this.canPerformTransition(previousStatus, "Concluído", currentUser.role)) {
        throw new Error("Usuário não tem permissão para finalizar serviço");
      }

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

      // Registrar na tabela de histórico
      if (currentUser) {
        await this.updateStatus(
          requestId, 
          "Concluído", 
          currentUser.id, 
          "Serviço finalizado pelo administrador" + (adminNotes ? ": " + adminNotes : "")
        );
      }

      // Auditoria: Log da finalização (Pagamento Feito → Concluído)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Concluído" as const,
        "Serviço finalizado pelo administrador" + (adminNotes ? ": " + adminNotes : ""),
        { finalized_at: new Date().toISOString(), admin_notes: adminNotes }
      );

      this.notificationService.showSuccess(
        this.i18n.translate("serviceFinalized")
      );

      // Chama refresh da lista, se fornecido
      if (onRefresh) {
        try {
          onRefresh();
        } catch (refreshError) {
          console.error("Erro ao atualizar lista após finalização:", refreshError);
        }
      }

      return true;
    } catch (error) {
      console.error("Erro ao finalizar serviço:", error);
      this.notificationService.showError(
        error instanceof Error ? error.message : this.i18n.translate("errorFinalizingService")
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
      // Buscar status atual antes da mudança
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;

      // Validar transição
      if (!this.canTransition(previousStatus, "Cancelado")) {
        throw new Error(`Não é possível cancelar a partir do status ${previousStatus}`);
      }

      // Motivo obrigatório para cancelamentos
      if (!reason) {
        throw new Error("É obrigatório fornecer um motivo para cancelamento");
      }

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: "Cancelado",
          admin_notes: `Cancelado: ${reason}`,
        })
        .eq("id", requestId);

      if (error) throw error;

      // Registrar na tabela de histórico
      await this.updateStatus(requestId, "Cancelado", userId, reason);

      // Auditoria: Log do cancelamento (qualquer status → Cancelado)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Cancelado" as const,
        reason,
        { cancelled_at: new Date().toISOString() }
      );

      this.notificationService.showSuccess(
        this.i18n.translate("serviceCancelled")
      );

      return true;
    } catch (error) {
      console.error("Erro ao cancelar solicitação:", error);
      this.notificationService.showError(
        error instanceof Error ? error.message : this.i18n.translate("errorCancellingService")
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
    userId: number,
    notes?: string
  ): Promise<void> {
    try {
      console.log('[updateStatus] 🔄 INICIANDO - requestId:', requestId, 'newStatus:', newStatus, 'userId:', userId);

      // Atualiza o status atual na tabela principal
      const { error: updateError } = await this.supabase.client
        .from("service_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (updateError) {
        console.error('[updateStatus] ❌ Erro ao atualizar status principal:', updateError);
        throw updateError;
      }

      console.log('[updateStatus] ✅ Status principal atualizado');

      // Registra a mudança no histórico (INSERT sempre, nunca UPDATE)
      const statusEntry = {
        service_request_id: requestId,
        status: newStatus,
        changed_by: userId,
        changed_at: new Date().toISOString(),
        notes: notes || null
      };

      console.log('[updateStatus] 📝 Inserindo histórico:', statusEntry);

      const { data, error: historyError } = await this.supabase.client
        .from("service_requests_status")
        .insert([statusEntry])
        .select();

      if (historyError) {
        console.error('[updateStatus] ❌ ERRO ao inserir histórico:', historyError);
        console.error('[updateStatus] Dados: ', statusEntry);
        return;
      }

      console.log('[updateStatus] ✅ HISTÓRICO INSERIDO:', data);
    } catch (error) {
      console.error('[updateStatus] ❌ Erro geral:', error);
    }
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
    // Buscar dados do profissional
    const { data: professional, error } = await this.supabase.client
      .from("users")
      .select("id, name, phone, receive_sms_notifications")
      .eq("id", professionalId)
      .single();

    if (error || !professional) {
      console.error("Erro ao buscar profissional para SMS:", error);
      return;
    }

    // Verifica se o profissional aceita receber SMS e se o telefone está presente
    if (professional.receive_sms_notifications !== false && professional.phone) {
      try {
        await this.smsService.sendSms({
          to: professional.phone,
          message: message,
        });
        console.log(`SMS enviado para profissional ${professionalId}: ${professional.phone}`);
      } catch (smsError) {
        console.error("Erro ao enviar SMS ao profissional:", smsError);
      }
    } else {
      console.log(`Profissional ${professionalId} não possui telefone válido ou optou por não receber SMS.`);
    }

    // Notificação visual (NotificationService)
    console.log(`Notificando profissional ${professionalId}: ${message}`);
  }

  private async notifyAdmin(
    adminId: number,
    messageKey: string,
    message: string
  ): Promise<void> {
    // Implementar notificação via NotificationService
    console.log(`Notificando admin ${adminId}: ${message}`);
  }

  /**
   * Obtém descrição legível de um status
   */
  getStatusDescription(status: ServiceStatus): string {
    // Aceita tanto 'Em Progresso' (pt) quanto 'In Progress' (en) como equivalentes
    const s = String(status);
    
    // Mapeamento de traduções inglês para português
    const translationMap: Record<string, ServiceStatus> = {
      "In Progress": "Em Progresso",
      "Scheduled": "Data Definida",
      "Awaiting Finalization": "Aguardando Finalização",
      "Payment Made": "Pagamento Feito",
      "Completed": "Concluído",
      "Cancelled": "Cancelado",
    };
    
    const normalized = (translationMap[s] || s) as ServiceStatus;

    const descriptions: Record<ServiceStatus, string> = {
      "Solicitado": "Aguardando atribuição de profissional",
      "Atribuído": "Profissional foi atribuído",
      "Aguardando Confirmação": "Aguardando resposta do profissional",
      "Aceito": "Profissional aceitou o serviço",
      "Recusado": "Profissional recusou o serviço",
      "Data Definida": "Data de execução agendada",
      "Em Progresso": "Serviço em execução",
      "In Progress": "Serviço em execução",
      "Aguardando Finalização": "Aguardando finalização administrativa",
      "Pagamento Feito": "Pagamento ao profissional registrado",
      "Concluído": "Serviço finalizado",
      "Cancelado": "Serviço cancelado",
    };

    return descriptions[normalized] || status;
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
    /**
     * Edita os dados de uma solicitação
     * Permite atualização de campos editáveis (exceto status e IDs principais)
     */
    async editServiceRequest(
      requestId: number,
      updates: Partial<ServiceRequest>,
      userId: number
    ): Promise<boolean> {
      try {
        const request = await this.getRequest(requestId);
        if (!request) throw new Error("Solicitação não encontrada");

        // Permitir edição apenas se não estiver em estado final
        if (["Concluído", "Cancelado"].includes(request.status)) {
          throw new Error("Não é possível editar uma solicitação finalizada ou cancelada");
        }

        // Campos que podem ser editados (exemplo: endereço, descrição, data prevista)
        const editableFields = [
          "address", "description", "scheduled_start_datetime", "estimated_duration_minutes", "admin_notes"
        ];
        const filteredUpdates: Partial<ServiceRequest> = {};
        for (const key of editableFields) {
          if (key in updates) {
            filteredUpdates[key] = updates[key];
          }
        }

        if (Object.keys(filteredUpdates).length === 0) {
          throw new Error("Nenhum campo editável informado");
        }

        const { error } = await this.supabase.client
          .from("service_requests")
          .update(filteredUpdates)
          .eq("id", requestId);

        if (error) throw error;

        // Auditoria: Log da edição
        await this.auditService.logStatusChange(
          requestId,
          request.status,
          request.status,
          "Solicitação editada",
          { updates: filteredUpdates, edited_by: userId }
        );

        this.notificationService.showSuccess(
          this.i18n.translate("serviceRequestUpdated")
        );
        return true;
      } catch (error) {
        console.error("Erro ao editar solicitação:", error);
        this.notificationService.showError(
          error instanceof Error ? error.message : this.i18n.translate("errorEditingServiceRequest")
        );
        return false;
      }
    }
}
