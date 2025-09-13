import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { ServiceRequest, Payment } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class PaymentService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  // Taxa da plataforma (7%)
  private readonly PLATFORM_FEE_RATE = 0.07;

  /**
   * Calcular taxa da plataforma
   */
  calculatePlatformFee(amount: number): number {
    return Math.round(amount * this.PLATFORM_FEE_RATE * 100) / 100;
  }

  /**
   * Calcular valor a ser pago ao profissional
   */
  calculateProfessionalPayment(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount);
    return Math.round((amount - platformFee) * 100) / 100;
  }

  /**
   * Criar registro de pagamento
   */
  async createPaymentRecord(
    serviceRequestId: number,
    amount: number,
    paymentMethod?: string
  ): Promise<Payment> {
    const platformFee = this.calculatePlatformFee(amount);
    const professionalAmount = this.calculateProfessionalPayment(amount);

    const paymentData = {
      service_request_id: serviceRequestId,
      amount,
      platform_fee: platformFee,
      professional_amount: professionalAmount,
      payment_method: paymentMethod,
      status: "pending" as const,
      processed_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase.client
      .from("payments")
      .insert(paymentData)
      .select()
      .single();

    if (error) {
      console.error("Error creating payment record:", error);
      throw error;
    }

    return data as Payment;
  }

  /**
   * Processar pagamento
   */
  async processPayment(
    serviceRequestId: number,
    amount: number,
    paymentMethod: string,
    paymentData: any
  ): Promise<Payment> {
    try {
      // 1. Criar registro de pagamento
      const payment = await this.createPaymentRecord(
        serviceRequestId,
        amount,
        paymentMethod
      );

      // 2. Processar pagamento (simulação - em produção usar gateway como Stripe/PayPal)
      const paymentResult = await this.processWithGateway(payment, paymentData);

      // 3. Atualizar status baseado no resultado
      const updatedPayment = await this.updatePaymentStatus(
        payment.id,
        paymentResult.success ? "completed" : "failed"
      );

      // 4. Atualizar service_request
      if (paymentResult.success) {
        await this.updateServiceRequestPayment(serviceRequestId, payment);
      }

      // 5. Notificar stakeholders
      await this.notifyPaymentProcessed(
        serviceRequestId,
        paymentResult.success
      );

      return updatedPayment;
    } catch (error) {
      console.error("Error processing payment:", error);
      throw error;
    }
  }

  /**
   * Liberar fundos para o profissional
   */
  async releaseFunds(paymentId: number): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admin can release funds");
    }

    // Buscar dados do pagamento
    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "completed") {
      throw new Error("Payment must be completed before releasing funds");
    }

    // Simular liberação de fundos
    await this.releaseFundsToGateway(payment);

    // Atualizar status
    const { error } = await this.supabase.client
      .from("payments")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (error) {
      console.error("Error releasing funds:", error);
      throw error;
    }

    // Notificar profissional
    await this.notifyFundsReleased(payment.service_request_id);
  }

  /**
   * Obter histórico de pagamentos
   */
  async getPaymentHistory(
    serviceRequestId?: number,
    userId?: number
  ): Promise<Payment[]> {
    let query = this.supabase.client
      .from("payments")
      .select(
        `
        *,
        service_requests!inner(
          id,
          title,
          client_id,
          professional_id
        )
      `
      )
      .order("processed_at", { ascending: false });

    if (serviceRequestId) {
      query = query.eq("service_request_id", serviceRequestId);
    }

    if (userId) {
      query = query.or(
        `service_requests.client_id.eq.${userId},service_requests.professional_id.eq.${userId}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching payment history:", error);
      throw error;
    }

    return data as Payment[];
  }

  /**
   * Obter estatísticas financeiras
   */
  async getFinancialStats(): Promise<{
    total_revenue: number;
    platform_fees: number;
    professional_earnings: number;
    pending_payments: number;
    completed_payments: number;
    disputed_payments: number;
  }> {
    const { data, error } = await this.supabase.client
      .from("payments")
      .select("amount, platform_fee, professional_amount, status");

    if (error) {
      console.error("Error fetching financial stats:", error);
      throw error;
    }

    const stats = {
      total_revenue: 0,
      platform_fees: 0,
      professional_earnings: 0,
      pending_payments: 0,
      completed_payments: 0,
      disputed_payments: 0,
    };

    data.forEach((payment: any) => {
      stats.total_revenue += payment.amount || 0;
      stats.platform_fees += payment.platform_fee || 0;
      stats.professional_earnings += payment.professional_amount || 0;

      switch (payment.status) {
        case "pending":
        case "processing":
          stats.pending_payments++;
          break;
        case "completed":
        case "released":
          stats.completed_payments++;
          break;
        case "disputed":
          stats.disputed_payments++;
          break;
      }
    });

    return stats;
  }

  /**
   * Processar reembolso
   */
  async processRefund(
    paymentId: number,
    amount?: number,
    reason?: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admin can process refunds");
    }

    const payment = await this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    const refundAmount = amount || payment.amount;

    // Processar reembolso via gateway
    await this.processRefundWithGateway(payment, refundAmount, reason);

    // Registrar reembolso
    await this.supabase.client.from("payment_refunds").insert({
      payment_id: paymentId,
      amount: refundAmount,
      reason,
      processed_by: currentUser.id,
      processed_at: new Date().toISOString(),
    });

    // Atualizar status do pagamento
    await this.updatePaymentStatus(paymentId, "refunded");

    // Notificar cliente
    await this.notifyRefundProcessed(payment.service_request_id, refundAmount);
  }

  /**
   * Iniciar disputa de pagamento
   */
  async initiatePaymentDispute(
    paymentId: number,
    reason: string
  ): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Atualizar status do pagamento
    await this.updatePaymentStatus(paymentId, "disputed");

    // Criar registro de disputa
    const payment = await this.getPaymentById(paymentId);
    if (payment) {
      await this.supabase.client.from("disputes").insert({
        service_request_id: payment.service_request_id,
        opened_by: currentUser.id,
        reason: `Disputa de pagamento: ${reason}`,
        status: "open",
      });
    }

    // Notificar administradores
    await this.notificationService.notifyByRole(
      ["admin"],
      "payment_due",
      "Disputa de Pagamento",
      `Nova disputa de pagamento iniciada. Motivo: ${reason}`,
      {
        serviceRequestId: payment?.service_request_id,
        actionRequired: true,
        priority: "high",
      }
    );
  }

  /**
   * Métodos privados
   */
  private async getPaymentById(paymentId: number): Promise<Payment | null> {
    const { data, error } = await this.supabase.client
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (error) {
      console.error("Error fetching payment:", error);
      return null;
    }

    return data as Payment;
  }

  private async updatePaymentStatus(
    paymentId: number,
    status: Payment["status"]
  ): Promise<Payment> {
    const { data, error } = await this.supabase.client
      .from("payments")
      .update({ status })
      .eq("id", paymentId)
      .select()
      .single();

    if (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }

    return data as Payment;
  }

  private async updateServiceRequestPayment(
    serviceRequestId: number,
    payment: Payment
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from("service_requests")
      .update({
        payment_status: "Paid",
        payment_completed_at: new Date().toISOString(),
        platform_fee: payment.platform_fee,
        professional_payment: payment.professional_amount,
      })
      .eq("id", serviceRequestId);

    if (error) {
      console.error("Error updating service request payment:", error);
      throw error;
    }
  }

  // Simulação de gateway de pagamento
  private async processWithGateway(
    payment: Payment,
    paymentData: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // Simulação - em produção, usar API real de gateway
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular sucesso em 95% dos casos
        const success = Math.random() > 0.05;

        if (success) {
          resolve({
            success: true,
            transactionId: `txn_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
          });
        } else {
          resolve({
            success: false,
            error: "Cartão rejeitado",
          });
        }
      }, 2000); // Simular delay do gateway
    });
  }

  private async releaseFundsToGateway(payment: Payment): Promise<void> {
    // Simulação de liberação de fundos
    console.log(
      `Releasing €${payment.professional_amount} to professional for payment #${payment.id}`
    );

    // Em produção, usar API do gateway para transferir fundos
    return Promise.resolve();
  }

  private async processRefundWithGateway(
    payment: Payment,
    amount: number,
    reason?: string
  ): Promise<void> {
    // Simulação de reembolso
    console.log(
      `Processing refund of €${amount} for payment #${payment.id}. Reason: ${
        reason || "No reason provided"
      }`
    );

    // Em produção, usar API do gateway para processar reembolso
    return Promise.resolve();
  }

  private async notifyPaymentProcessed(
    serviceRequestId: number,
    success: boolean
  ): Promise<void> {
    if (success) {
      await this.notificationService.notifyServiceRequestStakeholders(
        serviceRequestId,
        "payment_completed",
        "Pagamento Processado",
        "O pagamento foi processado com sucesso.",
        ["professional", "admin"],
        { priority: "medium" }
      );
    } else {
      await this.notificationService.notifyServiceRequestStakeholders(
        serviceRequestId,
        "payment_due",
        "Falha no Pagamento",
        "Houve um problema no processamento do pagamento. Tente novamente.",
        ["client"],
        {
          actionRequired: true,
          priority: "high",
        }
      );
    }
  }

  private async notifyFundsReleased(serviceRequestId: number): Promise<void> {
    await this.notificationService.notifyServiceRequestStakeholders(
      serviceRequestId,
      "payment_completed",
      "Fundos Liberados",
      "Seus fundos foram liberados e transferidos para sua conta.",
      ["professional"],
      { priority: "medium" }
    );
  }

  private async notifyRefundProcessed(
    serviceRequestId: number,
    amount: number
  ): Promise<void> {
    await this.notificationService.notifyServiceRequestStakeholders(
      serviceRequestId,
      "payment_completed",
      "Reembolso Processado",
      `Seu reembolso de €${amount.toFixed(
        2
      )} foi processado e será creditado em sua conta.`,
      ["client"],
      { priority: "medium" }
    );
  }
}
