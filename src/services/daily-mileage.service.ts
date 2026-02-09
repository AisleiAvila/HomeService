import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
import { DailyMileage, Fueling, User } from '../models/maintenance.models';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root',
})
export class DailyMileageService {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly dataService = inject(DataService);

  // Signals for reactive state
  private readonly _dailyMileages = signal<DailyMileage[]>([]);
  dailyMileages = this._dailyMileages.asReadonly();

  private readonly _fuelings = signal<Fueling[]>([]);
  fuelings = this._fuelings.asReadonly();

  private readonly _professionals = signal<User[]>([]);
  professionals = this._professionals.asReadonly();

  async loadDailyMileages(professionalId: number): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('daily_mileages')
        .select('*')
        .eq('professional_id', professionalId)
        .order('date', { ascending: false });

      if (error) throw error;
      this._dailyMileages.set(data || []);
    } catch (error) {
      console.error('Error loading daily mileages:', error);
      this.notificationService.addNotification('Erro ao carregar kilometragens diárias');
    }
  }

  async loadAllDailyMileages(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('daily_mileages')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      this._dailyMileages.set(data || []);
    } catch (error) {
      console.error('Error loading all daily mileages:', error);
      this.notificationService.addNotification('Erro ao carregar todas as kilometragens diárias');
    }
  }

  async loadProfessionals(): Promise<void> {
    try {
      // Use DataService.users() signal to get professionals
      const allUsers = this.dataService.users();
      const professionals = allUsers.filter(user => user.role === 'professional' || user.role === 'professional_almoxarife');
      this._professionals.set(professionals);
    } catch (error) {
      console.error('Error loading professionals:', error);
      this.notificationService.addNotification('Erro ao carregar profissionais');
    }
  }

  async createDailyMileage(dailyMileage: Omit<DailyMileage, 'id' | 'created_at' | 'updated_at'>): Promise<DailyMileage | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('daily_mileages')
        .insert(dailyMileage)
        .select()
        .single();

      if (error) throw error;

      this.notificationService.addNotification('Quilometragem diária criada com sucesso');
      return data;
    } catch (error) {
      console.error('Error creating daily mileage:', error);
      const errorCode = (error as { code?: string })?.code;
      if (errorCode === '23505') {
        this.notificationService.addNotification('Já existe uma quilometragem registrada para este profissional nesta data');
        return null;
      }
      this.notificationService.addNotification('Erro ao criar quilometragem diária');
      return null;
    }
  }

  async updateDailyMileage(id: number, updates: Partial<DailyMileage>): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('daily_mileages')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      this.notificationService.addNotification('Quilometragem diária atualizada com sucesso');
    } catch (error) {
      console.error('Error updating daily mileage:', error);
      this.notificationService.addNotification('Erro ao atualizar quilometragem diária');
    }
  }

  async loadFuelings(dailyMileageId: number): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('fuelings')
        .select('*')
        .eq('daily_mileage_id', dailyMileageId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      this._fuelings.set(data || []);
    } catch (error) {
      console.error('Error loading fuelings:', error);
      this.notificationService.addNotification('Erro ao carregar abastecimentos');
    }
  }

  async loadAllFuelings(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('fuelings')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      this._fuelings.set(data || []);
    } catch (error) {
      console.error('Error loading all fuelings:', error);
      this.notificationService.addNotification('Erro ao carregar abastecimentos');
    }
  }

  async addFueling(fueling: Omit<Fueling, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('fuelings')
        .insert(fueling);

      if (error) throw error;

      // Reload all fuelings
      await this.loadAllFuelings();
      this.notificationService.addNotification('Abastecimento adicionado com sucesso');
    } catch (error) {
      console.error('Error adding fueling:', error);
      this.notificationService.addNotification('Erro ao adicionar abastecimento');
    }
  }

  async updateFueling(id: number, updates: Partial<Fueling>): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('fuelings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Reload all fuelings
      await this.loadAllFuelings();
      this.notificationService.addNotification('Abastecimento atualizado com sucesso');
    } catch (error) {
      console.error('Error updating fueling:', error);
      this.notificationService.addNotification('Erro ao atualizar abastecimento');
    }
  }

  async deleteFueling(id: number): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('fuelings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reload all fuelings
      await this.loadAllFuelings();
      this.notificationService.addNotification('Abastecimento removido com sucesso');
    } catch (error) {
      console.error('Error deleting fueling:', error);
      this.notificationService.addNotification('Erro ao remover abastecimento');
    }
  }

  async uploadReceiptImage(file: File): Promise<string | null> {
    try {
      const fileName = `fueling-receipts/${Date.now()}-${file.name}`;
      const { error } = await this.supabase.client.storage
        .from('receipts')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = this.supabase.client.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading receipt image:', error);
      this.notificationService.addNotification('Erro ao fazer upload da imagem do recibo');
      return null;
    }
  }
}