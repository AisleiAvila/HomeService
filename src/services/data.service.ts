import { inject, Injectable, signal } from "@angular/core";

import { AdminServiceRequestPayload } from "../components/admin-service-request-form/admin-service-request-form.component";
import { I18nService } from "../i18n.service";
import {
  ChatMessage,
  PaymentStatus,
  SchedulingStatus,
  ServiceCategory,
  ServiceClarification,
  ServiceRequest,
  ServiceRequestPayload,
  ServiceSubcategoryExtended,
  User,
  UserStatus,
  ServiceRequestOrigin
} from "../models/maintenance.models";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { PortugalAddressDatabaseService } from "./portugal-address-database.service";

import { environment } from "../environments/environment";

@Injectable({
  providedIn: "root",
})
export class DataService {
  // Signal global de loading para dashboard e fetchs
  readonly isLoading = signal(false);
            /**
             * Recarrega as solicitações de serviço para o usuário atual
             */
  async reloadServiceRequests(): Promise<void> {
    const currentUser = this.authService.appUser();
    if (currentUser) {
      this.isLoading.set(true);
      try {
        await this.fetchServiceRequests(currentUser);
      } finally {
        this.isLoading.set(false);
      }
    }
  }
          /**
           * Subscrição em tempo real para mensagens do chat de uma solicitação de serviço
           */
          private chatSubscription: any = null;

