import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { StockItem } from "../models/maintenance.models";

export interface StockItemCreatePayload {
  barcode: string;
  product_name?: string | null;
  quantity: number;
  supplier: string;
  received_at?: string;
  notes?: string | null;
  created_by_admin_id?: number | null;
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

  async fetchRecentStockItems(limit = 10): Promise<StockItem[]> {
    const { data, error } = await this.supabase.client
      .from("stock_items")
      .select("*")
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
