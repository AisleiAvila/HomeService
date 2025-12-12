import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";

@Injectable({
  providedIn: "root",
})
export class ProfessionalGeolocationService {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Salva coordenadas de geolocalização do profissional no banco de dados
   */
  async saveProfessionalLocation(userId: number, latitude: number, longitude: number): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('users')
      .update({ latitude, longitude })
      .eq('id', userId);
    if (error) {
      this.notificationService.addNotification(
        'Erro ao salvar localização do profissional: ' + error.message
      );
      return false;
    }
    return true;
  }
}
