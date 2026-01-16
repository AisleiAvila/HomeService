import { Component, input, signal, inject, computed, OnInit, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowServiceSimplified } from '../../services/workflow-simplified.service';
import { ServiceRequestImage } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { I18nService } from '../../i18n.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-service-images',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './service-images.component.html',
  styleUrls: ['./service-images.component.css'],
})
export class ServiceImagesComponent implements OnInit, OnDestroy {
  // Inputs
  requestId = input.required<number>();
  requestStatus = input.required<string>();

  // Services
  private readonly workflowService = inject(WorkflowServiceSimplified);
  private readonly i18n = inject(I18nService);
  private readonly notificationService = inject(NotificationService);

  // ViewChild references
  videoElement = viewChild<ElementRef<HTMLVideoElement>>('videoElement');
  deleteConfirmDialog = viewChild<ElementRef<HTMLDialogElement>>('deleteConfirmDialog');

  // State
  private readonly allImages = signal<ServiceRequestImage[]>([]);
  isLoading = signal(false);
  uploadingBefore = signal(false);
  uploadingAfter = signal(false);
  isCameraOpen = signal(false);
  isVideoReady = signal(false);
  currentImageType = signal<'before' | 'after'>('before');
  
  // Modal para descrição da imagem
  showDescriptionModal = signal(false);
  imageDescriptionInput = signal('');
  pendingFiles: File[] = [];
  pendingImageType: 'before' | 'after' = 'before';
  
  // Modal de confirmação de exclusão
  showDeleteConfirmModal = signal(false);
  imageToDelete = signal<ServiceRequestImage | null>(null);
  deletingImage = signal(false);
  
  private cameraStream: MediaStream | null = null;

