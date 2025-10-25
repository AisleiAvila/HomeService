import { inject, Injectable, signal } from "@angular/core";
import {
  ChatMessage,
  PaymentStatus,
  SchedulingStatus,
  ServiceCategory,
  ServiceSubcategory,
  ServiceSubcategoryExtended,
  ServiceClarification,
  ServiceRequest,
  ServiceRequestPayload,
  ServiceStatus,
  User,
} from "../models/maintenance.models";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { I18nService } from "../i18n.service";
import { StatusService } from "../services/status.service";
import { statusServiceToServiceStatus } from "../utils/status-mapping.util";

@Injectable({
  providedIn: "root",
})
export class DataService {
  /** Consulta tabela codigos_postais e retorna dados do endere├ºo */
  async getPostalCodeInfo(postalCode: string): Promise<{
    localidade: string;
    distrito: string;
    concelho: string;
    arteria_completa?: string;
  } | null> {
    // Normaliza para formato 'XXXX-XXX'
    let normalized = postalCode.replace(/\D/g, "");
    if (normalized.length === 7) {
      normalized = normalized.slice(0, 4) + "-" + normalized.slice(4);
    } else if (normalized.length === 8) {
      normalized = normalized.slice(0, 4) + "-" + normalized.slice(4, 7);
    }
    console.log("[getPostalCodeInfo] Valor recebido:", postalCode);
    console.log("[getPostalCodeInfo] Valor normalizado:", normalized);
    console.log("[getPostalCodeInfo] Query:", {
      table: "vw_enderecos_completos",
      select:
        "id, codigo_postal, distrito, concelho, localidade, designacao_postal, tipo_arteria, arteria_completa, local_arteria, porta, cliente",
      where: { codigo_postal: normalized },
    });
    const { data, error } = await this.supabase.client
      .from("vw_enderecos_completos")
      .select(
        "id, codigo_postal, distrito, concelho, localidade, designacao_postal, tipo_arteria, arteria_completa, local_arteria, porta, cliente"
      )
      .eq("codigo_postal", normalized)
      .limit(1)
      .single();
    console.log("[getPostalCodeInfo] Resultado Supabase:", { data, error });
    if (error || !data) {
      return null;
    }
    return {
      localidade: data.localidade || "",
      distrito: data.distrito || "",
      concelho: data.concelho || "",
      arteria_completa: data.arteria_completa || "",
    };
  }
  private i18n = inject(I18nService);
  private supabase = inject(SupabaseService);
  private notificationService = inject(NotificationService);
  // Exposed intentionally for some components that access auth via dataService.authService
  public readonly authService = inject(AuthService);

  // Signals para dados principais
  readonly users = signal<User[]>([]);
  readonly serviceRequests = signal<ServiceRequest[]>([]);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly categories = signal<ServiceCategory[]>([]);
  readonly subcategories = signal<ServiceSubcategoryExtended[]>([]);

  /** Adiciona uma nova subcategoria de serviço */
  async addSubcategory(
    name: string,
    category_id: number,
    options?: {
      type?: "precificado" | "orçado";
      average_time_minutes?: number | null;
      price?: number | null;
      description?: string | null;
    }
  ): Promise<ServiceSubcategoryExtended | null> {
    const payload: any = { name, category_id };
    if (options) {
      if (options.type !== undefined) payload.type = options.type;
      if (options.average_time_minutes !== undefined)
        payload.average_time_minutes = options.average_time_minutes ?? null;
      if (options.price !== undefined) payload.price = options.price ?? null;
      if (options.description !== undefined)
        payload.description = options.description ?? null;
    }

    const { data, error } = await this.supabase.client
      .from("service_subcategories")
      .insert(payload)
      .select(
        "id, name, category_id, type, average_time_minutes, price, description"
      )
      .single();

    if (error) {
      this.notificationService.addNotification(
        "Erro ao criar subcategoria: " + error.message
      );
      return null;
    }
    if (data) {
      const raw = data as any;
      const created: ServiceSubcategoryExtended = {
        ...raw,
        category_id:
          typeof raw.category_id === "string"
            ? parseInt(raw.category_id, 10)
            : raw.category_id,
        average_time_minutes:
          raw.average_time_minutes === undefined
            ? null
            : raw.average_time_minutes,
        price: raw.price === undefined ? null : raw.price,
      };
      this.subcategories.update((s) => [...s, created]);
      this.notificationService.addNotification(
        "Subcategoria criada com sucesso!"
      );
      return created;
    }
    return null;
  }

