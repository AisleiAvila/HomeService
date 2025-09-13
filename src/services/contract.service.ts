import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { ServiceRequest, Contract, User } from "../models/maintenance.models";

@Injectable({
  providedIn: "root",
})
export class ContractService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  /**
   * Gerar contrato digital para um pedido de serviço
   */
  async generateContract(serviceRequest: ServiceRequest): Promise<string> {
    const contractData = await this.buildContractData(serviceRequest);

    // Salvar contrato no banco
    const { data, error } = await this.supabase.client
      .from("contracts")
      .insert({
        service_request_id: serviceRequest.id,
        contract_data: contractData,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error generating contract:", error);
      throw error;
    }

    // Atualizar service_request com URL do contrato
    const contractUrl = this.generateContractUrl(data.id);
    await this.supabase.client
      .from("service_requests")
      .update({
        contract_url: contractUrl,
        contract_generated_at: new Date().toISOString(),
      })
      .eq("id", serviceRequest.id);

    return contractUrl;
  }

  /**
   * Obter contrato por ID do service request
   */
  async getContract(serviceRequestId: number): Promise<Contract | null> {
    const { data, error } = await this.supabase.client
      .from("contracts")
      .select("*")
      .eq("service_request_id", serviceRequestId)
      .single();

    if (error) {
      console.error("Error fetching contract:", error);
      return null;
    }

    return data as Contract;
  }

  /**
   * Cliente assina contrato
   */
  async signContractByClient(contractId: number): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser || currentUser.role !== "client") {
      throw new Error("Only client can sign contract");
    }

    const { error } = await this.supabase.client
      .from("contracts")
      .update({ signed_by_client_at: new Date().toISOString() })
      .eq("id", contractId);

    if (error) {
      console.error("Error signing contract by client:", error);
      throw error;
    }
  }

  /**
   * Profissional assina contrato
   */
  async signContractByProfessional(contractId: number): Promise<void> {
    const currentUser = this.authService.appUser();
    if (!currentUser || currentUser.role !== "professional") {
      throw new Error("Only professional can sign contract");
    }

    const { error } = await this.supabase.client
      .from("contracts")
      .update({ signed_by_professional_at: new Date().toISOString() })
      .eq("id", contractId);

    if (error) {
      console.error("Error signing contract by professional:", error);
      throw error;
    }
  }

  /**
   * Verificar se contrato está totalmente assinado
   */
  async isContractFullySigned(contractId: number): Promise<boolean> {
    const contract = await this.getContractById(contractId);
    return !!(
      contract?.signed_by_client_at && contract?.signed_by_professional_at
    );
  }

  /**
   * Gerar PDF do contrato
   */
  async generateContractPDF(contractId: number): Promise<Blob> {
    const contract = await this.getContractById(contractId);
    if (!contract) {
      throw new Error("Contract not found");
    }

    // Gerar HTML do contrato
    const htmlContent = this.generateContractHTML(contract);

    // Converter para PDF (implementação simplificada)
    // Em produção, usar biblioteca como jsPDF ou Puppeteer
    const blob = new Blob([htmlContent], { type: "text/html" });
    return blob;
  }

  /**
   * Métodos privados
   */
  private async buildContractData(
    serviceRequest: ServiceRequest
  ): Promise<any> {
    // Buscar dados do cliente e profissional
    const [clientData, professionalData] = await Promise.all([
      this.getUserById(serviceRequest.client_id),
      serviceRequest.professional_id
        ? this.getUserById(serviceRequest.professional_id)
        : null,
    ]);

    return {
      service_request_id: serviceRequest.id,
      title: serviceRequest.title,
      description: serviceRequest.description,
      category: serviceRequest.category,
      quote_amount: serviceRequest.quote_amount,
      quote_description: serviceRequest.quote_description,
      location: {
        street: serviceRequest.street,
        city: serviceRequest.city,
        state: serviceRequest.state,
        zip_code: serviceRequest.zip_code,
      },
      client: {
        id: clientData?.id,
        name: clientData?.name,
        email: clientData?.email,
        phone: clientData?.phone,
        address: clientData?.address,
      },
      professional: professionalData
        ? {
            id: professionalData.id,
            name: professionalData.name,
            email: professionalData.email,
            phone: professionalData.phone,
            specialties: professionalData.specialties,
          }
        : null,
      terms_and_conditions: this.getTermsAndConditions(),
      payment_terms: this.getPaymentTerms(),
      scheduled_date: serviceRequest.scheduled_start_datetime,
      estimated_duration: serviceRequest.estimated_duration_minutes,
      contract_version: "1.0",
      generated_at: new Date().toISOString(),
    };
  }

  private async getUserById(userId: number): Promise<User | null> {
    const { data, error } = await this.supabase.client
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      return null;
    }

    return data as User;
  }

  private async getContractById(contractId: number): Promise<Contract | null> {
    const { data, error } = await this.supabase.client
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .single();

    if (error) {
      console.error("Error fetching contract:", error);
      return null;
    }

    return data as Contract;
  }

  private generateContractUrl(contractId: number): string {
    return `/contracts/${contractId}`;
  }

  private generateContractHTML(contract: Contract): string {
    const data = contract.contract_data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Contrato de Serviço - ${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .parties { display: flex; justify-content: space-between; }
          .party { width: 45%; }
          .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature { width: 40%; border-top: 1px solid #333; text-align: center; padding-top: 10px; }
          .amount { font-size: 1.2em; font-weight: bold; color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
          <p>HomeService - Plataforma de Serviços</p>
          <p>Contrato #${contract.id} | Gerado em ${new Date(
      contract.generated_at
    ).toLocaleDateString("pt-PT")}</p>
        </div>

        <div class="section">
          <h3>1. PARTES CONTRATANTES</h3>
          <div class="parties">
            <div class="party">
              <h4>CONTRATANTE (Cliente)</h4>
              <p><strong>Nome:</strong> ${data.client.name}</p>
              <p><strong>Email:</strong> ${data.client.email}</p>
              <p><strong>Telefone:</strong> ${data.client.phone || "N/A"}</p>
            </div>
            <div class="party">
              <h4>CONTRATADO (Profissional)</h4>
              <p><strong>Nome:</strong> ${
                data.professional?.name || "A ser definido"
              }</p>
              <p><strong>Email:</strong> ${
                data.professional?.email || "N/A"
              }</p>
              <p><strong>Especialidades:</strong> ${
                data.professional?.specialties?.join(", ") || "N/A"
              }</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>2. OBJETO DO CONTRATO</h3>
          <p><strong>Serviço:</strong> ${data.title}</p>
          <p><strong>Categoria:</strong> ${data.category}</p>
          <p><strong>Descrição:</strong> ${data.description}</p>
          ${
            data.quote_description
              ? `<p><strong>Detalhes do Orçamento:</strong> ${data.quote_description}</p>`
              : ""
          }
        </div>

        <div class="section">
          <h3>3. LOCAL DE EXECUÇÃO</h3>
          <p>${data.location.street}</p>
          <p>${data.location.city}, ${data.location.state}</p>
          <p>CEP: ${data.location.zip_code}</p>
        </div>

        <div class="section">
          <h3>4. VALOR E CONDIÇÕES DE PAGAMENTO</h3>
          <p class="amount">Valor Total: €${
            data.quote_amount?.toFixed(2) || "0.00"
          }</p>
          <p><strong>Condições de Pagamento:</strong></p>
          <ul>
            ${data.payment_terms
              .map((term: string) => `<li>${term}</li>`)
              .join("")}
          </ul>
        </div>

        <div class="section">
          <h3>5. PRAZO E CRONOGRAMA</h3>
          ${
            data.scheduled_date
              ? `<p><strong>Data/Hora Agendada:</strong> ${new Date(
                  data.scheduled_date
                ).toLocaleString("pt-PT")}</p>`
              : ""
          }
          ${
            data.estimated_duration
              ? `<p><strong>Duração Estimada:</strong> ${data.estimated_duration} minutos</p>`
              : ""
          }
        </div>

        <div class="section">
          <h3>6. TERMOS E CONDIÇÕES</h3>
          <ul>
            ${data.terms_and_conditions
              .map((term: string) => `<li>${term}</li>`)
              .join("")}
          </ul>
        </div>

        <div class="signature-area">
          <div class="signature">
            <p>Cliente</p>
            <p>${data.client.name}</p>
            ${
              contract.signed_by_client_at
                ? `<p><small>Assinado em: ${new Date(
                    contract.signed_by_client_at
                  ).toLocaleString("pt-PT")}</small></p>`
                : "<p><small>Pendente</small></p>"
            }
          </div>
          <div class="signature">
            <p>Profissional</p>
            <p>${data.professional?.name || "A ser definido"}</p>
            ${
              contract.signed_by_professional_at
                ? `<p><small>Assinado em: ${new Date(
                    contract.signed_by_professional_at
                  ).toLocaleString("pt-PT")}</small></p>`
                : "<p><small>Pendente</small></p>"
            }
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getTermsAndConditions(): string[] {
    return [
      "O profissional se compromete a executar o serviço com qualidade e pontualidade.",
      "O cliente deve fornecer acesso adequado ao local do serviço.",
      "Eventuais materiais necessários serão acordados previamente entre as partes.",
      "O pagamento deve ser efetuado conforme as condições estabelecidas.",
      "Ambas as partes podem cancelar o contrato com 24h de antecedência, salvo casos urgentes.",
      "A HomeService atua como intermediadora da transação.",
      "Disputas serão resolvidas através do sistema de mediação da plataforma.",
      "Este contrato é regido pelas leis portuguesas.",
    ];
  }

  private getPaymentTerms(): string[] {
    return [
      "Pagamento após aprovação do trabalho pelo cliente.",
      "Prazo máximo de 7 dias após aprovação.",
      "Taxa da plataforma: 7% do valor total.",
      "Pagamentos processados através da plataforma HomeService.",
      "Reembolsos serão processados conforme política da plataforma.",
    ];
  }
}