  pendingFilesCount = computed(() => this.pendingFiles.length);

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
    return ['Em Progresso', 'Concluído'].includes(status);
  });

  ngOnInit(): void {
    this.loadImages();
  }

  ngOnDestroy() {
    this.closeCamera();
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
    const files = input.files ? Array.from(input.files) : [];

    if (files.length === 0) return;

    // Validar tamanho (15MB) e tipo
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        alert(this.i18n.translate('imageTooBig'));
        input.value = '';
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert(this.i18n.translate('invalidImageType'));
        input.value = '';
        return;
      }
    }

    // Armazenar arquivos e tipo para uso no modal
    this.pendingFiles = files;
    this.pendingImageType = imageType;
    
    // Limpar input de descrição anterior
    this.imageDescriptionInput.set('');
    
    // Abrir modal para descrição
    this.showDescriptionModal.set(true);
    
    // Limpar input do file
    input.value = '';
  }

  async submitImageUpload() {
    if (this.pendingFiles.length === 0) return;

    const loadingSignal = this.pendingImageType === 'before' ? this.uploadingBefore : this.uploadingAfter;
    loadingSignal.set(true);

    try {
      const description = this.imageDescriptionInput();
      let uploadedCount = 0;

      for (const file of this.pendingFiles) {
        const result = await this.workflowService.uploadServiceImage(
          file,
          this.requestId(),
          this.pendingImageType,
          description
        );

        if (result) {
          uploadedCount += 1;
        }
      }

      if (uploadedCount > 0) {
        console.log(`✅ ${uploadedCount} imagem(ns) enviada(s) com sucesso`);
        await this.loadImages();
        this.notificationService.addNotification(this.i18n.translate('imageUploadedSuccessfully'));
      }
    } catch (error) {
      console.error('❌ Erro ao fazer upload da imagem:', error);
      this.notificationService.addNotification(
        this.i18n.translate('uploadImageError')
      );
    } finally {
      loadingSignal.set(false);
      this.closeDescriptionModal();
    }
  }

  closeDescriptionModal() {
    this.showDescriptionModal.set(false);
    this.imageDescriptionInput.set('');
    this.pendingFiles = [];
  }

  onImageViewClick(event: MouseEvent, imageUrl: string) {
    this.viewImage(imageUrl);
  }

  onDeleteClick(event: Event, image: ServiceRequestImage) {
    event.preventDefault();
    event.stopPropagation();
    this.deleteImage(image);
  }

  async deleteImage(image: ServiceRequestImage) {
    // Armazenar imagem e abrir modal
    this.imageToDelete.set(image);
    this.showDeleteConfirmModal.set(true);

    queueMicrotask(() => {
      const dialog = this.deleteConfirmDialog()?.nativeElement;
      if (!dialog) return;
      if (!dialog.open) dialog.showModal();
    });
  }

  async confirmDeleteImage() {
    const image = this.imageToDelete();
    if (!image) return;

    this.deletingImage.set(true);

    try {
      const success = await this.workflowService.deleteServiceImage(image.id);
      if (success) {
        console.log('✅ Imagem deletada com sucesso');
        this.notificationService.addNotification(
          this.i18n.translate('imageDeletedSuccessfully')
        );
        await this.loadImages();
        this.closeDeleteConfirmModal();
      } else {
        this.notificationService.addNotification(
          this.i18n.translate('deleteImageError')
        );
      }
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      this.notificationService.addNotification(
        this.i18n.translate('deleteImageError')
      );
    } finally {
      this.deletingImage.set(false);
    }
  }

  closeDeleteConfirmModal() {
    const dialog = this.deleteConfirmDialog()?.nativeElement;
    if (dialog?.open) dialog.close();

    this.showDeleteConfirmModal.set(false);
    this.imageToDelete.set(null);
    this.deletingImage.set(false);
  }

  onDeleteDialogBackdropClick(event: MouseEvent): void {
    const dialog = this.deleteConfirmDialog()?.nativeElement;
    if (!dialog) return;

    if (event.target === dialog) {
      this.closeDeleteConfirmModal();
    }
  }

  onDeleteDialogCancel(event: Event): void {
    event.preventDefault();
    this.closeDeleteConfirmModal();
  }

  onDeleteDialogKeyDown(_event: KeyboardEvent): void {
    // Intencionalmente vazio: os botões já são acessíveis via teclado,
    // e o ESC é tratado pelo evento (cancel) do <dialog>.
  }

  viewImage(imageUrl: string) {
    globalThis.open(imageUrl, '_blank');
  }

  getAltText(image: ServiceRequestImage): string {
    return image.description ? image.description : `#${image.id}`;
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

  async openCamera(imageType: 'before' | 'after') {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.notificationService.addNotification(
        this.i18n.translate('errorCameraNotSupported')
      );
      return;
    }

    try {
      const permissions = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });

      if (permissions.state === 'denied') {
        this.notificationService.addNotification(
          this.i18n.translate('errorCameraPermissionDenied')
        );
        return;
      }

      this.currentImageType.set(imageType);
      this.isVideoReady.set(false);
      
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // Câmera traseira preferencial para fotos do serviço
        },
        audio: false,
      });

      this.isCameraOpen.set(true);

      setTimeout(() => {
        const videoElement = this.videoElement();
        if (videoElement) {
          const video = videoElement.nativeElement;
          video.srcObject = this.cameraStream;

          video.onloadedmetadata = () => {
            video.play().catch((playError) => {
              console.error('Erro ao reproduzir vídeo:', playError);
            });
          };

          video.oncanplay = () => {
            this.isVideoReady.set(true);
          };

          video.onerror = (error) => {
            console.error('Erro na reprodução do vídeo:', error);
            this.notificationService.addNotification(
              this.i18n.translate('errorAccessingCamera')
            );
            this.closeCamera();
          };
        } else {
          console.error('Elemento de vídeo não encontrado');
          this.closeCamera();
        }
      }, 100);
    } catch (err: any) {
      console.error('Erro ao acessar a câmera:', err);
      
      let errorMessage = this.i18n.translate('errorAccessingCamera');

      if (err.name === 'NotAllowedError') {
        errorMessage = this.i18n.translate('errorCameraPermissionDenied');
      } else if (err.name === 'NotFoundError') {
        errorMessage = this.i18n.translate('errorNoCameraFound');
      } else if (err.name === 'NotReadableError') {
        errorMessage = this.i18n.translate('errorCameraInUse');
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = this.i18n.translate('errorCameraConstraints');
      }

      this.notificationService.addNotification(errorMessage);
    }
  }

  async capturePhoto() {
    const video = this.videoElement()?.nativeElement;
    if (!video) {
      this.notificationService.addNotification(
        this.i18n.translate('errorAccessingCamera')
      );
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      this.notificationService.addNotification(
        this.i18n.translate('errorVideoNotReady')
      );
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.notificationService.addNotification(
          this.i18n.translate('errorCapturingPhoto')
        );
        return;
      }

      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const file = new File([blob], `service-image-${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });

            // Armazenar arquivo e tipo para uso no modal
            this.pendingFiles = [file];
            this.pendingImageType = this.currentImageType();
            
            // Limpar input de descrição anterior
            this.imageDescriptionInput.set('');
            
            // Fechar câmera
            this.closeCamera();
            
            // Abrir modal para descrição
            this.showDescriptionModal.set(true);
          } else {
            this.notificationService.addNotification(
              this.i18n.translate('errorCapturingPhoto')
            );
            this.closeCamera();
          }
        },
        'image/jpeg',
        0.9
      );
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      this.notificationService.addNotification(
        this.i18n.translate('errorCapturingPhoto')
      );
      this.closeCamera();
    }
  }

  closeCamera() {
    try {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((track) => {
          track.stop();
        });
        this.cameraStream = null;
      }

      const videoElement = this.videoElement();
      if (videoElement) {
        const video = videoElement.nativeElement;
        video.srcObject = null;
      }

      this.isCameraOpen.set(false);
      this.isVideoReady.set(false);
    } catch (error) {
      console.error('Erro ao fechar câmera:', error);
    }
  }
}
