import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { TenantContextService } from "./tenant-context.service";
import { ServiceStatus, UserRole } from "../models/maintenance.models";

/**
 * Interface para entrada de auditoria
 */
export interface StatusAuditEntry {
  tenant_id?: string | null;
  request_id: number;
  previous_status: ServiceStatus | null;
  new_status: ServiceStatus;
  changed_by_user_id: number;
  changed_by_role: UserRole;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Interface para consulta de histórico
 */
export interface StatusHistoryQuery {
  requestId?: number;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: ServiceStatus;
}

/**
 * Serviço de Auditoria de Status
 * 
 * Registra todas as mudanças de status de solicitações de serviço,
 * permitindo rastreabilidade completa e análise de histórico.
 */
@Injectable({
  providedIn: "root",
})
export class StatusAuditService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly tenantContext = inject(TenantContextService);

  private getCurrentTenantId(): string | null {
    return this.tenantContext.tenant()?.id ?? this.authService.appUser()?.tenant_id ?? null;
  }

  private withTenantFilter(query: any): any {
    const tenantId = this.getCurrentTenantId();
    if (!tenantId || !query || typeof query.eq !== "function") {
      return query;
    }
    return query.eq("tenant_id", tenantId);
  }

  /**
   * Registra uma mudança de status
   */
  async logStatusChange(
    requestId: number,
    previousStatus: ServiceStatus | null,
    newStatus: ServiceStatus,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const currentUser = this.authService.appUser();
      if (!currentUser) {
        console.error("[StatusAudit] Nenhum usuário autenticado");
        return false;
      }

      const auditEntry: Partial<StatusAuditEntry> = {
        tenant_id: this.getCurrentTenantId(),
        request_id: requestId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_by_user_id: currentUser.id,
        changed_by_role: currentUser.role,
        reason: reason || null,
        metadata: metadata || null,
        timestamp: new Date().toISOString(),
      };

      const { error } = await this.withTenantFilter(this.supabase.client
        .from("status_audit_log")
        .insert([auditEntry]));

      if (error) {
        console.error("[StatusAudit] Erro ao registrar auditoria:", error);
        return false;
      }

      console.log(
        `✅ [StatusAudit] Registrado: Request #${requestId} - ${previousStatus || "NULL"} → ${newStatus} (por ${currentUser.role} #${currentUser.id})`
      );

      return true;
    } catch (error) {
      console.error("[StatusAudit] Exceção ao registrar auditoria:", error);
      return false;
    }
  }

  /**
   * Obtém histórico completo de mudanças de status de uma solicitação
   */
  async getRequestHistory(requestId: number): Promise<StatusAuditEntry[]> {
    try {
      const { data, error } = await this.withTenantFilter(this.supabase.client
        .from("status_audit_log")
        .select("*")
        .eq("request_id", requestId)
        .order("timestamp", { ascending: true }));

      if (error) {
        console.error("[StatusAudit] Erro ao buscar histórico:", error);
        return [];
      }

      return (data as StatusAuditEntry[]) || [];
    } catch (error) {
      console.error("[StatusAudit] Exceção ao buscar histórico:", error);
      return [];
    }
  }

  /**
   * Obtém histórico de mudanças com filtros
   */
  async getHistory(query: StatusHistoryQuery): Promise<StatusAuditEntry[]> {
    try {
      let dbQuery = this.supabase.client
        .from("status_audit_log")
        .select("*");

      dbQuery = this.withTenantFilter(dbQuery);

      if (query.requestId) {
        dbQuery = dbQuery.eq("request_id", query.requestId);
      }

      if (query.userId) {
        dbQuery = dbQuery.eq("changed_by_user_id", query.userId);
      }

      if (query.status) {
        dbQuery = dbQuery.eq("new_status", query.status);
      }

      if (query.startDate) {
        dbQuery = dbQuery.gte("timestamp", query.startDate.toISOString());
      }

      if (query.endDate) {
        dbQuery = dbQuery.lte("timestamp", query.endDate.toISOString());
      }

      dbQuery = dbQuery.order("timestamp", { ascending: false });

      const { data, error } = await dbQuery;

      if (error) {
        console.error("[StatusAudit] Erro ao buscar histórico filtrado:", error);
        return [];
      }

      return (data as StatusAuditEntry[]) || [];
    } catch (error) {
      console.error("[StatusAudit] Exceção ao buscar histórico filtrado:", error);
      return [];
    }
  }

  /**
   * Obtém estatísticas de mudanças de status
   */
  async getStatusChangeStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<ServiceStatus, number>> {
    try {
      let dbQuery = this.supabase.client
        .from("status_audit_log")
        .select("new_status");

      dbQuery = this.withTenantFilter(dbQuery);

      if (startDate) {
        dbQuery = dbQuery.gte("timestamp", startDate.toISOString());
      }

      if (endDate) {
        dbQuery = dbQuery.lte("timestamp", endDate.toISOString());
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error("[StatusAudit] Erro ao buscar estatísticas:", error);
        return {} as Record<ServiceStatus, number>;
      }

      // Contar ocorrências de cada status
      const stats: Record<string, number> = {};
      for (const entry of data || []) {
        const status = entry.new_status;
        stats[status] = (stats[status] || 0) + 1;
      }

      return stats as Record<ServiceStatus, number>;
    } catch (error) {
      console.error("[StatusAudit] Exceção ao buscar estatísticas:", error);
      return {} as Record<ServiceStatus, number>;
    }
  }

  /**
   * Obtém última mudança de status de uma solicitação
   */
  async getLastStatusChange(requestId: number): Promise<StatusAuditEntry | null> {
    try {
      const { data, error } = await this.withTenantFilter(this.supabase.client
        .from("status_audit_log")
        .select("*")
        .eq("request_id", requestId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single());

      if (error) {
        console.error("[StatusAudit] Erro ao buscar última mudança:", error);
        return null;
      }

      return data as StatusAuditEntry;
    } catch (error) {
      console.error("[StatusAudit] Exceção ao buscar última mudança:", error);
      return null;
    }
  }

  /**
   * Verifica se uma transição já ocorreu
   */
  async hasTransitionOccurred(
    requestId: number,
    fromStatus: ServiceStatus,
    toStatus: ServiceStatus
  ): Promise<boolean> {
    try {
      const { data, error } = await this.withTenantFilter(this.supabase.client
        .from("status_audit_log")
        .select("id")
        .eq("request_id", requestId)
        .eq("previous_status", fromStatus)
        .eq("new_status", toStatus)
        .limit(1));

      if (error) {
        console.error("[StatusAudit] Erro ao verificar transição:", error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error("[StatusAudit] Exceção ao verificar transição:", error);
      return false;
    }
  }
}
