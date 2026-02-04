import { Injectable, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { Warehouse } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class WarehouseService {
  private readonly supabase = inject(SupabaseService);

  readonly warehouses = signal<Warehouse[]>([]);

  async fetchWarehouses(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from("warehouses")
      .select("*")
      .order("name", { ascending: true });
    if (!error && data) {
      this.warehouses.set(data as Warehouse[]);
    } else {
      this.warehouses.set([]);
    }
  }
}
