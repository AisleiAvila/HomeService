import { Injectable, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";

@Injectable({
  providedIn: "root",
})
export class UserWarehousesService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  // Warehouse IDs associated to the currently logged-in app user.
  readonly currentUserWarehouseIds = signal<number[] | null>(null);

  async fetchWarehouseIdsForUser(userId: number): Promise<number[]> {
    const { data, error } = await this.supabase.client
      .from("user_warehouses")
      .select("warehouse_id")
      .eq("user_id", userId);

    if (error) {
      console.error("[UserWarehousesService] Error fetching user warehouses:", error);
      return [];
    }

    return (data || [])
      .map((row: { warehouse_id?: number | null }) => row.warehouse_id)
      .filter((id: number | null | undefined): id is number => typeof id === "number");
  }

  async refreshCurrentUserWarehouses(): Promise<number[]> {
    const user = this.auth.appUser();
    if (!user) {
      this.currentUserWarehouseIds.set(null);
      return [];
    }

    const ids = await this.fetchWarehouseIdsForUser(user.id);
    this.currentUserWarehouseIds.set(ids);
    return ids;
  }

  async setWarehousesForUser(userId: number, warehouseIds: number[]): Promise<void> {
    // Normalize list
    const uniqueIds = Array.from(
      new Set((warehouseIds || []).filter((id) => typeof id === "number"))
    );

    const { error: deleteError } = await this.supabase.client
      .from("user_warehouses")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("[UserWarehousesService] Error clearing user warehouses:", deleteError);
      throw deleteError;
    }

    if (uniqueIds.length === 0) {
      return;
    }

    const rows = uniqueIds.map((warehouseId) => ({
      user_id: userId,
      warehouse_id: warehouseId,
    }));

    const { error: insertError } = await this.supabase.client
      .from("user_warehouses")
      .insert(rows);

    if (insertError) {
      console.error("[UserWarehousesService] Error setting user warehouses:", insertError);
      throw insertError;
    }

    const current = this.auth.appUser();
    if (current?.id === userId) {
      this.currentUserWarehouseIds.set(uniqueIds);
    }
  }
}
