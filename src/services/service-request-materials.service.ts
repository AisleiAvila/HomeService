import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { AuthService } from "./auth.service";
import { UserWarehousesService } from "./user-warehouses.service";
import { ServiceRequestMaterial, StockItemStatus, UserRole } from "../models/maintenance.models";

export interface UpsertServiceRequestMaterialPayload {
  service_request_id: number;
  stock_item_id: number;
  quantity_used: number;
  notes?: string | null;
  created_by_admin_id?: number | null;
}

@Injectable({
  providedIn: "root",
})
export class ServiceRequestMaterialsService {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly userWarehouses = inject(UserWarehousesService);

  private isStockRole(role: UserRole): boolean {
    return role === "almoxarife" || role === "professional_almoxarife";
  }

  private async getAllowedWarehouseIdsForCurrentUser(): Promise<
    { mode: "unrestricted" } | { mode: "restricted"; ids: number[] } | { mode: "passthrough" }
  > {
    const user = this.auth.appUser();
    if (!user) return { mode: "passthrough" };
    // Admin e Secretário: acesso irrestrito a materiais/armazéns
    if (user.role === "admin" || user.role === "secretario") return { mode: "unrestricted" };
    if (!this.isStockRole(user.role)) return { mode: "passthrough" };

    const ids = await this.userWarehouses.fetchWarehouseIdsForUser(user.id);
    return { mode: "restricted", ids };
  }

  async fetchByRequest(serviceRequestId: number): Promise<ServiceRequestMaterial[]> {
    const { data, error } = await this.supabase.client
      .from("service_request_materials")
      .select(
        `
        id,
        service_request_id,
        stock_item_id,
        quantity_used,
        notes,
        created_by_admin_id,
        created_at,
        stock_item:stock_items(
          *,
          warehouse:warehouses(*)
        )
      `
      )
      .eq("service_request_id", serviceRequestId)
      .order("created_at", { ascending: false });

    if (error) {
      this.notificationService.addNotification(
        "Erro ao carregar materiais da solicitação: " + error.message
      );
      return [];
    }

    const raw = (data || []) as any[];
    const normalized = raw.map((row) => {
      const embedded = row?.stock_item;
      const normalizedStockItem = Array.isArray(embedded)
        ? (embedded[0] ?? null)
        : (embedded ?? null);

      return {
        ...row,
        stock_item: normalizedStockItem,
      } as ServiceRequestMaterial;
    });

    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode !== "restricted") {
      return normalized;
    }

    if (allowed.ids.length === 0) {
      return [];
    }

    return normalized.filter((m) => {
      const whId = m.stock_item?.warehouse_id ?? m.stock_item?.warehouse?.id ?? null;
      return typeof whId === "number" && allowed.ids.includes(whId);
    });
  }

  async upsert(payload: UpsertServiceRequestMaterialPayload): Promise<boolean> {
    // Validação de transições incoerentes: não permitir associar itens já instalados/devolvidos
    const { data: stockItem, error: stockItemError } = await this.supabase.client
      .from("stock_items")
      .select("id,status,warehouse_id")
      .eq("id", payload.stock_item_id)
      .single();

    if (stockItemError) {
      this.notificationService.addNotification(
        "Erro ao validar status do material: " + stockItemError.message
      );
      return false;
    }

    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode === "restricted") {
      const whId = (stockItem as { warehouse_id?: number | null })?.warehouse_id ?? null;
      if (typeof whId !== "number" || allowed.ids.length === 0 || !allowed.ids.includes(whId)) {
        this.notificationService.addNotification(
          "Você não tem acesso ao armazém deste material."
        );
        return false;
      }
    }

    const currentStatus = (stockItem as { status?: StockItemStatus | null })?.status ?? null;
    if (currentStatus === "Instalado" || currentStatus === "Devolvido") {
      this.notificationService.addNotification(
        "Não é possível associar um material com status '" + currentStatus + "'."
      );
      return false;
    }

    const { error } = await this.supabase.client
      .from("service_request_materials")
      .upsert(payload, {
        onConflict: "service_request_id,stock_item_id",
      });

    if (error) {
      this.notificationService.addNotification(
        "Erro ao associar material à solicitação: " + error.message
      );
      return false;
    }

    // Ao confirmar associação, marcar o item como distribuído e vincular à solicitação
    if (currentStatus === "Recebido" || currentStatus === "Distribuído") {
      let statusQuery = this.supabase.client
        .from("stock_items")
        .update({
          status: "Distribuído" satisfies StockItemStatus,
          service_request_id: payload.service_request_id,
        })
        .eq("id", payload.stock_item_id)
        .in("status", ["Recebido", "Distribuído"]);

      if (allowed.mode === "restricted") {
        if (allowed.ids.length === 0) {
          this.notificationService.addNotification(
            "Material associado, mas você não tem armazéns associados para atualizar status."
          );
          return true;
        }
        statusQuery = statusQuery.in("warehouse_id", allowed.ids);
      }

      const { error: statusError } = await statusQuery.select("id").single();

      if (statusError) {
        // Não falha a associação, mas notifica para evitar inconsistência silenciosa
        this.notificationService.addNotification(
          "Material associado, mas falha ao atualizar status para 'Distribuído': " +
            statusError.message
        );
      }
    }

    return true;
  }

  async removeById(id: number): Promise<boolean> {
    const { error } = await this.supabase.client
      .from("service_request_materials")
      .delete()
      .eq("id", id);

    if (error) {
      this.notificationService.addNotification(
        "Erro ao remover material da solicitação: " + error.message
      );
      return false;
    }

    return true;
  }
}
