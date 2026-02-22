import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { StockItem, StockItemStatus, UserRole } from "../models/maintenance.models";
import { AuthService } from "./auth.service";
import { UserWarehousesService } from "./user-warehouses.service";
import { TenantContextService } from "./tenant-context.service";

export interface StockItemCreatePayload {
  barcode: string;
  product_name: string | null;
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
  status?: StockItemStatus;
  service_request_id?: number | null;
}

@Injectable({
  providedIn: "root",
})
export class InventoryService {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly userWarehouses = inject(UserWarehousesService);
  private readonly tenantContext = inject(TenantContextService);

  private getCurrentTenantId(): string | null {
    return this.tenantContext.tenant()?.id ?? this.auth.appUser()?.tenant_id ?? null;
  }

  private withTenantFilter(query: any): any {
    const tenantId = this.getCurrentTenantId();
    if (!tenantId || !query || typeof query.eq !== "function") {
      return query;
    }
    return query.eq("tenant_id", tenantId);
  }

  private isStockRole(role: UserRole): boolean {
    return role === "almoxarife" || role === "professional_almoxarife";
  }

  private async ensureWarehouseAllowed(warehouseId: number | null | undefined): Promise<boolean> {
    const user = this.auth.appUser();
    if (!user) return false;
    // Admin e Secretário podem operar em qualquer armazém (sem restrição)
    if (user.role === "admin" || user.role === "secretario") return true;
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
    // Admin e Secretário: acesso irrestrito a todos os armazéns
    if (user.role === "admin" || user.role === "secretario") return { mode: "unrestricted" };
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

    const { data, error } = await this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .insert({
        ...payload,
        tenant_id: this.getCurrentTenantId(),
        status: "Recebido" satisfies StockItemStatus,
      })
      .select("*")
      .single());

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

    let query = this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .update({ status: toStatus })
      .eq("id", id));

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

    let query = this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .select("*")
      .eq("barcode", barcode));

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

    let query = this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .update(payload)
      .eq("id", id));

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

    let query = this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .select(`
        *,
        warehouse:warehouses(*),
        created_by_admin:users!created_by_admin_id(name),
        service_request:service_requests(id,title)
      `)
      .order("received_at", { ascending: false })
      .limit(limit));

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

  async fetchAvailableStockItemsByWarehouse(warehouseId: number): Promise<StockItem[]> {
    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode === "denied") {
      return [];
    }

    if (allowed.mode === "restricted") {
      if (allowed.ids.length === 0 || !allowed.ids.includes(warehouseId)) {
        return [];
      }
    }

    const { data, error } = await this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .select("*")
      .eq("warehouse_id", warehouseId)
      .eq("status", "Recebido" satisfies StockItemStatus)
      .is("service_request_id", null)
      .order("received_at", { ascending: false }));

    if (error) {
      this.notificationService.addNotification(
        "Erro ao carregar materiais do armazem: " + error.message
      );
      return [];
    }

    return (data || []) as StockItem[];
  }

  async fetchStockItemsByRequest(serviceRequestId: number): Promise<StockItem[]> {
    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode === "denied") {
      return [];
    }

    let query = this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .select("*")
      .eq("service_request_id", serviceRequestId));

    if (allowed.mode === "restricted") {
      if (allowed.ids.length === 0) {
        return [];
      }
      query = query.in("warehouse_id", allowed.ids);
    }

    const { data, error } = await query.order("received_at", { ascending: false });

    if (error) {
      this.notificationService.addNotification(
        "Erro ao carregar materiais associados: " + error.message
      );
      return [];
    }

    return (data || []) as StockItem[];
  }

  async fetchReceivedStockItemsByWarehouseForEdit(
    warehouseId: number,
    requestId: number
  ): Promise<StockItem[]> {
    const allowed = await this.getAllowedWarehouseIdsForCurrentUser();
    if (allowed.mode === "denied") {
      return [];
    }

    if (allowed.mode === "restricted") {
      if (allowed.ids.length === 0 || !allowed.ids.includes(warehouseId)) {
        return [];
      }
    }

    let query = this.withTenantFilter(this.supabase.client
      .from("stock_items")
      .select("*")
      .eq("warehouse_id", warehouseId)
      .or(
        `and(status.eq.Recebido,service_request_id.is.null),service_request_id.eq.${requestId}`
      )
      .order("received_at", { ascending: false }));

    if (allowed.mode === "restricted") {
      query = query.in("warehouse_id", allowed.ids);
    }

    const { data, error } = await query;

    if (error) {
      this.notificationService.addNotification(
        "Erro ao carregar materiais recebidos: " + error.message
      );
      return [];
    }

    return (data || []) as StockItem[];
  }
}
