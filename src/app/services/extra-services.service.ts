import { Injectable, signal, inject } from '@angular/core';
import { ExtraService } from '../../models/maintenance.models';
import { SupabaseService } from '../../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class ExtraServicesService {
  private readonly supabase = inject(SupabaseService);
  private readonly _extraServices = signal<ExtraService[]>([]);
  extraServices = this._extraServices.asReadonly();

  async loadExtraServices(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('extra_service_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      this._extraServices.set(data as ExtraService[]);
    }
  }

  async addExtraService(service: Omit<ExtraService, 'id' | 'created_at'>): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('extra_service_items')
      .insert([service])
      .select();
    if (!error && data) {
      this._extraServices.set([...this._extraServices(), data[0] as ExtraService]);
    }
  }

  async removeExtraService(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('extra_service_items')
      .delete()
      .eq('id', id);
    if (!error) {
      this._extraServices.set(this._extraServices().filter(s => s.id !== id));
    }
  }

  async confirmReimbursement(id: number): Promise<void> {
    const reimbursementDate = new Date().toISOString();
    const { data, error } = await this.supabase.client
      .from('extra_service_items')
      .update({ has_reimbursement: true, reimbursement_date: reimbursementDate })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      this._extraServices.update((items) =>
        items.map((item) => (item.id === id ? (data as ExtraService) : item))
      );
    }
  }
}
