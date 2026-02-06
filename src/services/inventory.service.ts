import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { StockItem } from "../models/maintenance.models";

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

  async addStockItem(payload: StockItemCreatePayload): Promise<StockItem | null> {
    const { data, error } = await this.supabase.client
      .from("stock_items")
      .insert(payload)
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

  async checkBarcodeExists(barcode: string): Promise<StockItem | null> {
    const { data, error } = await this.supabase.client
      .from("stock_items")
      .select("*")
      .eq("barcode", barcode)
      .single();

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
    const { data, error } = await this.supabase.client
      .from("stock_items")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      this.notificationService.addNotification(
        "Erro ao atualizar item no estoque: " + error.message
      );
      return null;
    }

    return data as StockItem;
  }

  async fetchRecentStockItems(limit = 10): Promise<StockItem[]> {
    const { data, error } = await this.supabase.client
      .from("stock_items")
      .select(`
        *,
        warehouse:warehouses(*),
        created_by_admin:users!created_by_admin_id(name)
      `)
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error) {
      this.notificationService.addNotification(
        "Erro ao carregar itens do estoque: " + error.message
      );
      return [];
    }

    return (data || []) as StockItem[];
  }
}
