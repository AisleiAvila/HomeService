import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { NotificationService } from "./notification.service";
import { I18nService } from "../i18n.service";
import { AuthService } from "./auth.service";
import {
  ServiceRequestImage,
  ServiceRequestImageUpload,
} from "../models/maintenance.models";

/**
 * Serviço para gerenciamento de imagens de solicitações de serviço
 * Permite profissionais fazerem upload de imagens antes e depois da execução
 */
@Injectable({
  providedIn: "root",
})
export class ServiceImageService {
  private readonly supabase = inject(SupabaseService);
  private readonly notificationService = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly authService = inject(AuthService);

  private readonly BUCKET_NAME = "service-images";
  private readonly MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  private readonly ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  /**
   * Faz upload de uma imagem para o Supabase Storage
   */
  async uploadImage(
    file: File,
    uploadData: ServiceRequestImageUpload,
    userId: number
  ): Promise<ServiceRequestImage | null> {
    try {
      // Validações
      this.validateFile(file);
      await this.validateUploadPermission(uploadData, userId);

      // Gerar nome único para o arquivo
      const fileName = this.generateFileName(
        uploadData.service_request_id,
        uploadData.image_type,
        file.name
      );

      // Upload para o Storage
      const imageUrl = await this.uploadToStorage(file, fileName);

      // Salvar registro no banco de dados
      const imageRecord = await this.saveImageRecord(
        uploadData,
        userId,
        imageUrl,
        file
      );

      this.notificationService.showSuccess(
        this.i18n.translate("imageUploadedSuccessfully")
      );

      return imageRecord;
    } catch (error) {
      console.error("Erro ao fazer upload de imagem:", error);
      this.notificationService.showError(
        error instanceof Error
          ? error.message
          : this.i18n.translate("errorUploadingImage")
      );
      return null;
    }
  }

