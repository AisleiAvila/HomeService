import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { Evaluation, ServiceRequest } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class EvaluationService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Obter avaliação média de um usuário
   */
  async getAverageRating(userId: number): Promise<{
    average: number;
    count: number;
    distribution: Record<number, number>;
  }> {
    const { data, error } = await this.supabase.client
      .from("evaluations")
      .select("rating")
      .eq("evaluated_id", userId);

    if (error) {
      console.error("Error fetching average rating:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return { average: 0, count: 0, distribution: {} };
    }

    const ratings = data.map((e) => e.rating);
    const average =
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    // Calcular distribuição de notas
    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = ratings.filter((r) => r === i).length;
    }

    return {
      average: Math.round(average * 100) / 100,
      count: ratings.length,
      distribution,
    };
  }

  /**
   * Obter histórico de avaliações de um usuário
   */
  async getEvaluationHistory(
    userId: number,
    asEvaluator = false
  ): Promise<Evaluation[]> {
    const column = asEvaluator ? "evaluator_id" : "evaluated_id";

    const { data, error } = await this.supabase.client
      .from("evaluations")
      .select(
        `
        *,
        service_requests!inner(id, title, category),
        evaluator:users!evaluations_evaluator_id_fkey(id, name),
        evaluated:users!evaluations_evaluated_id_fkey(id, name)
      `
      )
      .eq(column, userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching evaluation history:", error);
      throw error;
    }

    return data as Evaluation[];
  }

  /**
   * Obter avaliações de um pedido específico
   */
  async getServiceRequestEvaluations(
    serviceRequestId: number
  ): Promise<Evaluation[]> {
    const { data, error } = await this.supabase.client
      .from("evaluations")
      .select(
        `
        *,
        evaluator:users!evaluations_evaluator_id_fkey(id, name, role),
        evaluated:users!evaluations_evaluated_id_fkey(id, name, role)
      `
      )
      .eq("service_request_id", serviceRequestId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching service request evaluations:", error);
      throw error;
    }

    return data as Evaluation[];
  }

  /**
   * Obter estatísticas de avaliação para dashboard
   */
  async getEvaluationStats(): Promise<{
    total_evaluations: number;
    average_rating: number;
    pending_evaluations: number;
    recent_evaluations: Evaluation[];
  }> {
    // Total de avaliações
    const { count: totalEvaluations } = await this.supabase.client
      .from("evaluations")
      .select("*", { count: "exact", head: true });

    // Média geral
    const { data: ratingsData } = await this.supabase.client
      .from("evaluations")
      .select("rating");

    const averageRating =
      ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, e) => sum + e.rating, 0) / ratingsData.length
        : 0;

    // Avaliações pendentes (serviços concluídos sem avaliação mútua)
    const { count: pendingEvaluations } = await this.supabase.client
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["Aprovado pelo cliente", "Pago"])
      .eq("mutual_evaluation_completed", false);

    // Avaliações recentes
    const { data: recentEvaluations } = await this.supabase.client
      .from("evaluations")
      .select(
        `
        *,
        service_requests!inner(id, title),
        evaluator:users!evaluations_evaluator_id_fkey(name),
        evaluated:users!evaluations_evaluated_id_fkey(name)
      `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      total_evaluations: totalEvaluations || 0,
      average_rating: Math.round(averageRating * 100) / 100,
      pending_evaluations: pendingEvaluations || 0,
      recent_evaluations: (recentEvaluations as Evaluation[]) || [],
    };
  }

  /**
   * Métodos privados
   */
  private async getServiceRequest(
    serviceRequestId: number
  ): Promise<ServiceRequest | null> {
    const { data, error } = await this.supabase.client
      .from("service_requests")
      .select("*")
      .eq("id", serviceRequestId)
      .single();

    if (error) {
      console.error("Error fetching service request:", error);
      return null;
    }

    return data as ServiceRequest;
  }

  private async getEvaluation(
    serviceRequestId: number,
    evaluatorId: number,
    evaluatedId: number
  ): Promise<Evaluation | null> {
    const { data, error } = await this.supabase.client
      .from("evaluations")
      .select("*")
      .eq("service_request_id", serviceRequestId)
      .eq("evaluator_id", evaluatorId)
      .eq("evaluated_id", evaluatedId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching evaluation:", error);
    }

    return (data as Evaluation) || null;
  }

}