          listenToChatMessages(requestId: number) {
            // Cancela subscrição anterior, se houver
            if (this.chatSubscription) {
              this.supabase.client.removeChannel(this.chatSubscription);
              this.chatSubscription = null;
            }
            this.chatSubscription = this.supabase.client
              .channel(`public:chat_messages:${requestId}`)
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'chat_messages', filter: `request_id=eq.${requestId}` },
                (payload) => {
                  // Sempre recarrega as mensagens do chat para garantir consistência
                  this.fetchChatMessages(requestId);
                }
              )
              .subscribe();
            
            // Retorna a subscription para permitir cleanup
            return this.chatSubscription;
          }
        // Signals para origens de solicitação de serviço
        readonly origins = signal<ServiceRequestOrigin[]>([]);

        /** Busca todas as origens de solicitação de serviço */
        async fetchOrigins(): Promise<void> {
          const { data, error } = await this.supabase.client
            .from("service_request_origins")
            .select("*")
            .order("name");
          if (error) {
            this.notificationService.addNotification(
              "Erro ao buscar origens: " + error.message
            );
            return;
          }
          this.origins.set(data || []);
        }

        /** Adiciona uma nova origem */
        async addOrigin(name: string): Promise<boolean> {
          const { error } = await this.supabase.client
            .from("service_request_origins")
            .insert({ name });
          if (error) {
            this.notificationService.addNotification(
              "Erro ao adicionar origem: " + error.message
            );
            return false;
          }
          await this.fetchOrigins();
          return true;
        }

        /** Remove uma origem pelo id */
        async removeOrigin(id: number): Promise<boolean> {
          const { error } = await this.supabase.client
            .from("service_request_origins")
            .delete()
            .eq("id", id);
          if (error) {
            this.notificationService.addNotification(
              "Erro ao remover origem: " + error.message
            );
            return false;
          }
          await this.fetchOrigins();
          return true;
        }
      /**
       * Atualiza dados extras do profissional após registro (specialties, phone)
       */
      async updateProfessionalExtras(email: string, specialties: ServiceCategory[], phone: string): Promise<void> {
        // Usar fetch puro para atualizar dados do profissional por e-mail
        const { supabaseRestUrl, supabaseAnonKey } = environment;
        const res = await fetch(`${supabaseRestUrl}/users?email=eq.${email}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'accept-profile': 'public'
          },
          body: JSON.stringify({ specialties, phone })
        });
        if (!res.ok) {
          const errText = await res.text();
          this.notificationService.addNotification(
            `Erro ao atualizar profissional: ${errText}`
          );
        }
      }
    /**
     * Adiciona profissional ao Supabase
     */
    async addProfessional(newUser: Partial<User>): Promise<boolean> {
      const { error } = await this.supabase.client
        .from("users")
        .insert([newUser]);
      if (error) {
        this.notificationService.addNotification(
          "Erro ao adicionar profissional: " + error.message
        );
        return false;
      }
      return true;
    }
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  public readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly addressDatabase = inject(PortugalAddressDatabaseService);

  readonly users = signal<User[]>([]);
  readonly serviceRequests = signal<ServiceRequest[]>([]);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly categories = signal<ServiceCategory[]>([]);
  readonly subcategories = signal<ServiceSubcategoryExtended[]>([]);

  async updateUserStatus(userId: number, status: UserStatus): Promise<boolean> {
    const { error } = await this.supabase.client
      .from("users")
      .update({ status })
      .eq("id", userId);

    if (error) {
      this.notificationService.addNotification(
        "Error updating user status: " + error.message
      );
      return false;
    }

    // Update local state
    this.users.update((users) =>
      users.map((u) => (u.id === userId ? { ...u, status } : u))
    );

    return true;
  }

  private async fetchServiceRequests(currentUser: User) {
    this.isLoading.set(true);
    let query = this.supabase.client
      .from("service_requests")
      .select(`*,
        category:service_categories!service_requests_category_id_fkey (
          id, name
        ),
        subcategory:service_subcategories!service_requests_subcategory_id_fkey (
          id, name, description
        ),
        professional:users!service_requests_professional_id_fkey (
          id, name
        )
      `);

    if (currentUser.role === "professional") {
      query = query.eq("professional_id", currentUser.id);
    }
    // Admin: sem filtro

    const { data, error } = await query;

    if (error) {
      console.log(
        "Error fetching service requests from Supabase, keeping sample data:",
        error.message
      );
      this.notificationService.addNotification(
        "Using sample data - Error fetching service requests: " + error.message
      );
      this.isLoading.set(false);
    } else if (data && data.length > 0) {
      const requests = data.map((r) => ({
        ...r,
        client_name: r.client_name || r.client_profile?.name || "",
        client_email: r.client_email || r.client_profile?.email || "",
        client_phone: r.client_phone || r.client_profile?.phone || "",
        client_address: r.client_address || r.client_profile?.address || "",
        professional_name: r.professional?.name || "Unassigned",
      }));
      this.serviceRequests.set(requests);
      this.isLoading.set(false);
    } else {
      this.serviceRequests.set([]);
      this.isLoading.set(false);
    }
  }

  async fetchCategories() {
    this.isLoading.set(true);
    const { data, error } = await this.supabase.client
      .from("service_categories")
      .select(`
        id, 
        name,
        subcategories:service_subcategories(
          id,
          name,
          category_id,
          type,
          average_time_minutes,
          price,
          description
        )
      `)
      .order("name");

    if (error) {
      this.handleFetchCategoriesError(error);
      this.isLoading.set(false);
      return;
    }

    if (data && data.length > 0) {
      this.processCategoriesData(data);
      this.isLoading.set(false);
    } else {
      console.log("No categories found in Supabase, keeping sample data");
      this.isLoading.set(false);
    }
  }

  private handleFetchCategoriesError(error: any) {
    console.log(
      "Error fetching categories from Supabase, keeping sample data:",
      error.message
    );
    this.notificationService.addNotification(
      "Using sample data - Error fetching categories: " + error.message
    );
  }

  private processCategoriesData(data: any[]) {
    console.log('Categories with subcategories loaded:', data);
    this.categories.set(data as ServiceCategory[]);
    
    const allSubs = this.extractSubcategories(data);
    console.log('Total subcategories extracted:', allSubs.length);
    this.subcategories.set(allSubs);
  }

  private extractSubcategories(categories: any[]): ServiceSubcategoryExtended[] {
    const allSubs: ServiceSubcategoryExtended[] = [];
    
    for (const cat of categories) {
      if (cat.subcategories && Array.isArray(cat.subcategories)) {
        const normalizedSubs = this.normalizeSubcategories(cat.subcategories, cat.id);
        allSubs.push(...normalizedSubs);
      }
    }
    
    return allSubs;
  }

  private normalizeSubcategories(subcategories: any[], categoryId: number): ServiceSubcategoryExtended[] {
    return subcategories.map(sub => ({
      ...sub,
      category_id: typeof sub.category_id === 'string' 
        ? Number.parseInt(sub.category_id, 10) 
        : sub.category_id || categoryId
    } as ServiceSubcategoryExtended));
  }

  private async fetchSubcategories() {
    this.isLoading.set(true);
    console.log("[DataService] fetchSubcategories chamado");
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
      this.isLoading.set(false);
    }
    // Always log raw response for debugging (helps diagnose RLS / empty result)
    try {
      console.debug("[DataService] fetchSubcategories raw response:", {
        data,
        error,
        currentUserId: this.authService?.appUser?.()?.id ?? null,
      });
    } catch (e) {
      console.error("[DataService] Error logging subcategories response:", e);
    }

    if (data && data.length > 0) {
      // Normaliza tipos vindos do Supabase: category_id pode vir como string
      const normalized = (data as any[]).map((d) => ({
        ...d,
        category_id:
          typeof d.category_id === "string"
            ? Number.parseInt(d.category_id, 10)
            : d.category_id,
        average_time_minutes:
          d.average_time_minutes === undefined ? null : d.average_time_minutes,
        price: d.price === undefined ? null : d.price,
      }));
      try {
        if (normalized.length > 0) {
          // Debug info for first 5 normalized subcategories (removed unused assignment)
          // normalized.slice(0, 5).forEach((s) => {
          //   console.debug({
          //     id: s.id,
          //     category_id_type: typeof s.category_id,
          //     category_id_value: s.category_id,
          //   });
          // });
        }
      } catch (e) {
        console.error("[DataService] Error logging subcategories debug info:", e);
      }
      this.subcategories.set(normalized as ServiceSubcategoryExtended[]);
      this.isLoading.set(false);
    } else {
      console.log("No subcategories found in Supabase.");
      this.isLoading.set(false);
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
      client_name: currentUser.name,
      client_email: currentUser.email,
      client_phone: currentUser.phone || null,
      client_address: currentUser.address
        ? `${currentUser.address.street}, ${currentUser.address.city}, ${currentUser.address.state}, ${currentUser.address.zip_code}`
        : null,
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      subcategory_id: payload.subcategory_id, // Agora é obrigatório
      origin_id: payload.origin_id,
      street: payload.address.street,
      city: payload.address.city,
      state: payload.address.state,
      zip_code: payload.address.zip_code,
      requested_datetime: requestedDateTime, // Campo principal
      valor: payload.valor,
      valor_prestador: payload.valor_prestador,
      status: "Solicitado",
      payment_status: "Unpaid",
    };
    
    console.log("📤 [addServiceRequest] Dados a serem inseridos:", newRequestData);
    console.log("🔐 [addServiceRequest] Session do Supabase:", await this.supabase.client.auth.getSession());
    
    const { error } = await this.supabase.client
      .from("service_requests")
      .insert(newRequestData);

    if (error) {
      console.error("❌ [addServiceRequest] Erro ao inserir:", error);
      this.notificationService.addNotification(
        "Error creating service request: " + error.message
      );
      throw error;
    }

    console.log("✅ [addServiceRequest] Solicitação criada com sucesso!");

    this.notificationService.addNotification(
      "Service request created successfully!"
    );
    // Reload service requests to show the new one
    if (currentUser) {
      await this.fetchServiceRequests(currentUser);
    }
    return true;
  }

  async addAdminServiceRequest(payload: AdminServiceRequestPayload) {
    const currentUser = this.authService.appUser();
    if (currentUser?.role !== 'admin') {
      this.notificationService.addNotification("Apenas administradores podem criar pedidos de serviço.");
      throw new Error("Only admins can create admin service requests");
    }

    // Mapeamento completo do payload para o objeto do banco de dados
    const newRequestData = {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      subcategory_id: payload.subcategory_id,
      origin_id: payload.origin_id,
      status: "Solicitado",
      payment_status: "Unpaid" as const,
      created_by_admin: true,
      client_id: null,
      // Campos do solicitante
      requester_name: payload.requester_name,
      requester_phone: payload.requester_phone,
      requester_nif: payload.requester_nif,
      // Campos de endereço
      street: payload.street,
      postal_code: payload.postal_code,
      locality: payload.locality,
      district: payload.district,
      location_details: payload.location_details,
      location_access_notes: payload.location_access_notes,
      // Campos de urgência e prazo
      urgency: payload.urgency,
      service_deadline: payload.service_deadline,
    };

    const { error } = await this.supabase.client
      .from("service_requests")
      .insert(newRequestData);

    if (error) {
      this.notificationService.addNotification(
        "Error creating admin service request: " + error.message
      );
      throw error;
    }

    this.notificationService.addNotification(
      "Admin service request created successfully!"
    );
    if (currentUser) {
      await this.fetchServiceRequests(currentUser);
    }
    return true;
  }

  getServiceRequestById(id: number): ServiceRequest | undefined {
    return this.serviceRequests().find((r) => r.id === id);
  }

  /**
   * Direciona uma solicitação de serviço diretamente para um profissional
   * e agenda a data de execução
   */
  async directAssignServiceRequest(
    requestId: number,
    professionalId: number,
    executionDate: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (currentUser?.role !== 'admin') {
      throw new Error("Only administrators can directly assign service requests");
    }

    const { error } = await this.supabase.client
      .from("service_requests")
      .update({
        professional_id: professionalId,
        scheduled_start_datetime: executionDate,
        proposed_execution_date: executionDate,
        execution_date_approval: 'approved',
        status: "Data Definida",
      })
      .eq("id", requestId);

    if (error) {
      console.error("❌ [directAssignServiceRequest] Error:", error);
      this.notificationService.addNotification(
        "Error assigning professional: " + error.message
      );
      throw error;
    }

    console.log("✅ [directAssignServiceRequest] Successfully assigned professional");
    this.notificationService.addNotification(
      this.i18n.translate("professionalAssignedSuccess")
    );

    // Reload service requests
    if (currentUser) {
      await this.fetchServiceRequests(currentUser);
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
      return;
    }

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

  async respondToQuote(requestId: number, approved: boolean) {
    const status = approved ? "Aceito" : "Recusado";
    await this.updateServiceRequest(requestId, {
      status: status,
    });
    this.notificationService.addNotification(
      `Orçamento do pedido #${requestId} foi ${approved ? "aprovado" : "rejeitado"
      }.`
    );
  }

  async scheduleServiceRequest(
    requestId: number,
    professionalId: number,
    scheduledDate: Date
  ) {
    const updates: Partial<ServiceRequest> = {
      professional_id: professionalId,
      scheduled_date: scheduledDate.toISOString(),
      status: "Data Definida" as const,
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
      status: "Data Definida",
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
      status: approved ? "Data Definida" : "Recusado",
    };
    if (approved && request?.proposed_execution_date) {
      updates.scheduled_start_datetime = request.proposed_execution_date;
      updates.status = "Data Definida";
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
      return;
    }

    // Refresh users data
    await this.fetchUsers();

    // Notify about user updates
    if (updates.status) {
      const user = this.users().find(u => u.id === userId);
      this.notificationService.addNotification(
        this.i18n.translate("userStatusUpdated", {
          name: user?.name || "",
          status: updates.status
        })
      );
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
      id: Math.floor(Math.random() * 1e9), // id temporário para UI
      request_id: requestId,
      sender_id: senderId,
      text: text,
      timestamp: new Date().toISOString(),
    };

    // Atualiza localmente para resposta instantânea
    this.chatMessages.set([
      ...this.chatMessages(),
      newMessage as any
    ]);

    const { error } = await this.supabase.client
      .from("chat_messages")
      .insert({
        request_id: requestId,
        sender_id: senderId,
        text: text,
        timestamp: newMessage.timestamp,
      });

    if (error) {
      this.notificationService.addNotification(
        "Error sending message: " + error.message
      );
      // Remove a mensagem local se falhar
      this.chatMessages.set(this.chatMessages().filter(m => m !== newMessage));
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
    const updates: Partial<ServiceRequest> = {
      professional_id: professionalId,
      scheduled_start_datetime: scheduledStartDateTime.toISOString(),
      estimated_duration_minutes: estimatedDurationMinutes,
      status: "Data Definida" as const,
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Servi├ºo #${requestId} foi agendado para ${scheduledStartDateTime.toLocaleDateString()} ├ás ${scheduledStartDateTime.toLocaleTimeString()}.`
    );
  }

  /**
   * Registra o início real do atendimento (usado pelo profissional)
   */
  async startServiceWork(requestId: number) {
    const updates: Partial<ServiceRequest> = {
      actual_start_datetime: new Date().toISOString(),
      status: "Em Progresso" as const,
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
    const updates: Partial<ServiceRequest> = {
      actual_end_datetime: new Date().toISOString(),
      status: "Aguardando Finalização" as const,
    };
    await this.updateServiceRequest(requestId, updates);
    this.notificationService.addNotification(
      `Atendimento do serviço #${requestId} foi finalizado.`
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
    if (request.status === "Concluído" && request.actual_end_datetime) {
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
          r.professional_id === professional.id && r.status === "Concluído" // Novo status simplificado
      );

      const completedServices = services.length;
      let totalDuration = 0;
      let onTimeCount = 0;

      for (const service of services) {
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
      }

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
    }

    const clarifications = data as ServiceClarification[];
    this.serviceClarifications.set(clarifications);
    return clarifications;
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
    }

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
    }

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
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const { error } = await this.supabase.client
      .from("service_clarifications")
      .delete()
      .eq("id", clarificationId)
      .eq("user_id", currentUser.id);

    if (error) {
      this.notificationService.addNotification(
        "Erro ao remover esclarecimento: " + error.message
      );
      throw error;
    }

    this.notificationService.addNotification(
      "Esclarecimento removido com sucesso!"
    );

    // Recarregar esclarecimentos
    await this.fetchServiceClarifications(serviceRequestId);
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

  async fetchUsers() {
    const { data, error } = await this.supabase.client
      .from("users")
      .select("*")
      .order("name");

    if (error) {
      this.notificationService.addNotification(
        "Error fetching users: " + error.message
      );
    } else {
      this.users.set(data || []);
    }
  }

  private async createClarificationNotification(
    serviceRequestId: number,
    type: string,
    title: string,
    message: string
  ) {
    // Placeholder for creating persistent notification
    console.log("Creating clarification notification:", { serviceRequestId, type, title, message });
    // In a real implementation, this would insert into a notifications table
  }

  async loadInitialData() {
    const user = this.authService.appUser();
    if (user) {
      this.isLoading.set(true);
      try {
        await Promise.all([
          this.fetchUsers(),
          this.fetchServiceRequests(user),
          this.fetchCategories(),
          this.fetchSubcategories(),
        ]);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  clearData() {
    this.users.set([]);
    this.serviceRequests.set([]);
    this.chatMessages.set([]);
    this.categories.set([]);
    this.subcategories.set([]);
  }

  // Category Management Methods
  async addCategory(name: string) {
    const { data, error } = await this.supabase.client
      .from("service_categories")
      .insert({ name })
      .select()
      .single();

    if (error) {
      this.notificationService.showError("Error adding category: " + error.message);
      throw error;
    }

    this.notificationService.showSuccess("Category added successfully");
    await this.fetchCategories();
    return data;
  }

  async updateCategory(id: number, name: string) {
    const { error } = await this.supabase.client
      .from("service_categories")
      .update({ name })
      .eq("id", id);

    if (error) {
      this.notificationService.showError("Error updating category: " + error.message);
      throw error;
    }

    this.notificationService.showSuccess("Category updated successfully");
    await this.fetchCategories();
  }

  async deleteCategory(id: number) {
    const { error } = await this.supabase.client
      .from("service_categories")
      .delete()
      .eq("id", id);

    if (error) {
      this.notificationService.showError("Error deleting category: " + error.message);
      throw error;
    }

    this.notificationService.showSuccess("Category deleted successfully");
    await this.fetchCategories();
  }

  async addSubcategory(name: string, categoryId: number, options?: any) {
    const payload = {
      name,
      category_id: categoryId,
      ...options
    };

    const { data, error } = await this.supabase.client
      .from("service_subcategories")
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.notificationService.showError("Error adding subcategory: " + error.message);
      throw error;
    }

    this.notificationService.showSuccess("Subcategory added successfully");
    await this.fetchCategories();
    return data;
  }

  async updateSubcategory(id: number, updates: any) {
    const { error } = await this.supabase.client
      .from("service_subcategories")
      .update(updates)
      .eq("id", id);

    if (error) {
      this.notificationService.showError("Error updating subcategory: " + error.message);
      throw error;
    }

    this.notificationService.showSuccess("Subcategory updated successfully");
    await this.fetchCategories();
  }

  async deleteSubcategory(id: number) {
    const { error } = await this.supabase.client
      .from("service_subcategories")
      .delete()
      .eq("id", id);

    if (error) {
      this.notificationService.showError("Error deleting subcategory: " + error.message);
      throw error;
    }

    this.notificationService.showSuccess("Subcategory deleted successfully");
    await this.fetchCategories();
  }

  async getPostalCodeInfo(postalCode: string) {
    console.log("🔍 [DataService] getPostalCodeInfo chamado para:", postalCode);
    
    try {
      const result = await this.addressDatabase.validateCodigoPostal(postalCode);
      console.log("📊 [DataService] Resultado da validação:", result);
      
      if (result.valid && result.endereco) {
        console.log("✅ [DataService] Retornando endereço válido:", result.endereco);
        return {
          localidade: result.endereco.localidade,
          concelho: result.endereco.concelho,
          distrito: result.endereco.distrito,
          freguesia: result.endereco.designacao_postal,
          arteria_completa: result.endereco.arteria || ""
        };
      } else {
        console.warn("⚠️ [DataService] Código postal não encontrado");
        return null;
      }
    } catch (error) {
      console.error("❌ [DataService] Erro ao buscar código postal:", error);
      return null;
    }
  }
}
