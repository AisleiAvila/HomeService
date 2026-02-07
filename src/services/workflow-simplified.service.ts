import { Injectable, inject } from "@angular/core";
import { SmsService } from "./sms.service";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { I18nService } from "../i18n.service";
import { StatusAuditService } from "./status-audit.service";
import { ServiceImageService } from "./service-image.service";
import { InAppNotificationService } from "./in-app-notification.service";
import {
  ServiceRequest,
  ServiceStatus,
  UserRole,
  ServiceRequestImage,
  ServiceRequestImageUpload,
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
 *        Em Progresso → Concluído → Finalizado (pagamento tratado em paralelo)
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
  private readonly imageService = inject(ServiceImageService);
  private readonly inAppNotificationService = inject(InAppNotificationService);

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
    "Em Progresso": ["Concluído", "Cancelado"],
    "In Progress": ["Concluído", "Cancelado"],
    
    // Estados finais
    "Concluído": ["Finalizado"],
    "Finalizado": [],
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
        "Em Progresso->Concluído",
        "In Progress->Concluído",
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
   * Admin reatribui a solicitação para outro profissional, sem mudar o status.
   *
   * Importante: isso NÃO é a mesma coisa que a atribuição inicial.
   * O fluxo de atribuição inicial (assignProfessional) força transição para
   * "Atribuído" → "Aguardando Confirmação"; para status como "Data Definida"
   * isso é inválido. Aqui apenas trocamos o professional_id e registramos auditoria.
   */
  async reassignProfessional(
    requestId: number,
    newProfessionalId: number,
    adminId: number
  ): Promise<boolean> {
    console.log('🎯 [reassignProfessional] INICIANDO - requestId:', requestId, 'newProfessionalId:', newProfessionalId);
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser?.role !== 'admin') {
        throw new Error('Apenas administradores podem reatribuir solicitações');
      }

      const request = await this.getRequest(requestId);
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }

      const previousStatus = request.status;
      const previousProfessionalId = request.professional_id;

      // Não permite reatribuição em estados finais
      const normalizedStatus = (previousStatus || '').toString();
      if (normalizedStatus === 'Concluído' || normalizedStatus === 'Finalizado' || normalizedStatus === 'Cancelado' || normalizedStatus === 'Recusado') {
        throw new Error(`Não é possível reatribuir a partir do status ${previousStatus}`);
      }

      if (!previousProfessionalId) {
        // Se não há profissional anterior, é atribuição inicial — use assignProfessional
        return await this.assignProfessional(requestId, newProfessionalId, adminId);
      }

      if (previousProfessionalId === newProfessionalId) {
        return true;
      }

      const { error: updateError } = await this.supabase.client
        .from('service_requests')
        .update({
          professional_id: newProfessionalId,
          assigned_by_admin_id: adminId,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Registrar no histórico (mantém o status atual, só adiciona uma entrada com notes)
      await this.updateStatus(
        requestId,
        previousStatus,
        adminId,
        `Profissional reatribuído pelo admin (de ${previousProfessionalId} para ${newProfessionalId})`
      );

      // Auditoria (mantém o status)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        previousStatus,
        `Profissional reatribuído pelo admin (de ${previousProfessionalId} para ${newProfessionalId})`,
        { previous_professional_id: previousProfessionalId, new_professional_id: newProfessionalId }
      );

      // Notificar novo profissional
      await this.notifyProfessional(
        newProfessionalId,
        'serviceReassigned',
        `Solicitação #${requestId} foi reatribuída para você`
      );

      this.notificationService.showSuccess(
        this.i18n.translate('professionalAssigned')
      );

      return true;
    } catch (error) {
      console.error('Erro ao reatribuir profissional:', error);
      this.notificationService.showError(
        error instanceof Error ? error.message : this.i18n.translate('errorAssigningProfessional')
      );
      return false;
    }
  }

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

      // Atualizar professional_id e assigned_by_admin_id (sem mudar status ainda)
      const { error: updateError } = await this.supabase.client
        .from("service_requests")
        .update({
          professional_id: professionalId,
          assigned_by_admin_id: adminId,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;
      console.log('✅ [assignProfessional] Profissional e admin atribuídos');

      // Primeiro: Atribuído
      console.log('📝 [assignProfessional] Mudando status para "Atribuído"');
      await this.updateStatus(requestId, "Atribuído", adminId, `Profissional ID ${professionalId} atribuído pelo admin`);

      // Auditoria: Log da atribuição (Solicitado → Atribuído)
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Atribuído" as const,
        `Profissional ID ${professionalId} atribuído pelo admin`
      );

      // Segundo: Aguardando Confirmação
      console.log('📝 [assignProfessional] Mudando status para "Aguardando Confirmação"');
      await this.updateStatus(requestId, "Aguardando Confirmação", adminId, "Notificação enviada ao profissional");

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

      // Regra de negócio: para iniciar, é obrigatório ter pelo menos 1 imagem "antes"
      const imageCount = await this.imageService.getImageCount(requestId);
      if (imageCount.before <= 0) {
        throw new Error(this.i18n.translate("beforeImageRequiredToStartService"));
      }

      const nowIso = new Date().toISOString();
      const scheduledStartIso = request.scheduled_start_datetime ?? null;
      const shouldAdjustScheduledStart = (() => {
        if (!scheduledStartIso) return false;
        const scheduled = new Date(scheduledStartIso);
        if (!Number.isFinite(scheduled.getTime())) return false;
        return scheduled.getTime() > Date.now();
      })();

      // Evita violar o CHECK do banco (scheduled_start_datetime <= actual_start_datetime)
      // quando o profissional inicia a execução antes do horário agendado.
      const safeScheduledStartIso = shouldAdjustScheduledStart ? nowIso : undefined;

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: "Em Progresso",
          started_at: nowIso,
          actual_start_datetime: nowIso,
          ...(safeScheduledStartIso ? { scheduled_start_datetime: safeScheduledStartIso } : {}),
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
        { actual_start: nowIso }
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

      // Regra de negócio: para concluir, profissional precisa ter pelo menos 1 imagem "depois"
      if (currentUser?.role === "professional") {
        const imageCount = await this.imageService.getImageCount(requestId);
        if (imageCount.after <= 0) {
          throw new Error(this.i18n.translate("afterImageRequiredToCompleteService"));
        }
      }

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
    if (!this.canTransition(previousStatus, "Concluído")) {
      throw new Error(`Não é possível concluir a partir do status ${previousStatus}`);
    }

    console.log("[DEBUG] completeExecution - Usuário:", currentUser, "Status anterior:", previousStatus, "Tentando para:", "Concluído");
    if (!currentUser || !this.canPerformTransition(previousStatus, "Concluído", currentUser.role)) {
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
        status: "Concluído",
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
      await this.updateStatus(requestId, "Concluído", currentUser.id, auditMessage);
    }

    await this.auditService.logStatusChange(
      requestId,
      previousStatus,
      "Concluído" as const,
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
      method: "Dinheiro" | "Transferência" | "PIX" | "Cheque" | "Confirmado Manualmente";
      notes?: string;
    }
  ): Promise<boolean> {
    try {
      // Buscar status atual antes da mudança
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const previousStatus = request.status;

      if (previousStatus !== "Concluído") {
        throw new Error("Pagamentos só podem ser registrados quando a solicitação estiver concluída");
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
          ispaid: true,
          payment_status: "Paid",
        })
        .eq("id", requestId);

      if (error) throw error;

      // Registrar na tabela de histórico
      if (currentUser) {
        await this.updateStatus(
          requestId,
          "Concluído",
          currentUser.id,
          "Pagamento registrado: " + paymentData.amount + "€ via " + paymentData.method + (paymentData.notes ? " - " + paymentData.notes : "")
        );
      }

      // Auditoria: Log do pagamento mantendo status concluído
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Concluído" as const,
        "Pagamento registrado: " +
        paymentData.amount +
        "€ via " +
        paymentData.method +
        (paymentData.notes ? " - " + paymentData.notes : ""),
        { 
          payment_amount: paymentData.amount, 
          payment_method: paymentData.method,
          payment_notes: paymentData.notes,
          payment_status: "Paid"
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
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const currentUser = await this.getCurrentUser();
      await this.validateFinalization(request.status, currentUser, requestId);

      await this.updateFinalizationStatus(requestId, adminId, adminNotes);

      // Ao concluir a solicitação, materiais associados (Distribuído/Retirado) devem virar Instalado
      try {
        await this.updateAssociatedMaterialsStockStatusOnCompletion(requestId);
      } catch (materialsError) {
        console.error(
          "Erro ao atualizar status dos materiais associados na conclusão:",
          materialsError
        );
        this.notificationService.showError(
          "Serviço concluído, mas falha ao atualizar status dos materiais do estoque."
        );
      }

      await this.recordFinalizationAudit(requestId, request.status, currentUser, adminNotes);

      this.notificationService.showSuccess(
        this.i18n.translate("serviceFinalized")
      );

      this.handleRefreshCallback(onRefresh);

      return true;
    } catch (error) {
      console.error("Erro ao finalizar serviço:", error);
      this.notificationService.showError(
        error instanceof Error ? error.message : this.i18n.translate("errorFinalizingService")
      );
      return false;
    }
  }

  private async updateAssociatedMaterialsStockStatusOnCompletion(
    requestId: number
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from("service_request_materials")
      .select("stock_item_id")
      .eq("service_request_id", requestId);

    if (error) throw error;

    const ids = (data || [])
      .map((row: any) => Number(row?.stock_item_id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    if (ids.length === 0) {
      return;
    }

    const { error: updateError } = await this.supabase.client
      .from("stock_items")
      .update({ status: "Instalado" })
      .in("id", ids)
      .in("status", ["Distribuído", "Retirado"]);

    if (updateError) throw updateError;
  }

  /**
   * Admin marca uma solicitação como "Finalizado".
   *
   * Usado quando o admin já deu baixa/encerramento na Origem e deseja fechar o ciclo administrativo.
   */
  async markAsFinalized(
    requestId: number,
    adminId: number,
    adminNotes?: string,
    onRefresh?: () => void
  ): Promise<boolean> {
    try {
      const request = await this.getRequest(requestId);
      if (!request) throw new Error("Solicitação não encontrada");

      const currentUser = await this.getCurrentUser();
      if (currentUser?.role !== "admin") {
        throw new Error("Apenas administradores podem marcar como finalizado");
      }

      const previousStatus = request.status;
      if (!this.canTransition(previousStatus, "Finalizado")) {
        throw new Error(`Não é possível marcar como finalizado a partir do status ${previousStatus}`);
      }

      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          status: "Finalizado",
          finalized_at: new Date().toISOString(),
          finalized_by_admin_id: adminId,
          admin_notes: adminNotes ?? request.admin_notes ?? null,
        })
        .eq("id", requestId);

      if (error) throw error;

      const auditMessage = "Solicitação marcada como Finalizado pelo administrador" +
        (adminNotes ? ": " + adminNotes : "");

      await this.updateStatus(requestId, "Finalizado", adminId, auditMessage);
      await this.auditService.logStatusChange(
        requestId,
        previousStatus,
        "Finalizado" as const,
        auditMessage,
        { finalized_at: new Date().toISOString(), admin_notes: adminNotes }
      );

      this.notificationService.showSuccess(
        this.i18n.translate("serviceMarkedFinalized")
      );

      this.handleRefreshCallback(onRefresh);
      return true;
    } catch (error) {
      console.error("Erro ao marcar como finalizado:", error);
      this.notificationService.showError(
        error instanceof Error ? error.message : this.i18n.translate("errorMarkingFinalized")
      );
      return false;
    }
  }

  private async validateFinalization(
    previousStatus: ServiceStatus,
    currentUser: any,
    requestId: number
  ): Promise<void> {
    if (!this.canTransition(previousStatus, "Concluído")) {
      throw new Error(`Não é possível finalizar a partir do status ${previousStatus}`);
    }

    if (!currentUser || !this.canPerformTransition(previousStatus, "Concluído", currentUser.role)) {
      throw new Error("Usuário não tem permissão para finalizar serviço");
    }

    if (currentUser.role === "professional") {
      const imageCount = await this.imageService.getImageCount(requestId);
      if (imageCount.after <= 0) {
        throw new Error(this.i18n.translate("afterImageRequiredToCompleteService"));
      }
    }
  }

  private async updateFinalizationStatus(
    requestId: number,
    adminId: number,
    adminNotes?: string
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from("service_requests")
      .update({
        finalized_at: new Date().toISOString(),
        finalized_by_admin_id: adminId,
        admin_notes: adminNotes,
        status: "Concluído",
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
  }

  private async recordFinalizationAudit(
    requestId: number,
    previousStatus: ServiceStatus,
    currentUser: any,
    adminNotes?: string
  ): Promise<void> {
    const auditMessage = "Serviço finalizado pelo administrador" + (adminNotes ? ": " + adminNotes : "");

    if (currentUser) {
      await this.updateStatus(requestId, "Concluído", currentUser.id, auditMessage);
    }

    await this.auditService.logStatusChange(
      requestId,
      previousStatus,
      "Concluído" as const,
      auditMessage,
      { finalized_at: new Date().toISOString(), admin_notes: adminNotes }
    );
  }

  private handleRefreshCallback(onRefresh?: () => void): void {
    if (onRefresh) {
      try {
        onRefresh();
      } catch (refreshError) {
        console.error("Erro ao atualizar lista após finalização:", refreshError);
      }
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
      .is("deleted_at", null)
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
        const smsResult = await this.smsService.sendSms({
          to: professional.phone,
          message: message,
        });
        if (smsResult?.success) {
          console.log(`✅ SMS enviado para profissional ${professionalId}: ${professional.phone}`);
        } else {
          console.warn(`⚠️ Falha ao enviar SMS para ${professionalId}: ${smsResult?.error || 'Erro desconhecido'}`);
        }
      } catch (smsError) {
        console.error("❌ Erro ao enviar SMS ao profissional:", smsError);
        // Não interrompe o fluxo - notificação in-app ainda será criada
      }
    } else {
      console.log(`ℹ️ Profissional ${professionalId} não possui telefone válido ou optou por não receber SMS.`);
    }

    // Criar notificação in-app
    await this.inAppNotificationService.createNotification(
      professionalId,
      "service_assigned",
      this.i18n.translate("newServiceAssignedTitle"),
      message,
      `/professional/requests`,
      { message_key: messageKey }
    );

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
      "Awaiting Finalization": "Concluído",
      "Payment Made": "Concluído",
      "Finalized": "Finalizado",
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
      "Concluído": "Serviço finalizado",
      "Finalizado": "Solicitação encerrada pelo administrador",
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
        if (["Concluído", "Finalizado", "Cancelado"].includes(request.status)) {
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

  /**
   * GESTÃO DE IMAGENS
   */

  /**
   * Profissional faz upload de imagem (antes ou depois do serviço)
   */
  async uploadServiceImage(
    file: File,
    requestId: number,
    imageType: 'before' | 'after',
    description?: string
  ): Promise<ServiceRequestImage | null> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      const uploadData: ServiceRequestImageUpload = {
        service_request_id: requestId,
        image_type: imageType,
        description,
      };

      const result = await this.imageService.uploadImage(
        file,
        uploadData,
        currentUser.id
      );

      if (result) {
        // Registrar na auditoria
        await this.auditService.logStatusChange(
          requestId,
          (await this.getRequest(requestId))?.status || "Solicitado",
          (await this.getRequest(requestId))?.status || "Solicitado",
          `Imagem ${imageType === 'before' ? 'antes' : 'depois'} adicionada${description ? ': ' + description : ''}`,
          { image_id: result.id, image_url: result.image_url }
        );
      }

      return result;
    } catch (error) {
      console.error("Erro ao fazer upload de imagem:", error);
      return null;
    }
  }

  /**
   * Lista imagens de uma solicitação
   */
  async getServiceImages(
    requestId: number,
    imageType?: 'before' | 'after'
  ): Promise<ServiceRequestImage[]> {
    return this.imageService.getImagesByRequest(requestId, imageType);
  }

  /**
   * Deleta uma imagem
   */
  async deleteServiceImage(imageId: number): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      return await this.imageService.deleteImage(imageId, currentUser.id);
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      return false;
    }
  }

  /**
   * Atualiza descrição de uma imagem
   */
  async updateImageDescription(
    imageId: number,
    description: string
  ): Promise<boolean> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      return await this.imageService.updateImageDescription(
        imageId,
        description,
        currentUser.id
      );
    } catch (error) {
      console.error("Erro ao atualizar descrição:", error);
      return false;
    }
  }

  /**
   * Obtém contagem de imagens de uma solicitação
   */
  async getImageCount(requestId: number): Promise<{ before: number; after: number; total: number }> {
    return this.imageService.getImageCount(requestId);
  }
}
