import { Injectable, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { EnhancedNotification } from "../models/maintenance.models";

/**
 * Serviço para gerenciamento de notificações in-app
 * Permite criar, listar, marcar como lida e deletar notificações
 * Usa a tabela enhanced_notifications do Supabase
 */
@Injectable({
  providedIn: "root",
})
export class InAppNotificationService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  // Signal com todas as notificações do usuário atual
  readonly notifications = signal<EnhancedNotification[]>([]);
  
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
    metadata?: Record<string, any>,
    priority: "low" | "medium" | "high" = "medium",
    actionRequired: boolean = false
  ): Promise<EnhancedNotification | null> {
    try {
      const notification = {
        user_id: userId,
        type,
        title,
        message,
        read: false,
        created_at: new Date(),
        priority,
        action_required: actionRequired,
      };

      const { data, error } = await this.supabase.client
        .from("enhanced_notifications")
        .insert([notification])
        .select()
        .single();

      if (error) {
        const anyErr = error as any;
        const code = anyErr?.code;
        const msg = String(anyErr?.message || '');
        const isUniqueViolation = code === '23505' || msg.toLowerCase().includes('duplicate key');
        if (isUniqueViolation) {
          return null;
        }
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
      console.log('📬 [loadNotifications] Carregando notificações para usuário:', currentUser?.id, currentUser?.email);
      
      if (!currentUser) {
        console.warn('📬 [loadNotifications] Usuário não autenticado');
        return;
      }

      console.log('📬 [loadNotifications] Consultando banco de dados...');
      
      // Carregar as 50 notificações mais recentes para exibição
      const { data, error } = await this.supabase.client
        .from("enhanced_notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50); // Limitar a 50 notificações mais recentes para exibição

      if (error) {
        console.error("📬 [loadNotifications] Erro ao carregar notificações:", error);
        return;
      }

      console.log('📬 [loadNotifications] Dados recebidos do banco:', data);
      
      this.notifications.set(data || []);
      
      // Contar TODAS as notificações não lidas (sem limite)
      const { count: unreadCount, error: countError } = await this.supabase.client
        .from("enhanced_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUser.id)
        .eq("read", false);

      if (countError) {
        console.error("📬 [loadNotifications] Erro ao contar notificações não lidas:", countError);
        // Fallback: contar baseado nas notificações carregadas
        const unread = (data || []).filter(n => !n.read).length;
        this.unreadCount.set(unread);
      } else {
        this.unreadCount.set(unreadCount || 0);
      }
      
      console.log(`📬 [loadNotifications] ✅ Carregadas ${data?.length || 0} notificações (${this.unreadCount()} não lidas no total)`);
      console.log('📬 [loadNotifications] Signal state:', this.notifications());
    } catch (error) {
      console.error("📬 [loadNotifications] Erro ao carregar notificações:", error);
    }
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(notificationId: number): Promise<boolean> {
    try {
      console.log('📨 [markAsRead] Marcando notificação como lida:', notificationId);
      
      const { error } = await this.supabase.client
        .from("enhanced_notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Erro ao marcar notificação como lida:", error);
        return false;
      }

      console.log('✅ [markAsRead] Notificação marcada como lida com sucesso');
      
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

      console.log('📨 [markAllAsRead] Marcando todas as notificações como lidas para usuário:', currentUser.id);

      const { error } = await this.supabase.client
        .from("enhanced_notifications")
        .update({ read: true })
        .eq("user_id", currentUser.id)
        .eq("read", false);

      if (error) {
        console.error("Erro ao marcar todas como lidas:", error);
        return false;
      }

      console.log('✅ [markAllAsRead] Todas as notificações marcadas como lidas');

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
        .from("enhanced_notifications")
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
        .from("enhanced_notifications")
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
  getUnreadNotifications(): EnhancedNotification[] {
    return this.notifications().filter(n => !n.read);
  }

  /**
   * Obtém notificações lidas
   */
  getReadNotifications(): EnhancedNotification[] {
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
          table: "enhanced_notifications",
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
