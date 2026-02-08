import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { StockItem, StockItemStatus, UserRole } from "../models/maintenance.models";
import { AuthService } from "./auth.service";
import { UserWarehousesService } from "./user-warehouses.service";

export interface StockItemCreatePayload {
  barcode: string;
  product_name: string;
  quantity: number;
  supplier: string;
  received_at: string;
  notes?: string | null;
  warehouse_id?: number | null;
  created_by_admin_id: number | null;
}

export interface StockItemUpdatePayload {
  product_name?: string | null;
  quantity?: number;
  supplier?: string;
  received_at?: string;
  notes?: string | null;
  warehouse_id?: number | null;
}

@Injectable({
  providedIn: "root",
})
export class InventoryService {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly userWarehouses = inject(UserWarehousesService);

  private isStockRole(role: UserRole): boolean {
    return role === "almoxarife" || role === "professional_almoxarife";
  }

  private async ensureWarehouseAllowed(warehouseId: number | null | undefined): Promise<boolean> {
    const user = this.auth.appUser();
    if (!user) return false;
    if (user.role === "admin") return true;
    if (!this.isStockRole(user.role)) return false;

    if (typeof warehouseId !== "number") return false;
    const allowedIds = await this.userWarehouses.fetchWarehouseIdsForUser(user.id);
    const ok = allowedIds.includes(warehouseId);
    if (!ok) {
      this.notificationService.addNotification(
        "Você não tem acesso a este armazém."
      );
    }
    return ok;
  }

  private async getAllowedWarehouseIdsForCurrentUser(): Promise<
    { mode: "unrestricted" } | { mode: "restricted"; ids: number[] } | { mode: "denied" }
  > {
    const user = this.auth.appUser();
    if (!user) return { mode: "denied" };
    if (user.role === "admin") return { mode: "unrestricted" };
    if (!this.isStockRole(user.role)) return { mode: "denied" };

    const ids = await this.userWarehouses.fetchWarehouseIdsForUser(user.id);
    if (ids.length === 0) return { mode: "restricted", ids: [] };
    return { mode: "restricted", ids };
  }

  async addStockItem(payload: StockItemCreatePayload): Promise<StockItem | null> {
    const canWrite = await this.ensureWarehouseAllowed(payload.warehouse_id);
    if (!canWrite) {
      return null;
    }

    const { data, error } = await this.supabase.client
      .from("stock_items")
      .insert({
        ...payload,
        status: "Recebido" satisfies StockItemStatus,
      })
      .select("*")
      .single();

    if (error) {
      this.notificationService.addNotification(
        "Erro ao salvar item no estoque: " + error.message
      );
      return null;
    }

    return data as StockItem;
  }

  async transitionStockItemStatus(
    id: number,
    toStatus: StockItemStatus,
    allowedFrom?: StockItemStatus[]
  ): Promise<StockItem | null> {
    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode === "denied") {
      this.notificationService.addNotification(
        "Você não tem permissão para alterar itens do estoque."
      );
      return null;
    }

    let query = this.supabase.client
      .from("stock_items")
      .update({ status: toStatus })
      .eq("id", id);

    if (allowed.mode === "restricted") {
      if (allowed.ids.length === 0) {
        this.notificationService.addNotification(
          "Você não tem armazéns associados para operar no estoque."
        );
        return null;
      }
      query = query.in("warehouse_id", allowed.ids);
    }

    if (allowedFrom && allowedFrom.length > 0) {
      query = query.in("status", allowedFrom);
    }

    const { data, error } = await query.select("*").single();

    if (error) {
      if (error.code === "PGRST116") {
        this.notificationService.addNotification(
          "Transição de status inválida para este item."
        );
        return null;
      }

      this.notificationService.addNotification(
        "Erro ao atualizar status do item: " + error.message
      );
      return null;
    }

    return data as StockItem;
  }

  async checkBarcodeExists(barcode: string): Promise<StockItem | null> {
    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode === "denied") {
      return null;
    }

    let query = this.supabase.client
      .from("stock_items")
      .select("*")
      .eq("barcode", barcode);

    if (allowed.mode === "restricted") {
      if (allowed.ids.length === 0) return null;
      query = query.in("warehouse_id", allowed.ids);
    }

    const { data, error } = await query.single();

    if (error) {
      // Se não encontrou (código 0), retorna null
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error("Erro ao verificar código de barras:", error);
      return null;
    }

    return data as StockItem;
  }

  async updateStockItem(id: number, payload: StockItemUpdatePayload): Promise<StockItem | null> {
    if (Object.hasOwn(payload, "warehouse_id")) {
      const canWrite = await this.ensureWarehouseAllowed(payload.warehouse_id);
      if (!canWrite) {
        return null;
      }
    }

    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode === "denied") {
      this.notificationService.addNotification(
        "Você não tem permissão para alterar itens do estoque."
      );
      return null;
    }

    let query = this.supabase.client
      .from("stock_items")
      .update(payload)
      .eq("id", id);

    if (allowed.mode === "restricted") {
      if (allowed.ids.length === 0) {
        this.notificationService.addNotification(
          "Você não tem armazéns associados para operar no estoque."
        );
        return null;
      }
      query = query.in("warehouse_id", allowed.ids);
    }

    const { data, error } = await query.select("*").single();

    if (error) {
      this.notificationService.addNotification(
        "Erro ao atualizar item no estoque: " + error.message
      );
      return null;
    }

    return data as StockItem;
  }

  async fetchRecentStockItems(limit = 10): Promise<StockItem[]> {
    const user = this.auth.appUser();
    if (!user) return [];

    let query = this.supabase.client
      .from("stock_items")
      .select(`
        *,
        warehouse:warehouses(*),
        created_by_admin:users!created_by_admin_id(name)
      `)
      .order("received_at", { ascending: false })
      .limit(limit);

    if (user.role !== "admin" && this.isStockRole(user.role)) {
      const allowedIds = await this.userWarehouses.fetchWarehouseIdsForUser(user.id);
      if (allowedIds.length === 0) {
        return [];
      }
      query = query.in("warehouse_id", allowedIds);
    }

    const { data, error } = await query;

    if (error) {
      this.notificationService.addNotification(
        "Erro ao carregar itens do estoque: " + error.message
      );
      return [];
    }

    return (data || []) as StockItem[];
  }
}