  /**
   * Valida o arquivo antes do upload
   */
  private validateFile(file: File): void {
    // Verificar tamanho
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `Arquivo muito grande. Tamanho máximo: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Verificar tipo MIME
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(
        `Tipo de arquivo não permitido. Tipos aceitos: ${this.ALLOWED_MIME_TYPES.join(", ")}`
      );
    }
  }

  /**
   * Valida se o usuário tem permissão para fazer upload
   */
  private async validateUploadPermission(
    uploadData: ServiceRequestImageUpload,
    userId: number
  ): Promise<void> {
    const { data: request, error } = await this.supabase.client
      .from("service_requests")
      .select("professional_id, status")
      .is("deleted_at", null)
      .eq("id", uploadData.service_request_id)
      .single();

    if (error || !request) {
      throw new Error("Solicitação de serviço não encontrada");
    }

    // Verificar se o usuário é o profissional da solicitação
    if (request.professional_id !== userId) {
      const currentUser = this.authService.appUser();
      if (currentUser?.role !== "admin") {
        throw new Error(
          "Apenas o profissional atribuído pode fazer upload de imagens"
        );
      }
    }

    // Validar tipo de imagem conforme o status
    if (uploadData.image_type === "before") {
      // Imagens "antes" podem ser adicionadas antes de iniciar
      const allowedStatuses = ["Data Definida", "Aceito", "Aguardando Confirmação"];
      if (!allowedStatuses.includes(request.status)) {
        throw new Error(
          "Imagens 'antes' só podem ser adicionadas antes de iniciar o serviço"
        );
      }
    } else if (uploadData.image_type === "after") {
      // Imagens "depois" só podem ser adicionadas após conclusão
      const allowedStatuses = [
        "Em Progresso",
        "In Progress",
        "Concluído",
      ];
      if (!allowedStatuses.includes(request.status)) {
        throw new Error(
          "Imagens 'depois' só podem ser adicionadas após o serviço estar em progresso"
        );
      }
    }
  }

  /**
   * Gera nome único para o arquivo
   */
  private generateFileName(
    requestId: number,
    imageType: "before" | "after",
    originalName: string
  ): string {
    const timestamp = Date.now();
    const extension = originalName.split(".").pop();
    return `request_${requestId}/${imageType}_${timestamp}.${extension}`;
  }

  /**
   * Faz upload do arquivo para o Supabase Storage
   */
  private async uploadToStorage(
    file: File,
    fileName: string
  ): Promise<string> {
    const { error } = await this.supabase.client.storage
      .from(this.BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    // Obter URL pública da imagem
    const { data: urlData } = this.supabase.client.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  /**
   * Salva registro da imagem no banco de dados
   */
  private async saveImageRecord(
    uploadData: ServiceRequestImageUpload,
    userId: number,
    imageUrl: string,
    file: File
  ): Promise<ServiceRequestImage> {
    const imageRecord = {
      service_request_id: uploadData.service_request_id,
      uploaded_by: userId,
      image_url: imageUrl,
      image_type: uploadData.image_type,
      description: uploadData.description || null,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    };

    const { data, error } = await this.supabase.client
      .from("service_request_images")
      .insert([imageRecord])
      .select()
      .single();

    if (error) {
      // Se falhar ao salvar no DB, tentar deletar do storage
      await this.deleteFromStorage(imageUrl);
      throw new Error(`Erro ao salvar registro da imagem: ${error.message}`);
    }

    return data;
  }

  /**
   * Lista imagens de uma solicitação
   */
  async getImagesByRequest(
    requestId: number,
    imageType?: "before" | "after"
  ): Promise<ServiceRequestImage[]> {
    try {
      let query = this.supabase.client
        .from("service_request_images")
        .select("*")
        .eq("service_request_id", requestId)
        .order("uploaded_at", { ascending: true });

      if (imageType) {
        query = query.eq("image_type", imageType);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Erro ao buscar imagens:", error);
      return [];
    }
  }

  /**
   * Deleta uma imagem
   */
  async deleteImage(imageId: number, userId: number): Promise<boolean> {
    try {
      // Buscar a imagem
      const { data: image, error: fetchError } = await this.supabase.client
        .from("service_request_images")
        .select("*")
        .eq("id", imageId)
        .single();

      if (fetchError || !image) {
        console.error("Erro ao buscar imagem:", fetchError);
        throw new Error("Imagem não encontrada");
      }

      // Buscar informações do pedido de serviço
      const { data: serviceRequest, error: requestError } = await this.supabase.client
        .from("service_requests")
        .select("client_id, professional_id")
        .is("deleted_at", null)
        .eq("id", image.service_request_id)
        .single();

      if (requestError) {
        console.error("Erro ao buscar pedido de serviço:", requestError);
      }

      // Verificar permissão
      const currentUser = this.authService.appUser();
      const isUploader = image.uploaded_by === userId;
      const isAdmin = currentUser?.role === "admin";
      const isClient = serviceRequest?.client_id === userId;
      const isProfessional = serviceRequest?.professional_id === userId;

      console.log("🔐 Verificação de permissão:", {
        userId,
        isUploader,
        isAdmin,
        isClient,
        isProfessional,
        imageUploadedBy: image.uploaded_by,
        clientId: serviceRequest?.client_id,
        professionalId: serviceRequest?.professional_id
      });

      if (!isUploader && !isAdmin && !isClient && !isProfessional) {
        throw new Error("Você não tem permissão para deletar esta imagem");
      }

      // Deletar do storage
      await this.deleteFromStorage(image.image_url);

      // Deletar do banco de dados
      const { error: deleteError } = await this.supabase.client
        .from("service_request_images")
        .delete()
        .eq("id", imageId);

      if (deleteError) throw deleteError;

      this.notificationService.showSuccess(
        this.i18n.translate("imageDeletedSuccessfully")
      );

      return true;
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      this.notificationService.showError(
        error instanceof Error
          ? error.message
          : this.i18n.translate("errorDeletingImage")
      );
      return false;
    }
  }

  /**
   * Deleta arquivo do Supabase Storage
   */
  private async deleteFromStorage(imageUrl: string): Promise<void> {
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = imageUrl.split(`${this.BUCKET_NAME}/`);
      if (urlParts.length < 2) return;

      const filePath = urlParts[1];

      await this.supabase.client.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);
    } catch (error) {
      console.error("Erro ao deletar do storage:", error);
    }
  }

  /**
   * Atualiza descrição de uma imagem
   */
  async updateImageDescription(
    imageId: number,
    description: string,
    userId: number
  ): Promise<boolean> {
    try {
      // Verificar se é o dono da imagem
      const { data: image, error: fetchError } = await this.supabase.client
        .from("service_request_images")
        .select("uploaded_by")
        .eq("id", imageId)
        .single();

      if (fetchError || !image) {
        throw new Error("Imagem não encontrada");
      }

      if (image.uploaded_by !== userId) {
        const currentUser = this.authService.appUser();
        if (currentUser?.role !== "admin") {
          throw new Error(
            "Você não tem permissão para editar esta descrição"
          );
        }
      }

      const { error } = await this.supabase.client
        .from("service_request_images")
        .update({ description })
        .eq("id", imageId);

      if (error) throw error;

      this.notificationService.showSuccess(
        this.i18n.translate("imageDescriptionUpdated")
      );

      return true;
    } catch (error) {
      console.error("Erro ao atualizar descrição:", error);
      this.notificationService.showError(
        error instanceof Error
          ? error.message
          : this.i18n.translate("errorUpdatingDescription")
      );
      return false;
    }
  }

  /**
   * Conta quantas imagens existem de cada tipo para uma solicitação
   */
  async getImageCount(
    requestId: number
  ): Promise<{ before: number; after: number; total: number }> {
    try {
      const { data, error } = await this.supabase.client
        .from("service_request_images")
        .select("image_type")
        .eq("service_request_id", requestId);

      if (error) throw error;

      const before = data?.filter((img) => img.image_type === "before").length || 0;
      const after = data?.filter((img) => img.image_type === "after").length || 0;

      return {
        before,
        after,
        total: before + after,
      };
    } catch (error) {
      console.error("Erro ao contar imagens:", error);
      return { before: 0, after: 0, total: 0 };
    }
  }
}
