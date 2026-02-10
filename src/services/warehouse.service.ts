import { Injectable, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { Warehouse } from "../models/maintenance.models";
import { AuthService } from "./auth.service";
import { UserWarehousesService } from "./user-warehouses.service";

@Injectable({
  providedIn: "root",
})
export class WarehouseService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly userWarehouses = inject(UserWarehousesService);

  readonly warehouses = signal<Warehouse[]>([]);

  async fetchWarehouses(): Promise<void> {
    const user = this.auth.appUser();
    if (!user) {
      this.warehouses.set([]);
      return;
    }

    // Admin e Secretário podem ver todos os armazéns.
    if (user.role === "admin" || user.role === "secretario") {
      const { data, error } = await this.supabase.client
        .from("warehouses")
        .select("*")
        .order("name", { ascending: true });
      if (!error && data) {
        this.warehouses.set(data as Warehouse[]);
      } else {
        this.warehouses.set([]);
      }
      return;
    }

    // Stock roles: restrict to assigned warehouses.
    if (user.role === "almoxarife" || user.role === "professional_almoxarife") {
      const ids = await this.userWarehouses.fetchWarehouseIdsForUser(user.id);
      if (ids.length === 0) {
        this.warehouses.set([]);
        return;
      }

      const { data, error } = await this.supabase.client
        .from("warehouses")
        .select("*")
        .in("id", ids)
        .order("name", { ascending: true });

      if (!error && data) {
        this.warehouses.set(data as Warehouse[]);
      } else {
        this.warehouses.set([]);
      }
      return;
    }

    // Other roles: no warehouse visibility by default.
    this.warehouses.set([]);
  }
}
