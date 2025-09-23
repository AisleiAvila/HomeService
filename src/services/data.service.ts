import { Injectable, signal, inject } from "@angular/core";
import { environment } from "../environments/environment";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { AuthService } from "./auth.service";
import { I18nService } from "./i18n.service";
import { WorkflowService } from "./workflow.service";
import { AlertService } from "./alert.service";
import {
  User,
  ServiceRequest,
  ChatMessage,
  ServiceCategory,
  ServiceStatus,
  PaymentStatus,
  ServiceRequestPayload,
  ServiceClarification,
  SchedulingStatus,
  WorkflowStats,
  DateApproval,
} from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class DataService {
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private i18n = inject(I18nService);

  // Signals for storing application data
  readonly users = signal<User[]>([]);
  readonly serviceRequests = signal<ServiceRequest[]>([]);
  readonly chatMessages = signal<ChatMessage[]>([]);
  // Service categories - will be loaded from Supabase
  readonly categories = signal<ServiceCategory[]>([]);

  constructor() {
    this.listenToServiceRequestChanges();
    this.listenToUserChanges();
    // Add sample data for pagination testing
    this.addSampleDataForTesting();
  }

  private addSampleDataForTesting() {
    console.log("🔧 Adding sample data for testing...");

    // Add sample users
    const sampleUsers: User[] = [
      {
        id: 1,
        auth_id: "test-client-1",
        name: "João Silva",
        email: "joao@example.com",
        role: "client",
        status: "Active",
        phone: "11999999999",
        avatar_url: "",
        specialties: [],
        address: {
          street: "Rua A, 123",
          city: "São Paulo",
          state: "SP",
          zip_code: "01234-567",
        },
      },
      {
        id: 2,
        auth_id: "test-professional-1",
        name: "Maria Santos",
        email: "maria@example.com",
        role: "professional",
        status: "Active",
        phone: "11888888888",
        avatar_url: "",
        specialties: ["Plumbing", "Electrical"],
        address: {
          street: "Rua B, 456",
          city: "São Paulo",
          state: "SP",
          zip_code: "01234-568",
        },
      },
      {
        id: 3,
        auth_id: "test-admin-1",
        name: "Admin Sistema",
        email: "admin@example.com",
        role: "admin",
        status: "Active",
        phone: "11777777777",
        avatar_url: "",
        specialties: [],
        address: {
          street: "Rua C, 789",
          city: "São Paulo",
          state: "SP",
          zip_code: "01234-569",
        },
      },
    ];

    // Add sample service requests with varied names for testing
    const sampleRequests: ServiceRequest[] = [];
    const serviceNames = [
      "Trocar encanamento danificado",
      "Cortar grama",
      "Instalação elétrica",
      "Limpeza geral da casa",
      "Pintura de parede",
      "Conserto de vazamento",
      "Manutenção do jardim",
      "Troca de tomadas",
      "Limpeza de piscina",
      "Pintura de fachada",
      "Reparo hidráulico",
      "Poda de árvores",
      "Instalação de ventilador",
      "Limpeza de caixa d'água",
      "Pintura de portão",
      "Desentupimento",
      "Jardinagem completa",
      "Revisão elétrica",
      "Limpeza pós-obra",
      "Pintura interna",
      "Manutenção de bomba",
      "Corte de cerca viva",
      "Instalação de interruptor",
      "Limpeza de calhas",
      "Pintura externa",
    ];

    // Novos status para teste
    const newStatuses: ServiceStatus[] = [
      "Solicitado",
      "Em análise",
      "Orçamento enviado",
      "Aguardando aprovação do orçamento",
      "Orçamento aprovado",
      "Buscando profissional",
      "Profissional selecionado",
      "Agendado",
      "Em execução",
      "Concluído - Aguardando aprovação",
      "Aprovado pelo cliente",
      "Pago",
      "Finalizado",
    ];

    for (let i = 1; i <= 25; i++) {
      sampleRequests.push({
        id: i,
        client_id: 1,
        professional_id: i % 3 === 0 ? 2 : null,
        client_auth_id: "test-client-1",
        professional_auth_id: i % 3 === 0 ? "test-professional-1" : null,
        title: serviceNames[i - 1],
        description: `Descrição detalhada do serviço: ${serviceNames[i - 1]}`,
        category: [
          "Plumbing",
          "Electrical",
          "Cleaning",
          "Gardening",
          "Painting",
        ][i % 5] as ServiceCategory,
        street: `Rua Teste ${i}, ${100 + i}`,
        city: "São Paulo",
        state: "SP",
        zip_code: `0${String(i).padStart(4, "0")}-000`,
        status: newStatuses[i % newStatuses.length],
        payment_status: i % 3 === 0 ? "Paid" : ("Unpaid" as PaymentStatus),
        requested_date: new Date(
          Date.now() - i * 24 * 60 * 60 * 1000
        ).toISOString(),
        scheduled_date:
          i % 4 === 0
            ? new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
            : null,
        cost: i % 2 === 0 ? 100 + i * 10 : null,
        client_name: "João Silva",
        professional_name: i % 3 === 0 ? "Maria Santos" : "Não atribuído",

        // Novos campos de exemplo
        quote_amount: i % 2 === 0 ? 100 + i * 10 : null,
        quote_description:
          i % 2 === 0
            ? `Orçamento detalhado para: ${serviceNames[i - 1]}`
            : null,
        requested_datetime: new Date(
          Date.now() - i * 24 * 60 * 60 * 1000
        ).toISOString(),
        scheduled_start_datetime:
          i % 4 === 0
            ? new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
            : null,
        estimated_duration_minutes: i % 3 === 0 ? 120 + i * 30 : null,
      });
    }

    this.users.set(sampleUsers);
    this.serviceRequests.set(sampleRequests);
    this.categories.set([
      "Plumbing",
      "Electrical",
      "Cleaning",
      "Gardening",
      "Painting",
    ]);

    console.log(
      `✅ Sample data loaded: ${sampleUsers.length} users, ${sampleRequests.length} requests`
    );
  }

  async loadInitialData(currentUser: User) {
    await this.fetchUsers();
    await this.fetchServiceRequests(currentUser);
    await this.fetchCategories();
  }

  clearData() {
    this.users.set([]);
    this.serviceRequests.set([]);
    this.chatMessages.set([]);
    this.categories.set([]);
  }

  private async fetchUsers() {
    const { data, error } = await this.supabase.client
      .from("users")
      .select("*");
    if (error) {
      console.log(
        "Error fetching users from Supabase, keeping sample data:",
        error.message
      );
      this.notificationService.addNotification(
        "Using sample data - Error fetching users: " + error.message
      );
    } else if (data && data.length > 0) {
      console.log("Loaded users from Supabase:", data.length);
      this.users.set(data as User[]);
    } else {
      console.log("No users found in Supabase, keeping sample data");
    }
  }

  private async fetchServiceRequests(currentUser: User) {
    let query = this.supabase.client.from("service_requests").select("*");
    let filtro: { client_auth_id?: string; professional_id?: number } = {};
    if (currentUser.role === "client") {
      query = query.eq("client_auth_id", currentUser.auth_id);
      filtro = { client_auth_id: currentUser.auth_id };
    } else if (currentUser.role === "professional") {
      // Forçar tipo integer
      const profId =
        typeof currentUser.id === "string"
          ? parseInt(currentUser.id, 10)
          : currentUser.id;
      console.log(
        "[DEBUG] Valor de professional_id usado no filtro:",
        profId,
        "Tipo:",
        typeof profId
      );
      query = query.eq("professional_id", profId);
      filtro = { professional_id: profId };
    }
    // Admin: sem filtro

    console.log("[fetchServiceRequests] Filtro aplicado:", filtro);
    // Exibe a query como string SQL simulada para debug
    let sqlDebug = "SELECT * FROM service_requests";
    if (filtro.client_auth_id) {
      sqlDebug += ` WHERE client_auth_id = '${filtro.client_auth_id}'`;
    } else if (filtro.professional_id) {
      sqlDebug += ` WHERE professional_id = ${filtro.professional_id}`;
    }
    console.log("[DEBUG] SQL simulada:", sqlDebug);

    const { data, error } = await query;
    if (error) {
      console.log("[fetchServiceRequests] Objeto de erro completo:", error);
    }

    // Log detalhado do resultado bruto e tipos
    if (data) {
      console.log("[DEBUG] Resultado bruto da consulta Supabase:", data);
      data.forEach((item: any, idx: number) => {
        console.log(
          `[DEBUG] Item #${idx} - id: ${item.id}, professional_id:`,
          item.professional_id,
          "(typeof:",
          typeof item.professional_id,
          ")"
        );
      });
    }

    if (error) {
      console.log(
        "Error fetching service requests from Supabase, keeping sample data:",
        error.message
      );
      this.notificationService.addNotification(
        "Using sample data - Error fetching service requests: " + error.message
      );
    } else {
      console.log(
        "Loaded service requests from Supabase:",
        data ? data.length : 0
      );
      console.log("[fetchServiceRequests] Dados retornados:", data);
      if (data && data.length > 0) {
        const users = this.users();
        const requests = (data as any[]).map((r) => ({
          ...r,
          client_name:
            users.find((u) => u.id === r.client_id)?.name || "Unknown",
          professional_name:
            users.find((u) => u.id === r.professional_id)?.name || "Unassigned",
        }));
        this.serviceRequests.set(requests);
      } else {
        this.serviceRequests.set([]);
      }
    }
  }

  private async fetchCategories() {
    const { data, error } = await this.supabase.client
      .from("service_categories")
      .select("*")
      .order("name");

    if (error) {
      console.log(
        "Error fetching categories from Supabase, keeping sample data:",
        error.message
      );
      this.notificationService.addNotification(
        "Using sample data - Error fetching categories: " + error.message
      );
      // Keep default categories if fetch fails
    } else if (data && data.length > 0) {
      console.log("Loaded categories from Supabase:", data.length);
      // Assuming the table has a 'name' column
      this.categories.set(data.map((cat: any) => cat.name));
    } else {
      console.log("No categories found in Supabase, keeping sample data");
    }
  }

  async addServiceRequest(payload: ServiceRequestPayload) {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Usar requested_datetime (agora obrigatório)
    const requestedDateTime = payload.requested_datetime;

    const newRequestData = {
      client_id: currentUser.id,
      client_auth_id: currentUser.auth_id,
      title: payload.title,
      description: payload.description,
      category: payload.category,
      street: payload.address.street,
      city: payload.address.city,
      state: payload.address.state,
      zip_code: payload.address.zip_code,
      requested_datetime: requestedDateTime, // Campo principal
      status: "Solicitado" as ServiceStatus,
      payment_status: "Unpaid",
    };
    const { error } = await this.supabase.client
      .from("service_requests")
      .insert(newRequestData);

    if (error) {
      this.notificationService.addNotification(
        "Error creating service request: " + error.message
      );
      throw error;
    } else {
      this.notificationService.addNotification(
        "Service request created successfully!"
      );
      // Reload service requests to show the new one
      const currentUser = this.authService.appUser();
      if (currentUser) {
        await this.fetchServiceRequests(currentUser);
      }
      return true;
    }
  }

  async updateServiceRequest(id: number, updates: Partial<ServiceRequest>) {
    // Get current request to track status changes
    const currentRequest = this.getServiceRequestById(id);

    const { error } = await this.supabase.client
      .from("service_requests")
      .update(updates)
      .eq("id", id);

    if (error) {
      this.notificationService.addNotification(
        "Error updating request: " + error.message
      );
    } else {
      // Notify about status changes
      if (
        updates.status &&
        currentRequest &&
        currentRequest.status !== updates.status
      ) {
        this.notificationService.addNotification(
          this.i18n.translate("statusChangedFromTo", {
            id: id.toString(),
            from: currentRequest.status,
            to: updates.status,
          })
        );
      }

      // Notify about payment status changes
      if (
        updates.payment_status &&
        currentRequest &&
        currentRequest.payment_status !== updates.payment_status
      ) {
        this.notificationService.addNotification(
          this.i18n.translate("paymentStatusChanged", {
            id: id.toString(),
            status: updates.payment_status,
          })
        );
      }
    }
  }

  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find((r) => r.id === id);
  }

  respondToQuote(requestId: number, approved: boolean) {
    const status: ServiceStatus = approved
      ? "Orçamento aprovado"
      : "Orçamento rejeitado";
    this.updateServiceRequest(requestId, { status });
    this.notificationService.addNotification(
      `Orçamento do pedido #${requestId} foi ${
        approved ? "aprovado" : "rejeitado"
      }.`
    );
  }

  async scheduleServiceRequest(
    requestId: number,
    professionalId: number,
    scheduledDate: Date
  ) {
    const updates = {
      professional_id: professionalId,
      scheduled_date: scheduledDate.toISOString(),
      status: "Agendado" as ServiceStatus,
    };

    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Service request #${requestId} has been scheduled.`
    );
  }

  // Novos métodos para controle de data de execução
  async proposeExecutionDate(
    requestId: number,
    proposedDate: Date,
    notes?: string
  ) {
    // Buscar o request para obter o client_id
    const request = this.serviceRequests().find((r) => r.id === requestId);
    if (!request) {
      console.error("Request não encontrado:", requestId);
      return;
    }

    const updates: Partial<ServiceRequest> = {
      proposed_execution_date: proposedDate.toISOString(),
      proposed_execution_notes: notes || null,
      execution_date_proposed_at: new Date().toISOString(),
      status: "Data proposta pelo administrador" as ServiceStatus,
    };

    await this.updateServiceRequest(requestId, updates);

    // Notificação para o admin (local)
    this.notificationService.addNotification(
      this.i18n.translate("executionDateProposed", {
        id: requestId.toString(),
      })
    );

    // Notificação enhanced para o cliente (banco de dados)
    if (request.client_id) {
      await this.notificationService.createEnhancedNotification(
        request.client_id,
        "execution_date_proposal",
        this.i18n.translate("newExecutionDateProposed"),
        this.i18n.translate("executionDateProposedMessage", {
          date: proposedDate.toLocaleDateString(),
          time: proposedDate.toLocaleTimeString(),
          notes: notes || "",
        }),
        {
          serviceRequestId: requestId,
          actionRequired: true,
          priority: "high",
        }
      );
    }
  }

  async respondToExecutionDate(
    requestId: number,
    approved: boolean,
    rejectionReason?: string
  ) {
    // Buscar o request para obter informações
    const request = this.serviceRequests().find((r) => r.id === requestId);
    if (!request) {
      console.error("Request não encontrado:", requestId);
      return;
    }

    const updates: Partial<ServiceRequest> = {
      execution_date_approval: approved ? "approved" : "rejected",
      execution_date_approved_at: new Date().toISOString(),
      execution_date_rejection_reason: approved ? null : rejectionReason,
      status: approved
        ? "Data aprovada pelo cliente"
        : ("Data rejeitada pelo cliente" as ServiceStatus),
    };

    // Se aprovado, copiar data proposta para agendamento
    if (approved) {
      if (request?.proposed_execution_date) {
        updates.scheduled_start_datetime = request.proposed_execution_date;
        updates.status = "Agendado" as ServiceStatus;
      }
    }

    await this.updateServiceRequest(requestId, updates);

    // Notificação local para o cliente
    this.notificationService.addNotification(
      this.i18n.translate(
        approved ? "executionDateApproved" : "executionDateRejected",
        { id: requestId.toString() }
      )
    );

    // Notificação enhanced para o admin/profissional
    const notificationType = approved
      ? "execution_date_approved"
      : "execution_date_rejected";
    const titleKey = approved
      ? "executionDateApprovedByClient"
      : "executionDateRejectedByClient";
    const messageKey = approved
      ? "executionDateApprovedMessage"
      : "executionDateRejectedMessage";

    // Notificar admin
    const adminUsers = this.users().filter((u) => u.role === "admin");
    for (const admin of adminUsers) {
      await this.notificationService.createEnhancedNotification(
        admin.id,
        notificationType,
        this.i18n.translate(titleKey),
        this.i18n.translate(messageKey, {
          requestId: requestId.toString(),
          reason: rejectionReason || "",
        }),
        {
          serviceRequestId: requestId,
          actionRequired: !approved,
          priority: approved ? "medium" : "high",
        }
      );
    }

    // Notificar profissional se existir
    if (request.professional_id) {
      await this.notificationService.createEnhancedNotification(
        request.professional_id,
        notificationType,
        this.i18n.translate(titleKey),
        this.i18n.translate(messageKey, {
          requestId: requestId.toString(),
          reason: rejectionReason || "",
        }),
        {
          serviceRequestId: requestId,
          actionRequired: false,
          priority: "medium",
        }
      );
    }
  }

  async updatePaymentStatus(requestId: number, paymentStatus: PaymentStatus) {
    await this.updateServiceRequest(requestId, {
      payment_status: paymentStatus,
    });
    this.notificationService.addNotification(
      this.i18n.translate("paymentStatusChanged", {
        id: requestId.toString(),
        status: paymentStatus,
      })
    );
  }

  async updateUser(userId: number, updates: Partial<User>) {
    const { error } = await this.supabase.client
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (error) {
      this.notificationService.addNotification(
        "Error updating user: " + error.message
      );
    } else {
      // Refresh users data
      await this.fetchUsers();

      // Notify about user updates
      if (updates.status) {
        this.notificationService.addNotification(
          this.i18n.translate("userStatusUpdated", {
            id: userId.toString(),
            status: updates.status,
          })
        );
      }
    }
  }

  getProfessionalsByCategory(category: ServiceCategory): User[] {
    return this.users().filter(
      (user) =>
        user.role === "professional" &&
        user.status === "Active" &&
        (user.specialties?.includes(category) || !user.specialties?.length)
    );
  }

  async fetchChatMessages(requestId: number) {
    const { data, error } = await this.supabase.client
      .from("chat_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("timestamp", { ascending: true });

    if (error) {
      this.notificationService.addNotification(
        "Error fetching messages: " + error.message
      );
    } else {
      this.chatMessages.set(data as ChatMessage[]);
    }
  }

  async addChatMessage(requestId: number, senderId: number, text: string) {
    const currentUser = this.authService.appUser();
    if (!currentUser) return;

    const newMessage = {
      request_id: requestId,
      sender_id: senderId,
      sender_auth_id: currentUser.auth_id,
      text: text,
      timestamp: new Date().toISOString(),
    };

    const { error } = await this.supabase.client
      .from("chat_messages")
      .insert(newMessage);

    if (error) {
      this.notificationService.addNotification(
        "Error sending message: " + error.message
      );
    }
  }

  private listenToServiceRequestChanges() {
    this.supabase.client
      .channel("public:service_requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => {
          const user = this.authService.appUser();
          if (user) {
            this.fetchServiceRequests(user);
          }
        }
      )
      .subscribe();
  }

  private listenToUserChanges() {
    this.supabase.client
      .channel("public:users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => {
          this.fetchUsers();
        }
      )
      .subscribe();
  }

  // ==========================================
  // NOVOS MÉTODOS PARA CONTROLE DE AGENDAMENTO E TEMPO
  // ==========================================

  /**
   * Atualiza a data e hora solicitada pelo cliente
   */
  async updateRequestedDateTime(requestId: number, requestedDateTime: Date) {
    const updates = {
      requested_datetime: requestedDateTime.toISOString(),
    };

    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Data solicitada para o pedido #${requestId} foi atualizada.`
    );
  }

  /**
   * Agenda o início do serviço (usado pelo administrador)
   */
  async scheduleServiceStart(
    requestId: number,
    professionalId: number,
    scheduledStartDateTime: Date,
    estimatedDurationMinutes: number
  ) {
    const updates = {
      professional_id: professionalId,
      scheduled_start_datetime: scheduledStartDateTime.toISOString(),
      estimated_duration_minutes: estimatedDurationMinutes,
      status: "Scheduled" as ServiceStatus,
    };

    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Serviço #${requestId} foi agendado para ${scheduledStartDateTime.toLocaleDateString()} às ${scheduledStartDateTime.toLocaleTimeString()}.`
    );
  }

  /**
   * Registra o início real do atendimento (usado pelo profissional)
   */
  async startServiceWork(requestId: number) {
    const updates = {
      actual_start_datetime: new Date().toISOString(),
      status: "Em execução" as ServiceStatus,
    };

    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Atendimento do serviço #${requestId} foi iniciado.`
    );
  }

  /**
   * Registra o final real do atendimento (usado pelo profissional)
   */
  async finishServiceWork(requestId: number) {
    const updates = {
      actual_end_datetime: new Date().toISOString(),
      status: "Concluído - Aguardando aprovação" as ServiceStatus,
    };

    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Atendimento do serviço #${requestId} foi finalizado.`
    );
  }

  /**
   * Atualiza a previsão de duração (usado pelo administrador)
   */
  async updateEstimatedDuration(
    requestId: number,
    estimatedDurationMinutes: number
  ) {
    const updates = {
      estimated_duration_minutes: estimatedDurationMinutes,
    };

    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Previsão de duração do serviço #${requestId} foi atualizada para ${estimatedDurationMinutes} minutos.`
    );
  }

  /**
   * Calcula a duração real do serviço em minutos
   */
  calculateActualDuration(request: ServiceRequest): number | null {
    if (!request.actual_start_datetime || !request.actual_end_datetime) {
      return null;
    }

    const start = new Date(request.actual_start_datetime);
    const end = new Date(request.actual_end_datetime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Calcula a variação entre duração estimada e real
   */
  calculateDurationVariance(request: ServiceRequest): number | null {
    const actualDuration = this.calculateActualDuration(request);
    if (!actualDuration || !request.estimated_duration_minutes) {
      return null;
    }

    return actualDuration - request.estimated_duration_minutes;
  }

  /**
   * Determina o status do agendamento
   */
  getSchedulingStatus(request: ServiceRequest): SchedulingStatus {
    const now = new Date();

    // Se o serviço está concluído
    if (request.status === "Finalizado" && request.actual_end_datetime) {
      return "Completed";
    }

    // Se o serviço está em progresso
    if (request.actual_start_datetime && !request.actual_end_datetime) {
      return "In Progress";
    }

    // Se o serviço está atrasado
    if (
      request.scheduled_start_datetime &&
      !request.actual_start_datetime &&
      new Date(request.scheduled_start_datetime).getTime() + 30 * 60 * 1000 <
        now.getTime()
    ) {
      return "Delayed";
    }

    // Se o serviço está agendado para hoje
    if (request.scheduled_start_datetime) {
      const scheduledDate = new Date(request.scheduled_start_datetime);
      const today = new Date();
      if (scheduledDate.toDateString() === today.toDateString()) {
        return "Scheduled Today";
      }
    }

    // Se o serviço está agendado para o futuro
    if (
      request.scheduled_start_datetime &&
      new Date(request.scheduled_start_datetime) > now
    ) {
      return "Scheduled";
    }

    // Se tem data solicitada mas não agendada
    if (request.requested_datetime && !request.scheduled_start_datetime) {
      return "Awaiting Schedule";
    }

    return "Pending";
  }

  /**
   * Obtém pedidos agendados para hoje
   */
  getTodayScheduledRequests(): ServiceRequest[] {
    const today = new Date();
    return this.serviceRequests().filter((request) => {
      if (!request.scheduled_start_datetime) return false;
      const scheduledDate = new Date(request.scheduled_start_datetime);
      return scheduledDate.toDateString() === today.toDateString();
    });
  }

  /**
   * Obtém pedidos atrasados
   */
  getDelayedRequests(): ServiceRequest[] {
    return this.serviceRequests().filter(
      (request) => this.getSchedulingStatus(request) === "Delayed"
    );
  }

  /**
   * Obtém relatório de produtividade dos profissionais
   */
  getProfessionalProductivityReport(): Array<{
    professional_id: number;
    professional_name: string;
    completed_services: number;
    average_duration_minutes: number;
    on_time_percentage: number;
  }> {
    const professionals = this.users().filter((u) => u.role === "professional");

    return professionals.map((professional) => {
      const services = this.serviceRequests().filter(
        (r) =>
          r.professional_id === professional.id && r.status === "Finalizado"
      );

      const completedServices = services.length;
      let totalDuration = 0;
      let onTimeCount = 0;

      services.forEach((service) => {
        const actualDuration = this.calculateActualDuration(service);
        if (actualDuration) {
          totalDuration += actualDuration;
        }

        // Considera "no horário" se iniciou dentro de 15 minutos do agendado
        if (service.scheduled_start_datetime && service.actual_start_datetime) {
          const scheduled = new Date(service.scheduled_start_datetime);
          const actual = new Date(service.actual_start_datetime);
          const diffMinutes =
            (actual.getTime() - scheduled.getTime()) / (1000 * 60);
          if (Math.abs(diffMinutes) <= 15) {
            onTimeCount++;
          }
        }
      });

      return {
        professional_id: professional.id,
        professional_name: professional.name,
        completed_services: completedServices,
        average_duration_minutes:
          completedServices > 0
            ? Math.round(totalDuration / completedServices)
            : 0,
        on_time_percentage:
          completedServices > 0
            ? Math.round((onTimeCount / completedServices) * 100)
            : 0,
      };
    });
  }

  // ==========================================
  // MÉTODOS PARA ESCLARECIMENTOS (DÚVIDAS E RESPOSTAS)
  // ==========================================

  // Signal para armazenar esclarecimentos
  readonly serviceClarifications = signal<ServiceClarification[]>([]);

  /**
   * Buscar esclarecimentos de uma solicitação específica
   */
  async fetchServiceClarifications(serviceRequestId: number) {
    const { data, error } = await this.supabase.client
      .from("service_clarifications_with_user")
      .select("*")
      .eq("service_request_id", serviceRequestId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching service clarifications:", error);
      this.notificationService.addNotification(
        "Erro ao buscar esclarecimentos: " + error.message
      );
      return [];
    } else {
      const clarifications = data as ServiceClarification[];
      this.serviceClarifications.set(clarifications);
      return clarifications;
    }
  }

  /**
   * Adicionar uma nova pergunta
   */
  async addClarificationQuestion(
    serviceRequestId: number,
    title: string,
    content: string
  ) {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const newQuestion = {
      service_request_id: serviceRequestId,
      user_id: currentUser.id,
      type: "question" as const,
      title: title,
      content: content,
      is_read: false,
    };

    const { data, error } = await this.supabase.client
      .from("service_clarifications")
      .insert(newQuestion)
      .select()
      .single();

    if (error) {
      console.error("Error adding clarification question:", error);
      this.notificationService.addNotification(
        "Erro ao adicionar pergunta: " + error.message
      );
      throw error;
    } else {
      this.notificationService.addNotification(
        "Pergunta adicionada com sucesso!"
      );

      // Recarregar esclarecimentos
      await this.fetchServiceClarifications(serviceRequestId);

      // Criar notificação para outros participantes
      await this.createClarificationNotification(
        serviceRequestId,
        "clarification_requested",
        "Nova pergunta adicionada",
        `${currentUser.name} fez uma nova pergunta: ${title}`
      );

      return data;
    }
  }

  /**
   * Adicionar uma resposta a uma pergunta
   */
  async addClarificationAnswer(
    serviceRequestId: number,
    parentId: number,
    title: string,
    content: string
  ) {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const newAnswer = {
      service_request_id: serviceRequestId,
      user_id: currentUser.id,
      parent_id: parentId,
      type: "answer" as const,
      title: title,
      content: content,
      is_read: false,
    };

    const { data, error } = await this.supabase.client
      .from("service_clarifications")
      .insert(newAnswer)
      .select()
      .single();

    if (error) {
      console.error("Error adding clarification answer:", error);
      this.notificationService.addNotification(
        "Erro ao adicionar resposta: " + error.message
      );
      throw error;
    } else {
      this.notificationService.addNotification(
        "Resposta adicionada com sucesso!"
      );

      // Recarregar esclarecimentos
      await this.fetchServiceClarifications(serviceRequestId);

      // Criar notificação para outros participantes
      await this.createClarificationNotification(
        serviceRequestId,
        "clarification_provided",
        "Nova resposta adicionada",
        `${currentUser.name} respondeu: ${title}`
      );

      return data;
    }
  }

  /**
   * Marcar esclarecimentos como lidos para o usuário atual
   */
  async markClarificationsAsRead(serviceRequestId: number) {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      return;
    }

    // Chamar função do banco para marcar como lidas
    const { data, error } = await this.supabase.client.rpc(
      "mark_clarifications_as_read",
      {
        req_id: serviceRequestId,
        reader_user_id: currentUser.id,
      }
    );

    if (error) {
      console.error("Error marking clarifications as read:", error);
    } else {
      console.log(`Marked ${data} clarifications as read`);
      // Recarregar esclarecimentos para refletir mudanças
      await this.fetchServiceClarifications(serviceRequestId);
    }
  }

  /**
   * Contar esclarecimentos não lidos para uma solicitação
   */
  async countUnreadClarifications(serviceRequestId: number): Promise<number> {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      return 0;
    }

    const { data, error } = await this.supabase.client.rpc(
      "count_unread_clarifications",
      {
        req_id: serviceRequestId,
        reader_user_id: currentUser.id,
      }
    );

    if (error) {
      console.error("Error counting unread clarifications:", error);
      return 0;
    }

    return data || 0;
  }

  /**
   * Deletar um esclarecimento (apenas o próprio usuário)
   */
  async deleteClarification(clarificationId: number, serviceRequestId: number) {
    const { error } = await this.supabase.client
      .from("service_clarifications")
      .delete()
      .eq("id", clarificationId);

    if (error) {
      console.error("Error deleting clarification:", error);
      this.notificationService.addNotification(
        "Erro ao deletar esclarecimento: " + error.message
      );
      throw error;
    } else {
      this.notificationService.addNotification(
        "Esclarecimento deletado com sucesso!"
      );

      // Recarregar esclarecimentos
      await this.fetchServiceClarifications(serviceRequestId);
    }
  }

  /**
   * Criar notificação para esclarecimentos
   */
  private async createClarificationNotification(
    serviceRequestId: number,
    type: "clarification_requested" | "clarification_provided",
    title: string,
    message: string
  ) {
    try {
      // Buscar participantes da solicitação (cliente e profissional)
      const serviceRequest = this.getServiceRequestById(serviceRequestId);
      if (!serviceRequest) return;

      const currentUser = this.authService.appUser();
      if (!currentUser) return;

      // Criar notificações para outros participantes
      const participants = [serviceRequest.client_id];
      if (serviceRequest.professional_id) {
        participants.push(serviceRequest.professional_id);
      }

      // Filtrar para não notificar o próprio usuário
      const recipientIds = participants.filter((id) => id !== currentUser.id);

      for (const userId of recipientIds) {
        await this.supabase.client.from("enhanced_notifications").insert({
          user_id: userId,
          type: type,
          title: title,
          message: message,
          service_request_id: serviceRequestId,
          action_required: true,
          priority: "medium",
        });
      }
    } catch (error) {
      console.error("Error creating clarification notification:", error);
    }
  }

  /**
   * Obter esclarecimentos organizados por thread (pergunta e suas respostas)
   */
  getClarificationThreads(serviceRequestId: number): any[] {
    const clarifications = this.serviceClarifications();
    const questions = clarifications.filter(
      (c) => c.service_request_id === serviceRequestId && c.type === "question"
    );

    return questions.map((question) => ({
      question,
      answers: clarifications.filter((c) => c.parent_id === question.id),
    }));
  }
}