  /** Atualiza o nome de uma subcategoria de serviço */
  async updateSubcategory(
    id: number,
    updates: {
      name?: string;
      type?: "precificado" | "orçado" | null;
      average_time_minutes?: number | null;
      price?: number | null;
      description?: string | null;
    }
  ): Promise<ServiceSubcategoryExtended | null> {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.average_time_minutes !== undefined)
      payload.average_time_minutes = updates.average_time_minutes;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.description !== undefined)
      payload.description = updates.description;

    const { data, error } = await this.supabase.client
      .from("service_subcategories")
      .update(payload)
      .eq("id", id)
      .select(
        "id, name, category_id, type, average_time_minutes, price, description"
      )
      .single();

    if (error) {
      this.notificationService.addNotification(
        "Erro ao atualizar subcategoria: " + error.message
      );
      return null;
    }
    if (data) {
      const raw = data as any;
      const updated: ServiceSubcategoryExtended = {
        ...raw,
        category_id:
          typeof raw.category_id === "string"
            ? parseInt(raw.category_id, 10)
            : raw.category_id,
        average_time_minutes:
          raw.average_time_minutes === undefined
            ? null
            : raw.average_time_minutes,
        price: raw.price === undefined ? null : raw.price,
      };
      this.subcategories.update((s) =>
        s.map((sc) => (sc.id === id ? updated : sc))
      );
      this.notificationService.addNotification(
        "Subcategoria atualizada com sucesso!"
      );
      return updated;
    }
    return null;
  }

  /** Remove uma subcategoria de servi├ºo */
  async deleteSubcategory(id: number): Promise<boolean> {
    const { error } = await this.supabase.client
      .from("service_subcategories")
      .delete()
      .eq("id", id);

    if (error) {
      this.notificationService.addNotification(
        "Erro ao remover subcategoria: " + error.message
      );
      return false;
    }
    // Atualiza signal local
    const updated = this.subcategories().filter((sub) => sub.id !== id);
    this.subcategories.set(updated);
    this.notificationService.addNotification(
      "Subcategoria removida com sucesso!"
    );
    return true;
  }

  /** Remove uma categoria de servi├ºo */
  async deleteCategory(id: number): Promise<boolean> {
    const { error } = await this.supabase.client
      .from("service_categories")
      .delete()
      .eq("id", id);

    if (error) {
      this.notificationService.addNotification(
        "Erro ao remover categoria: " + error.message
      );
      return false;
    }
    // Atualiza signal local
    const updated = this.categories().filter((cat) => cat.id !== id);
    this.categories.set(updated);
    this.notificationService.addNotification("Categoria removida com sucesso!");
    return true;
  }

  /** Adiciona uma nova categoria de servi├ºo */
  async addCategory(name: string): Promise<ServiceCategory | null> {
    const { data, error } = await this.supabase.client
      .from("service_categories")
      .insert({ name })
      .select("id, name")
      .single();

    if (error) {
      this.notificationService.addNotification(
        "Erro ao criar categoria: " + error.message
      );
      return null;
    }
    if (data) {
      // Atualiza signal local
      const updated = [...this.categories(), data as ServiceCategory];
      this.categories.set(updated);
      this.notificationService.addNotification("Categoria criada com sucesso!");
      return data as ServiceCategory;
    }
    return null;
  }
  /** Atualiza o nome de uma categoria de servi├ºo */
  async updateCategory(
    id: number,
    name: string
  ): Promise<ServiceCategory | null> {
    const { data, error } = await this.supabase.client
      .from("service_categories")
      .update({ name })
      .eq("id", id)
      .select("id, name")
      .single();

    if (error) {
      this.notificationService.addNotification(
        "Erro ao atualizar categoria: " + error.message
      );
      return null;
    }
    if (data) {
      // Atualiza signal local
      const updated = this.categories().map((cat) =>
        cat.id === id ? { ...cat, name: data.name } : cat
      );
      this.categories.set(updated);
      this.notificationService.addNotification(
        "Categoria atualizada com sucesso!"
      );
      return data as ServiceCategory;
    }
    return null;
  }

  /** Auxiliar para atualizar status usando StatusService enum */
  private setServiceStatus(requestId: number, status: StatusService) {
    this.updateServiceRequest(requestId, {
      status: statusServiceToServiceStatus[status],
    });
  }

  constructor() {
    this.listenToServiceRequestChanges();
    this.listenToUserChanges();
  }

  async loadInitialData(currentUser: User) {
    await this.fetchUsers();
    await this.fetchServiceRequests(currentUser);
    await this.fetchCategories();
    await this.fetchSubcategories();
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
      // For├ºar tipo integer
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
      console.log(
        "Error fetching service requests from Supabase, keeping sample data:",
        error.message
      );
      this.notificationService.addNotification(
        "Using sample data - Error fetching service requests: " + error.message
      );
    } else {
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
      .select("id, name")
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
      this.categories.set(data as ServiceCategory[]);
    } else {
      console.log("No categories found in Supabase, keeping sample data");
    }
  }

  private async fetchSubcategories() {
    const { data, error } = await this.supabase.client
      .from("service_subcategories")
      .select(
        "id, name, category_id, type, average_time_minutes, price, description"
      )
      .order("name");

    if (error) {
      console.log("Error fetching subcategories from Supabase:", error.message);
      this.notificationService.addNotification(
        "Erro ao buscar subcategorias: " + error.message
      );
    }
    // Always log raw response for debugging (helps diagnose RLS / empty result)
    try {
      console.debug("[DataService] fetchSubcategories raw response:", {
        data,
        error,
        currentUserId: this.authService?.appUser?.()?.id ?? null,
      });
    } catch (e) {
      // ignore
    }

    if (data && data.length > 0) {
      // Normaliza tipos vindos do Supabase: category_id pode vir como string
      const normalized = (data as any[]).map((d) => ({
        ...d,
        category_id:
          typeof d.category_id === "string"
            ? parseInt(d.category_id, 10)
            : d.category_id,
        average_time_minutes:
          d.average_time_minutes === undefined ? null : d.average_time_minutes,
        price: d.price === undefined ? null : d.price,
      }));
      // Debugging info: quantidade carregada e amostra de tipos
      try {
        console.debug(
          `[DataService] fetchSubcategories loaded ${normalized.length} items`
        );
        if (normalized.length > 0) {
          const sample = normalized.slice(0, 5).map((s) => ({
            id: s.id,
            category_id_type: typeof s.category_id,
            category_id_value: s.category_id,
          }));
          console.debug("[DataService] subcategories sample types:", sample);
        }
      } catch (e) {
        /* ignore logging errors */
      }
      this.subcategories.set(normalized as ServiceSubcategoryExtended[]);
    } else {
      console.log("No subcategories found in Supabase.");
    }
  }

  async addServiceRequest(payload: ServiceRequestPayload) {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Usar requested_datetime (agora obrigat├│rio)
    const requestedDateTime = payload.requested_datetime;

    const { StatusService } = await import("../services/status.service");
    const newRequestData: any = {
      client_id: currentUser.id,
      client_auth_id: currentUser.auth_id,
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      subcategory_id: payload.subcategory_id, // Agora é obrigatório
      street: payload.address.street,
      city: payload.address.city,
      state: payload.address.state,
      zip_code: payload.address.zip_code,
      requested_datetime: requestedDateTime, // Campo principal
      status: StatusService.Requested,
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
    const status = approved
      ? StatusService.QuoteApproved
      : StatusService.QuoteRejected;
    this.setServiceStatus(requestId, status);
    this.notificationService.addNotification(
      `Or├ºamento do pedido #${requestId} foi ${
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
      status: statusServiceToServiceStatus[StatusService.Scheduled],
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Service request #${requestId} has been scheduled.`
    );
  }

  // Novos m├®todos para controle de data de execu├º├úo
  async proposeExecutionDate(
    requestId: number,
    proposedDate: Date,
    notes?: string
  ) {
    const request = this.serviceRequests().find((r) => r.id === requestId);
    if (!request) {
      console.error("Request n├úo encontrado:", requestId);
      return;
    }
    const updates: Partial<ServiceRequest> = {
      proposed_execution_date: proposedDate.toISOString(),
      proposed_execution_notes: notes || null,
      execution_date_proposed_at: new Date().toISOString(),
      status: statusServiceToServiceStatus[StatusService.DateProposedByAdmin],
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      this.i18n.translate("executionDateProposed", {
        id: requestId.toString(),
      })
    );
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
    const request = this.serviceRequests().find((r) => r.id === requestId);
    if (!request) {
      console.error("Request n├úo encontrado:", requestId);
      return;
    }
    const updates: Partial<ServiceRequest> = {
      execution_date_approval: approved ? "approved" : "rejected",
      execution_date_approved_at: new Date().toISOString(),
      execution_date_rejection_reason: approved ? null : rejectionReason,
      status: approved
        ? statusServiceToServiceStatus[StatusService.DateApprovedByClient]
        : statusServiceToServiceStatus[StatusService.DateRejectedByClient],
    };
    if (approved && request?.proposed_execution_date) {
      updates.scheduled_start_datetime = request.proposed_execution_date;
      updates.status = statusServiceToServiceStatus[StatusService.Scheduled];
    }
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      this.i18n.translate(
        approved ? "executionDateApproved" : "executionDateRejected",
        { id: requestId.toString() }
      )
    );
    const notificationType = approved
      ? "execution_date_approved"
      : "execution_date_rejected";
    const titleKey = approved
      ? "executionDateApprovedByClient"
      : "executionDateRejectedByClient";
    const messageKey = approved
      ? "executionDateApprovedMessage"
      : "executionDateRejectedMessage";
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
  // NOVOS M├ëTODOS PARA CONTROLE DE AGENDAMENTO E TEMPO
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
   * Agenda o in├¡cio do servi├ºo (usado pelo administrador)
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
      status: statusServiceToServiceStatus[StatusService.Scheduled],
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Servi├ºo #${requestId} foi agendado para ${scheduledStartDateTime.toLocaleDateString()} ├ás ${scheduledStartDateTime.toLocaleTimeString()}.`
    );
  }

  /**
   * Registra o in├¡cio real do atendimento (usado pelo profissional)
   */
  async startServiceWork(requestId: number) {
    const updates = {
      actual_start_datetime: new Date().toISOString(),
      status: statusServiceToServiceStatus[StatusService.InProgress],
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Atendimento do servi├ºo #${requestId} foi iniciado.`
    );
  }

  /**
   * Registra o final real do atendimento (usado pelo profissional)
   */
  async finishServiceWork(requestId: number) {
    const updates = {
      actual_end_datetime: new Date().toISOString(),
      status:
        statusServiceToServiceStatus[StatusService.CompletedAwaitingApproval],
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Atendimento do servi├ºo #${requestId} foi finalizado.`
    );
  }

  /**
   * Atualiza a previs├úo de dura├º├úo (usado pelo administrador)
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
      `Previs├úo de dura├º├úo do servi├ºo #${requestId} foi atualizada para ${estimatedDurationMinutes} minutos.`
    );
  }

  /**
   * Calcula a dura├º├úo real do servi├ºo em minutos
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
   * Calcula a varia├º├úo entre dura├º├úo estimada e real
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

    // Se o servi├ºo est├í conclu├¡do
    if (request.status === "Finalizado" && request.actual_end_datetime) {
      return "Completed";
    }

    // Se o servi├ºo est├í em progresso
    if (request.actual_start_datetime && !request.actual_end_datetime) {
      return "In Progress";
    }

    // Se o servi├ºo est├í atrasado
    if (
      request.scheduled_start_datetime &&
      !request.actual_start_datetime &&
      new Date(request.scheduled_start_datetime).getTime() + 30 * 60 * 1000 <
        now.getTime()
    ) {
      return "Delayed";
    }

    // Se o servi├ºo est├í agendado para hoje
    if (request.scheduled_start_datetime) {
      const scheduledDate = new Date(request.scheduled_start_datetime);
      const today = new Date();
      if (scheduledDate.toDateString() === today.toDateString()) {
        return "Scheduled Today";
      }
    }

    // Se o servi├ºo est├í agendado para o futuro
    if (
      request.scheduled_start_datetime &&
      new Date(request.scheduled_start_datetime) > now
    ) {
      return "Scheduled";
    }

    // Se tem data solicitada mas n├úo agendada
    if (request.requested_datetime && !request.scheduled_start_datetime) {
      return "Awaiting Schedule";
    }

    return "Pending";
  }

  /**
   * Obt├®m pedidos agendados para hoje
   */
  getTodayScheduledRequests(): ServiceRequest[] {
    const today = new Date();
    const allRequests = this.serviceRequests();
    console.log("[AGENDA] serviceRequests sinal:", allRequests);
    const todayRequests = allRequests.filter((request) => {
      if (!request.scheduled_start_datetime) return false;
      const scheduledDate = new Date(request.scheduled_start_datetime);
      return scheduledDate.toDateString() === today.toDateString();
    });
    console.log("[AGENDA] Pedidos agendados para hoje:", todayRequests);
    return todayRequests;
  }

  /**
   * Obt├®m pedidos atrasados
   */
  getDelayedRequests(): ServiceRequest[] {
    return this.serviceRequests().filter(
      (request) => this.getSchedulingStatus(request) === "Delayed"
    );
  }

  /**
   * Obt├®m relat├│rio de produtividade dos profissionais
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

        // Considera "no hor├írio" se iniciou dentro de 15 minutos do agendado
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
  // M├ëTODOS PARA ESCLARECIMENTOS (D├ÜVIDAS E RESPOSTAS)
  // ==========================================

  // Signal para armazenar esclarecimentos
  readonly serviceClarifications = signal<ServiceClarification[]>([]);

  /**
   * Buscar esclarecimentos de uma solicita├º├úo espec├¡fica
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

      // Criar notifica├º├úo para outros participantes
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

      // Criar notifica├º├úo para outros participantes
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
   * Marcar esclarecimentos como lidos para o usu├írio atual
   */
  async markClarificationsAsRead(serviceRequestId: number) {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      return;
    }

    // Chamar fun├º├úo do banco para marcar como lidas
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
      // Recarregar esclarecimentos para refletir mudan├ºas
      await this.fetchServiceClarifications(serviceRequestId);
    }
  }

  /**
   * Contar esclarecimentos n├úo lidos para uma solicita├º├úo
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
   * Deletar um esclarecimento (apenas o pr├│prio usu├írio)
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
   * Criar notifica├º├úo para esclarecimentos
   */
  private async createClarificationNotification(
    serviceRequestId: number,
    type: "clarification_requested" | "clarification_provided",
    title: string,
    message: string
  ) {
    try {
      // Buscar participantes da solicita├º├úo (cliente e profissional)
      const serviceRequest = this.getServiceRequestById(serviceRequestId);
      if (!serviceRequest) return;

      const currentUser = this.authService.appUser();
      if (!currentUser) return;

      // Criar notifica├º├Áes para outros participantes
      const participants = [serviceRequest.client_id];
      if (serviceRequest.professional_id) {
        participants.push(serviceRequest.professional_id);
      }

      // Filtrar para n├úo notificar o pr├│prio usu├írio
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
