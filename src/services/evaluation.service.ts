import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { Evaluation, ServiceRequest, User } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class EvaluationService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  /**
   * Cliente avalia profissional
   */
  async submitClientEvaluation(
    serviceRequestId: number,
    rating: number,
    feedback?: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser || currentUser.role !== "client") {
      throw new Error("Only client can submit evaluation for professional");
    }

    // Buscar dados do service request
    const serviceRequest = await this.getServiceRequest(serviceRequestId);
    if (!serviceRequest) {
      throw new Error("Service request not found");
    }

    if (!serviceRequest.professional_id) {
      throw new Error("No professional assigned to this request");
    }

    // Verificar se avaliação já existe
    const existingEvaluation = await this.getEvaluation(
      serviceRequestId,
      currentUser.id,
      serviceRequest.professional_id
    );

    if (existingEvaluation) {
      throw new Error("Evaluation already submitted");
    }

    // Criar avaliação
    const evaluationData = {
      service_request_id: serviceRequestId,
      evaluator_id: currentUser.id,
      evaluated_id: serviceRequest.professional_id,
      rating,
      feedback,
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase.client
      .from("evaluations")
      .insert(evaluationData);

    if (error) {
      console.error("Error submitting client evaluation:", error);
      throw error;
    }

    // Atualizar service request
    await this.updateServiceRequestEvaluation(
      serviceRequestId,
      "client_rating",
      rating
    );

    // Verificar se ambas as avaliações foram feitas
    await this.checkMutualEvaluationComplete(serviceRequestId);

    // Notificar profissional
    await this.notificationService.notifyServiceRequestStakeholders(
      serviceRequestId,
      "evaluation_pending",
      "Nova Avaliação Recebida",
      `Você recebeu uma avaliação de ${rating} estrelas.`,
      ["professional"],
      { priority: "low" }
    );
  }

  /**
   * Profissional avalia cliente
   */
  async submitProfessionalEvaluation(
    serviceRequestId: number,
    rating: number,
    feedback?: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser || currentUser.role !== "professional") {
      throw new Error("Only professional can submit evaluation for client");
    }

    // Buscar dados do service request
    const serviceRequest = await this.getServiceRequest(serviceRequestId);
    if (!serviceRequest) {
      throw new Error("Service request not found");
    }

    if (serviceRequest.professional_id !== currentUser.id) {
      throw new Error("You are not the assigned professional for this request");
    }

    // Verificar se avaliação já existe
    const existingEvaluation = await this.getEvaluation(
      serviceRequestId,
      currentUser.id,
      serviceRequest.client_id
    );

    if (existingEvaluation) {
      throw new Error("Evaluation already submitted");
    }

    // Criar avaliação
    const evaluationData = {
      service_request_id: serviceRequestId,
      evaluator_id: currentUser.id,
      evaluated_id: serviceRequest.client_id,
      rating,
      feedback,
      created_at: new Date().toISOString(),
    };

    const { error } = await this.supabase.client
      .from("evaluations")
      .insert(evaluationData);

    if (error) {
      console.error("Error submitting professional evaluation:", error);
      throw error;
    }

    // Atualizar service request
    await this.updateServiceRequestEvaluation(
      serviceRequestId,
      "professional_rating",
      rating
    );

    // Verificar se ambas as avaliações foram feitas
    await this.checkMutualEvaluationComplete(serviceRequestId);

    // Notificar cliente
    await this.notificationService.notifyServiceRequestStakeholders(
      serviceRequestId,
      "evaluation_pending",
      "Nova Avaliação Recebida",
      `Você recebeu uma avaliação de ${rating} estrelas.`,
      ["client"],
      { priority: "low" }
    );
  }

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
   * Verificar se usuário pode avaliar um pedido
   */
  async canEvaluate(
    serviceRequestId: number,
    userId: number
  ): Promise<{
    canEvaluate: boolean;
    reason?: string;
    targetUserId?: number;
    targetUserRole?: string;
  }> {
    const serviceRequest = await this.getServiceRequest(serviceRequestId);
    if (!serviceRequest) {
      return { canEvaluate: false, reason: "Service request not found" };
    }

    // Verificar se o serviço foi aprovado pelo cliente
    if (
      serviceRequest.status !== "Finalizado" &&
      serviceRequest.status !== "Pago"
    ) {
      return {
        canEvaluate: false,
        reason: "Service must be completed and approved",
      };
    }

    let targetUserId: number;
    let targetUserRole: string;

    // Determinar quem será avaliado
    if (serviceRequest.client_id === userId) {
      // Cliente avaliando profissional
      if (!serviceRequest.professional_id) {
        return { canEvaluate: false, reason: "No professional assigned" };
      }
      targetUserId = serviceRequest.professional_id;
      targetUserRole = "professional";
    } else if (serviceRequest.professional_id === userId) {
      // Profissional avaliando cliente
      targetUserId = serviceRequest.client_id;
      targetUserRole = "client";
    } else {
      return {
        canEvaluate: false,
        reason: "User not involved in this service request",
      };
    }

    // Verificar se já avaliou
    const existingEvaluation = await this.getEvaluation(
      serviceRequestId,
      userId,
      targetUserId
    );
    if (existingEvaluation) {
      return { canEvaluate: false, reason: "Already evaluated" };
    }

    return {
      canEvaluate: true,
      targetUserId,
      targetUserRole,
    };
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

  private async updateServiceRequestEvaluation(
    serviceRequestId: number,
    field: "client_rating" | "professional_rating",
    rating: number
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from("service_requests")
      .update({ [field]: rating })
      .eq("id", serviceRequestId);

    if (error) {
      console.error("Error updating service request evaluation:", error);
      throw error;
    }
  }

  private async checkMutualEvaluationComplete(
    serviceRequestId: number
  ): Promise<void> {
    // Buscar service request atual
    const serviceRequest = await this.getServiceRequest(serviceRequestId);
    if (!serviceRequest) return;

    // Verificar se ambas as avaliações foram feitas
    const hasClientRating = serviceRequest.client_rating !== null;
    const hasProfessionalRating = serviceRequest.professional_rating !== null;

    if (hasClientRating && hasProfessionalRating) {
      // Marcar como concluído
      const { error } = await this.supabase.client
        .from("service_requests")
        .update({
          mutual_evaluation_completed: true,
          status: "Finalizado",
        })
        .eq("id", serviceRequestId);

      if (error) {
        console.error("Error marking mutual evaluation as complete:", error);
        return;
      }

      // Notificar partes interessadas
      await this.notificationService.notifyServiceRequestStakeholders(
        serviceRequestId,
        "evaluation_pending",
        "Processo Finalizado",
        "Todas as avaliações foram concluídas. O processo foi finalizado.",
        ["client", "professional", "admin"],
        { priority: "low" }
      );
    }
  }
}
