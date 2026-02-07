import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { ServiceRequestMaterial } from "../models/maintenance.models";

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
    return raw.map((row) => {
      const embedded = row?.stock_item;
      const normalizedStockItem = Array.isArray(embedded)
        ? (embedded[0] ?? null)
        : (embedded ?? null);

      return {
        ...row,
        stock_item: normalizedStockItem,
      } as ServiceRequestMaterial;
    });
  }

  async upsert(payload: UpsertServiceRequestMaterialPayload): Promise<boolean> {
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
