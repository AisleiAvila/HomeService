import { Injectable, inject } from "@angular/core";
import type { ServiceRequest, TechnicalReportRecord } from "../models/maintenance.models";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { SupabaseService } from "./supabase.service";
import { TechnicalReportPdfService, type TechnicalReportData, type TechnicalReportPdfOptions } from "./technical-report-pdf.service";

@Injectable({ providedIn: "root" })
export class TechnicalReportStorageService {
    /**
     * Salva cada serviço extra da Radio Popular na tabela extra_service_items, aplicando regras de reembolso.
     */
    private async persistExtraServiceItems(
      request: ServiceRequest,
      professionalId: number,
      extraServices: Array<{ description: string; value: number | null }>,
      isNatanEmployee: boolean
    ): Promise<void> {
      if (!extraServices || extraServices.length === 0) return;
      const itemsToInsert = extraServices.map((item) => {
        // Regra de reembolso
        let hasReimbursement = false;
        let reimbursementValue: number | null = null;
        if (isNatanEmployee) {
          hasReimbursement = true;
          reimbursementValue = item.value ? Number((item.value * 0.5).toFixed(2)) : 0;
        }
        return {
          service_request_id: request.id,
          professional_id: professionalId,
          description: item.description,
          value: item.value ?? 0,
          has_reimbursement: hasReimbursement,
          reimbursement_value: reimbursementValue,
          reimbursement_date: null, // Preenchido quando houver reembolso
        };
      });
      const { error } = await this.supabase.client
        .from("extra_service_items")
        .insert(itemsToInsert);
      if (error) {
        this.notificationService.showError("Erro ao salvar serviços extras: " + error.message);
        throw new Error("Erro ao salvar serviços extras: " + error.message);
      }
    }
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly pdfService = inject(TechnicalReportPdfService);

  private readonly BUCKET_NAME = "technical-reports";
  private readonly MIME_TYPE = "application/pdf";

  async generatePersistAndDownload(
    request: ServiceRequest,
    payload: TechnicalReportData,
    options?: TechnicalReportPdfOptions
  ): Promise<TechnicalReportRecord> {
    const currentUser = this.authService.appUser();
    if (!currentUser) {
      throw new Error("Usuário não autenticado");
    }

    // Generate PDF

    const pdfResult = await this.pdfService.generatePdfBlob(request, payload, options);
    if (!pdfResult) {
      this.notificationService.showError("Falha ao gerar o PDF do relatório técnico.");
      throw new Error("Falha ao gerar o PDF do relatório técnico.");
    }
    const { blob, fileName, issuedAt } = pdfResult;
    const pdfFile = new File([blob], fileName, { type: this.MIME_TYPE });
    // Se for relatório da Radio Popular, Worten Verde ou Worten Azul, salvar serviços extras detalhadamente
    if ((payload.origin === "radio_popular" && payload.data?.extraServicesInstalled?.length) ||
        (payload.origin === "worten_verde" && payload.data?.extraServicesInstalled?.length) ||
        (payload.origin === "worten_azul" && payload.data?.extraServicesInstalled?.length)) {
      // Buscar se o profissional é funcionário da Natan
      let isNatanEmployee = false;
      try {
        // Tenta acessar a lista de usuários global (DataService)
        const dataService = (globalThis as any).ng?.getInjector?.()?.get?.(require("../../services/data.service").DataService);
        if (dataService && typeof dataService.allUsers === 'function') {
          const prof = dataService.allUsers().find((u: any) => u.id === request.professional_id);
          isNatanEmployee = !!prof?.is_natan_employee;
        }
      } catch {
        // fallback: não encontrado
      }
      // Para Worten Azul, o campo extraServicesInstalled pode não existir, então garantir fallback
      let extraServices: Array<{ description: string; value: number | null }> = [];
      if (payload.origin === "worten_azul") {
        extraServices = (payload.data as any).extraServicesInstalled || [];
      } else {
        extraServices = payload.data.extraServicesInstalled;
      }
      if (extraServices && extraServices.length > 0) {
        await this.persistExtraServiceItems(
          request,
          request.professional_id,
          extraServices,
          isNatanEmployee
        );
      }
    }

    // Upload to Storage (use a unique path to avoid collisions)
    const yyyy = issuedAt.getFullYear();
    const mm = String(issuedAt.getMonth() + 1).padStart(2, "0");
    const dd = String(issuedAt.getDate()).padStart(2, "0");

    const uniquePrefix = String(Date.now());
    const storagePath = `request_${request.id}/${yyyy}${mm}${dd}/${uniquePrefix}_${fileName}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from(this.BUCKET_NAME)
      .upload(storagePath, pdfFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: this.MIME_TYPE,
      } as any);

    if (uploadError) {
      throw new Error(`Erro ao fazer upload do PDF: ${uploadError.message}`);
    }

    const { data: urlData } = this.supabase.client.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    // Persist record in DB
    const insertPayload = {
      service_request_id: request.id,
      origin_id: request.origin_id ?? null,
      origin_key: payload.origin,
      report_data: payload.data,
      generated_by: currentUser.id,
      storage_bucket: this.BUCKET_NAME,
      storage_path: storagePath,
      file_url: fileUrl,
      file_name: fileName,
      file_size: pdfFile.size,
      mime_type: pdfFile.type,
    };

    const { data, error: insertError } = await this.supabase.client
      .from("technical_reports")
      .insert([insertPayload])
      .select()
      .single();

    if (insertError || !data) {
      // Cleanup uploaded file if DB insert fails
      await this.supabase.client.storage.from(this.BUCKET_NAME).remove([storagePath]);
      throw new Error(`Erro ao salvar relatório no banco de dados: ${insertError?.message || "Falha desconhecida"}`);
    }

    // Trigger download for the user
    this.downloadBlob(blob, fileName);

    this.notificationService.showSuccess("Relatório Técnico gerado e salvo com sucesso.");

    return data as TechnicalReportRecord;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // best-effort (the user can still access the uploaded file via storage URL)
    }
  }
}
