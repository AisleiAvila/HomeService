import { Injectable, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { InAppNotification } from "../models/maintenance.models";

/**
 * Serviço para gerenciamento de notificações in-app
 * Permite criar, listar, marcar como lida e deletar notificações
 */
@Injectable({
  providedIn: "root",
})
export class InAppNotificationService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  // Signal com todas as notificações do usuário atual
  readonly notifications = signal<InAppNotification[]>([]);
  
  // Signal com contagem de notificações não lidas
  readonly unreadCount = signal<number>(0);

  /**
   * Cria uma nova notificação para um usuário
   */
  async createNotification(
    userId: number,
    type: string,
    title: string,
    message: string,
    link?: string,
    metadata?: Record<string, any>
  ): Promise<InAppNotification | null> {
    try {
      const notification = {
        user_id: userId,
        type,
        title,
        message,
        link: link || null,
        metadata: metadata || null,
        read: false,
      };

      const { data, error } = await this.supabase.client
        .from("in_app_notifications")
        .insert([notification])
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar notificação:", error);
        return null;
      }

      console.log(`✅ Notificação criada para usuário ${userId}:`, title);
      
      // Se for para o usuário atual, atualizar a lista
      const currentUser = this.authService.appUser();
      if (currentUser?.id === userId) {
        await this.loadNotifications();
      }

      return data;
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      return null;
    }
  }

  /**
   * Carrega todas as notificações do usuário atual
   */
  async loadNotifications(): Promise<void> {
    try {
      const currentUser = this.authService.appUser();
      if (!currentUser) return;

      const { data, error } = await this.supabase.client
        .from("in_app_notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50); // Limitar a 50 notificações mais recentes

      if (error) {
        console.error("Erro ao carregar notificações:", error);
        return;
      }

      this.notifications.set(data || []);
      
      // Atualizar contagem de não lidas
      const unread = (data || []).filter(n => !n.read).length;
      this.unreadCount.set(unread);
      
      console.log(`📬 Carregadas ${data?.length || 0} notificações (${unread} não lidas)`);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("in_app_notifications")
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) {
        console.error("Erro ao marcar notificação como lida:", error);
        return false;
      }

      // Atualizar lista local
      await this.loadNotifications();
      
      return true;
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      return false;
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const currentUser = this.authService.appUser();
      if (!currentUser) return false;

      const { error } = await this.supabase.client
        .from("in_app_notifications")
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", currentUser.id)
        .eq("read", false);

      if (error) {
        console.error("Erro ao marcar todas como lidas:", error);
        return false;
      }

      // Atualizar lista local
      await this.loadNotifications();
      
      return true;
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
      return false;
    }
  }

  /**
   * Deleta uma notificação
   */
  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from("in_app_notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        console.error("Erro ao deletar notificação:", error);
        return false;
      }

      // Atualizar lista local
      await this.loadNotifications();
      
      return true;
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
      return false;
    }
  }

  /**
   * Deleta todas as notificações lidas
   */
  async deleteAllRead(): Promise<boolean> {
    try {
      const currentUser = this.authService.appUser();
      if (!currentUser) return false;

      const { error } = await this.supabase.client
        .from("in_app_notifications")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("read", true);

      if (error) {
        console.error("Erro ao deletar notificações lidas:", error);
        return false;
      }

      // Atualizar lista local
      await this.loadNotifications();
      
      return true;
    } catch (error) {
      console.error("Erro ao deletar notificações lidas:", error);
      return false;
    }
  }

  /**
   * Obtém notificações não lidas
   */
  getUnreadNotifications(): InAppNotification[] {
    return this.notifications().filter(n => !n.read);
  }

  /**
   * Obtém notificações lidas
   */
  getReadNotifications(): InAppNotification[] {
    return this.notifications().filter(n => n.read);
  }

  /**
   * Inicializa subscrição em tempo real para notificações
   */
  async subscribeToNotifications(): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) return;

    // Carregar notificações iniciais
    await this.loadNotifications();

    // Subscrever a mudanças
    this.supabase.client
      .channel(`notifications:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          // Recarregar notificações quando houver mudanças
          this.loadNotifications();
        }
      )
      .subscribe();

    console.log(`🔔 Subscrição ativa para notificações do usuário ${currentUser.id}`);
  }
}
