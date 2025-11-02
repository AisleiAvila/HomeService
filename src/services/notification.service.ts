import { Injectable, signal, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import {
  Notification,
  EnhancedNotification,
  NotificationType,
  ServiceRequest,
  User,
} from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private readonly supabase = inject(SupabaseService);

  private notificationIdCounter = 1;

  // Notificações simples (compatibilidade)
  notifications = signal<Notification[]>([]);

  // Notificações aprimoradas
  enhancedNotifications = signal<EnhancedNotification[]>([]);

  constructor() {
    // Métodos de inicialização serão chamados externamente
    // para evitar dependência circular com AuthService
  }

  // Método para inicializar com um usuário específico
  initializeForUser(userId: number): void {
    this.loadEnhancedNotifications(userId);
    this.listenToNotificationChanges(userId);
  }

  // MÉTODOS LEGADOS (compatibilidade)
  addNotification(message: string) {
    const newNotification: Notification = {
      id: this.notificationIdCounter++,
      message,
      timestamp: new Date(),
      read: false,
    };
    this.notifications.update((current) => [newNotification, ...current]);

    // Auto-remove após 15 segundos
    setTimeout(() => {
      this.notifications.update((all) =>
        all.filter((n) => n.id !== newNotification.id)
      );
    }, 15000);
  }

  markAsRead(notificationId: number) {
    this.notifications.update((notifications) =>
      notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  markAllAsRead() {
    this.notifications.update((notifications) =>
      notifications.map((n) => (n.read ? n : { ...n, read: true }))
    );
  }

  clearAll() {
    this.notifications.set([]);
  }

  // NOVOS MÉTODOS PARA NOTIFICAÇÕES APRIMORADAS

  /**
   * Criar notificação aprimorada
   */
  async createEnhancedNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      serviceRequestId?: number;
      actionRequired?: boolean;
      priority?: "low" | "medium" | "high";
      expiresInHours?: number;
    }
  ): Promise<void> {
    const notification: Partial<EnhancedNotification> = {
      user_id: userId,
      type,
      title,
      message,
      service_request_id: options?.serviceRequestId,
      action_required: options?.actionRequired || false,
      priority: options?.priority || "medium",
      read: false,
      timestamp: new Date(),
      expires_at: options?.expiresInHours
        ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
        : undefined,
    };

    // Salvar no banco
    const { data, error } = await this.supabase.client
      .from("enhanced_notifications")
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.error("Error creating enhanced notification:", error);
      // Fallback para notificação simples
      this.addNotification(message);
      return;
    }

    // Atualizar estado local se for para o usuário atual
    // TODO: Remover dependência circular - passar currentUserId como parâmetro
    // const currentUser = this.authService.appUser();
    // if (currentUser && currentUser.id === userId) {
    //   this.enhancedNotifications.update((current) => [
    //     data as EnhancedNotification,
    //     ...current,
    //   ]);
    // }
  }

  /**
   * Notificar múltiplos usuários por papel
   */
  async notifyByRole(
    roles: string[],
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      serviceRequestId?: number;
      actionRequired?: boolean;
      priority?: "low" | "medium" | "high";
      expiresInHours?: number;
    }
  ): Promise<void> {
    // Buscar usuários pelos papéis
    const { data: users, error } = await this.supabase.client
      .from("users")
      .select("id")
      .in("role", roles)
      .eq("status", "Active");

    if (error || !users) {
      console.error("Error fetching users by role:", error);
      return;
    }

    // Criar notificação para cada usuário
    for (const user of users) {
      await this.createEnhancedNotification(
        user.id,
        type,
        title,
        message,
        options
      );
    }
  }

  /**
   * Notificar stakeholders de um pedido específico
   */
  async notifyServiceRequestStakeholders(
    serviceRequestId: number,
    type: NotificationType,
    title: string,
    message: string,
    stakeholders: ("client" | "professional" | "admin")[],
    options?: {
      actionRequired?: boolean;
      priority?: "low" | "medium" | "high";
      expiresInHours?: number;
    }
  ): Promise<void> {
    // Buscar dados do pedido
    const { data: request, error } = await this.supabase.client
      .from("service_requests")
      .select("client_id, professional_id")
      .eq("id", serviceRequestId)
      .single();

    if (error || !request) {
      console.error("Error fetching service request:", error);
      return;
    }

    const userIds: number[] = [];

    // Adicionar IDs baseados nos stakeholders solicitados
    if (stakeholders.includes("client") && request.client_id) {
      userIds.push(request.client_id);
    }
    if (stakeholders.includes("professional") && request.professional_id) {
      userIds.push(request.professional_id);
    }
    if (stakeholders.includes("admin")) {
      // Buscar administradores
      const { data: admins } = await this.supabase.client
        .from("users")
        .select("id")
        .eq("role", "admin")
        .eq("status", "Active");

      if (admins) {
        userIds.push(...admins.map((admin) => admin.id));
      }
    }

    // Criar notificação para cada stakeholder
    for (const userId of userIds) {
      await this.createEnhancedNotification(userId, type, title, message, {
        serviceRequestId,
        ...options,
      });
    }
  }

  /**
   * Marcar notificação aprimorada como lida
   */
  async markEnhancedAsRead(notificationId: number): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from("enhanced_notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) {
        console.warn("Enhanced notifications not available:", error.message);
        return;
      }

      // Atualizar estado local
      this.enhancedNotifications.update((notifications) =>
        notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.warn("Enhanced notifications feature not available");
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllEnhancedAsRead(userId: number): Promise<void> {
    const { error } = await this.supabase.client
      .from("enhanced_notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return;
    }

    // Atualizar estado local
    this.enhancedNotifications.update((notifications) =>
      notifications.map((n) => (n.read ? n : { ...n, read: true }))
    );
  }

  /**
   * Excluir notificação aprimorada
   */
  async deleteEnhancedNotification(notificationId: number): Promise<void> {
    const { error } = await this.supabase.client
      .from("enhanced_notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
      return;
    }

    // Atualizar estado local
    this.enhancedNotifications.update((notifications) =>
      notifications.filter((n) => n.id !== notificationId)
    );
  }

  /**
   * Limpar notificações expiradas
   */
  async cleanupExpiredNotifications(): Promise<void> {
    const { error } = await this.supabase.client
      .from("enhanced_notifications")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) {
      console.error("Error cleaning up expired notifications:", error);
      return;
    }

    // Recarregar notificações
    await this.loadEnhancedNotifications();
  }

  /**
   * Obter estatísticas de notificações
   */
  getNotificationStats(): {
    total: number;
    unread: number;
    actionRequired: number;
    highPriority: number;
    byType: Record<NotificationType, number>;
  } {
    const notifications = this.enhancedNotifications();

    const stats = {
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      actionRequired: notifications.filter((n) => n.action_required).length,
      highPriority: notifications.filter((n) => n.priority === "high").length,
      byType: {} as Record<NotificationType, number>,
    };

    // Contar por tipo
    notifications.forEach((n) => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Filtrar notificações por critério
   */
  getFilteredNotifications(filters: {
    type?: NotificationType;
    priority?: "low" | "medium" | "high";
    actionRequired?: boolean;
    unreadOnly?: boolean;
    serviceRequestId?: number;
  }): EnhancedNotification[] {
    let notifications = this.enhancedNotifications();

    if (filters.type) {
      notifications = notifications.filter((n) => n.type === filters.type);
    }

    if (filters.priority) {
      notifications = notifications.filter(
        (n) => n.priority === filters.priority
      );
    }

    if (filters.actionRequired !== undefined) {
      notifications = notifications.filter(
        (n) => n.action_required === filters.actionRequired
      );
    }

    if (filters.unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }

    if (filters.serviceRequestId) {
      notifications = notifications.filter(
        (n) => n.service_request_id === filters.serviceRequestId
      );
    }

    return notifications;
  }

  /**
   * Métodos privados
   */
  private async loadEnhancedNotifications(userId?: number): Promise<void> {
    if (!userId) return;

    // Tentar diferentes colunas de timestamp que podem existir
    const timestampColumns = ["created_at", "timestamp", "date_created", "id"];
    let data = null;
    let error = null;

    for (const column of timestampColumns) {
      try {
        const result = await this.supabase.client
          .from("enhanced_notifications")
          .select("*")
          .eq("user_id", userId)
          .order(column, { ascending: false })
          .limit(100);

        if (!result.error) {
          data = result.data;
          error = null;
          break;
        } else {
          error = result.error;
        }
      } catch (e) {
        error = e;
        continue;
      }
    }

    if (error) {
      console.error("Error loading enhanced notifications:", error);
      return;
    }

    if (data) {
      this.enhancedNotifications.set(data as EnhancedNotification[]);
    }
  }

  private listenToNotificationChanges(userId?: number): void {
    if (!userId) return;

    this.supabase.client
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enhanced_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          this.loadEnhancedNotifications(userId);
        }
      )
      .subscribe();
  }

  // MÉTODOS DE CONVENIÊNCIA PARA TIPOS ESPECÍFICOS DE NOTIFICAÇÃO

  async notifyQuoteRequest(
    serviceRequestId: number,
    clientId: number
  ): Promise<void> {
    await this.createEnhancedNotification(
      clientId,
      "quote_request",
      "Orçamento Solicitado",
      "Um orçamento foi solicitado para o seu pedido de serviço.",
      {
        serviceRequestId,
        actionRequired: false,
        priority: "medium",
      }
    );
  }

  async notifyQuoteSent(
    serviceRequestId: number,
    clientId: number,
    amount: number
  ): Promise<void> {
    await this.createEnhancedNotification(
      clientId,
      "quote_sent",
      "Orçamento Recebido",
      `Você recebeu um orçamento de €${amount.toFixed(
        2
      )}. Clique para revisar e aprovar.`,
      {
        serviceRequestId,
        actionRequired: true,
        priority: "high",
        expiresInHours: 168, // 7 dias
      }
    );
  }

  async notifyProfessionalAssignment(
    serviceRequestId: number,
    professionalId: number
  ): Promise<void> {
    await this.createEnhancedNotification(
      professionalId,
      "professional_assigned",
      "Novo Trabalho Atribuído",
      "Um novo trabalho foi atribuído a você. Clique para aceitar ou rejeitar.",
      {
        serviceRequestId,
        actionRequired: true,
        priority: "high",
        expiresInHours: 48, // 2 dias
      }
    );
  }

  async notifyPaymentDue(
    serviceRequestId: number,
    clientId: number,
    amount: number
  ): Promise<void> {
    await this.createEnhancedNotification(
      clientId,
      "payment_due",
      "Pagamento Pendente",
      `Seu pagamento de €${amount.toFixed(
        2
      )} está pendente. Complete o pagamento para finalizar o serviço.`,
      {
        serviceRequestId,
        actionRequired: true,
        priority: "high",
        expiresInHours: 168, // 7 dias
      }
    );
  }

  async notifyDeadlineWarning(
    serviceRequestId: number,
    userIds: number[],
    deadline: string
  ): Promise<void> {
    for (const userId of userIds) {
      await this.createEnhancedNotification(
        userId,
        "deadline_warning",
        "Prazo se Aproximando",
        `Atenção: O prazo para o pedido #${serviceRequestId} é em ${deadline}.`,
        {
          serviceRequestId,
          actionRequired: false,
          priority: "medium",
        }
      );
    }
  }

  async notifyOverdue(
    serviceRequestId: number,
    userIds: number[]
  ): Promise<void> {
    for (const userId of userIds) {
      await this.createEnhancedNotification(
        userId,
        "overdue_alert",
        "Pedido em Atraso",
        `O pedido #${serviceRequestId} está em atraso. Ação imediata necessária.`,
        {
          serviceRequestId,
          actionRequired: true,
          priority: "high",
        }
      );
    }
  }
}
