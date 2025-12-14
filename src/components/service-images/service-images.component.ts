import { Component, input, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowServiceSimplified } from '../../services/workflow-simplified.service';
import { ServiceRequestImage } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { I18nService } from '../../i18n.service';

@Component({
  selector: 'app-service-images',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './service-images.component.html',
  styleUrls: ['./service-images.component.css'],
})
export class ServiceImagesComponent implements OnInit {
  // Inputs
  requestId = input.required<number>();
  requestStatus = input.required<string>();

  // Services
  private workflowService = inject(WorkflowServiceSimplified);
  private i18n = inject(I18nService);

  // State
  private allImages = signal<ServiceRequestImage[]>([]);
  isLoading = signal(false);
  uploadingBefore = signal(false);
  uploadingAfter = signal(false);

  // Computed
  beforeImages = computed(() => 
    this.allImages().filter(img => img.image_type === 'before')
  );

  afterImages = computed(() => 
    this.allImages().filter(img => img.image_type === 'after')
  );

  canUploadBefore = computed(() => {
    const status = this.requestStatus();
    return ['Aguardando Confirmação', 'Aceito', 'Data Definida', 'Em Progresso'].includes(status);
  });

  canUploadAfter = computed(() => {
    const status = this.requestStatus();
    return ['Em Progresso', 'Aguardando Finalização', 'Pagamento Feito', 'Concluído'].includes(status);
  });

  async ngOnInit() {
    await this.loadImages();
  }

  async loadImages() {
    this.isLoading.set(true);
    try {
      const images = await this.workflowService.getServiceImages(this.requestId());
      this.allImages.set(images || []);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async uploadImage(event: Event, imageType: 'before' | 'after') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(this.i18n.translate('imageTooBig'));
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert(this.i18n.translate('invalidImageType'));
      return;
    }

    const loadingSignal = imageType === 'before' ? this.uploadingBefore : this.uploadingAfter;
    loadingSignal.set(true);

    try {
      const result = await this.workflowService.uploadServiceImage(
        file,
        this.requestId(),
        imageType,
        '' // Descrição opcional
      );

      if (result) {
        console.log('✅ Imagem enviada com sucesso:', result);
        await this.loadImages();
      }
    } catch (error) {
      console.error('❌ Erro ao fazer upload da imagem:', error);
      alert(this.i18n.translate('uploadImageError'));
    } finally {
      loadingSignal.set(false);
      // Limpar input
      input.value = '';
    }
  }

  async deleteImage(image: ServiceRequestImage) {
    const confirmed = confirm(
      this.i18n.translate('confirmDeleteImage')
    );
    
    if (!confirmed) return;

    try {
      const success = await this.workflowService.deleteServiceImage(image.id);
      if (success) {
        console.log('✅ Imagem deletada com sucesso');
        await this.loadImages();
      }
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      alert(this.i18n.translate('deleteImageError'));
    }
  }

  viewImage(imageUrl: string) {
    window.open(imageUrl, '_blank');
  }

  formatFileSize(bytes?: number | null): string {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.i18n.getCurrentLanguage(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
