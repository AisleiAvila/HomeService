import {
  Component,
  ChangeDetectionStrategy,
  input,
  effect,
  signal,
  inject,
  viewChild,
  ElementRef,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  User,
  Address,
  ServiceCategory,
} from "../../models/maintenance.models";
import { SmsVerificationService } from "../../services/sms-verification.service";
import { AuthService } from "../../services/auth.service";
import { NotificationService } from "../../services/notification.service";
import { I18nService } from "../../i18n.service";
import { DataService } from "../../services/data.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./profile.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnDestroy {
  lastNotification = signal<string>("");
  user = input.required<User>();
  receiveSmsNotifications = signal<boolean>(false);

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private dataService = inject(DataService);
  private smsVerificationService = inject(SmsVerificationService);
  i18n = inject(I18nService);
  goToDashboard() {
    window.location.href = "/dashboard";
  }

  fileInput = viewChild<ElementRef<HTMLInputElement>>("fileInput");
  videoElement = viewChild<ElementRef<HTMLVideoElement>>("videoElement");

  // Form state signals
  name = signal("");
  phone = signal("");
  address = signal<Address>({ street: "", city: "", state: "", zip_code: "" });
  specialties = signal<ServiceCategory[]>([]);
  email = signal("");

  // UI state
  isEditing = signal(false);
  isCameraOpen = signal(false);
  initialUserState: User | null = null;

  // Toast state for save feedback
  showSaveToast = signal(false);
  saveToastMessage = signal("");
  saveToastType = signal<"success" | "error">("success");

  // SMS verification state
  smsSent = false;
  smsCode = "";
  smsValid: boolean | null = null;
  // Signal para modal de SMS
  showSmsModal = signal(false);

  allCategories = this.dataService.categories;
  private cameraStream: MediaStream | null = null;

  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (currentUser) {
        // Store initial state for change detection
        if (!this.initialUserState) {
          this.initialUserState = { ...currentUser };
        }

        this.name.set(currentUser.name);
        this.phone.set(currentUser.phone || "");
        this.address.set(
          currentUser.address || {
            street: "",
            city: "",
            state: "",
            zip_code: "",
          }
        );
        this.specialties.set(currentUser.specialties || []);
        this.email.set(currentUser.email || "");
        this.receiveSmsNotifications.set(
          currentUser.receive_sms_notifications ?? false
        );
      }
    });
  }

  ngOnDestroy() {
    // Garantir que a câmera seja fechada quando o componente for destruído
    this.closeCamera();
  }

  toggleSpecialty(category: ServiceCategory) {
    this.specialties.update((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
    );
  }

  isSpecialtyChecked(category: ServiceCategory): boolean {
    return this.specialties().includes(category);
  }

  onSpecialtyChange(category: ServiceCategory, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.specialties.update((current) =>
      isChecked ? [...current, category] : current.filter((c) => c !== category)
    );
  }

  async saveChanges() {
    console.log("💾 saveChanges() called");
    const originalUser = this.user();
    const updatedUserData: Partial<User> = {};
    let hasChanges = false;

    if (this.name() !== originalUser.name) {
      updatedUserData.name = this.name();
      hasChanges = true;
    }
    if (this.phone() !== (originalUser.phone || "")) {
      updatedUserData.phone = this.phone();
      hasChanges = true;
    }
    if (
      this.receiveSmsNotifications() !==
      (originalUser.receive_sms_notifications ?? false)
    ) {
      updatedUserData.receive_sms_notifications =
        this.receiveSmsNotifications();
      hasChanges = true;
    }
    // TODO: Address update needs to be implemented separately
    // as the Supabase table doesn't have 'address' as a JSON column
    // if (
    //   JSON.stringify(this.address()) !==
    //   JSON.stringify(originalUser.address || {})
    // ) {
    //   updatedUserData.address = this.address();
    //   hasChanges = true;
    // }
    if (
      this.user().role === "professional" &&
      JSON.stringify(this.specialties()) !==
        JSON.stringify(originalUser.specialties || [])
    ) {
      updatedUserData.specialties = this.specialties();
      hasChanges = true;
    }

    if (hasChanges) {
      console.log("📝 Saving profile changes:", updatedUserData);
      try {
        await this.authService.updateUserProfile(updatedUserData);
        // Reset initial state after successful save
        this.initialUserState = { ...this.user() };
        this.isEditing.set(false);

        // Show success toast
        this.showToast(
          this.i18n.translate("profileUpdatedSuccessfully"),
          "success"
        );

        this.notificationService.addNotification(
          this.i18n.translate("profileUpdatedSuccessfully")
        );
        console.log("✅ Profile saved successfully");
      } catch (error) {
        console.error("❌ Error saving profile:", error);
        const errorMessage =
          "Error updating profile: " +
          ((error as any)?.message || "Unknown error");

        // Show error toast
        this.showToast(errorMessage, "error");

        this.notificationService.addNotification(errorMessage);
      }
    } else {
      console.log("ℹ️ No changes detected");
      this.showToast(this.i18n.translate("noChangesDetected"), "error");
      this.notificationService.addNotification(
        this.i18n.translate("noChangesDetected")
      );
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        this.notificationService.addNotification(
          this.i18n.translate("errorInvalidFileFormat")
        );
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        this.notificationService.addNotification(
          this.i18n.translate("errorImageTooLarge")
        );
        return;
      }
      await this.authService.uploadAvatar(file);
    }
  }

  async openCamera() {
    // Verificar se a API MediaDevices está disponível
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notificationService.addNotification(
        this.i18n.translate("errorCameraNotSupported")
      );
      console.error("getUserMedia not supported");
      return;
    }

    try {
      // Verificar permissões primeiro
      const permissions = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });

      if (permissions.state === "denied") {
        this.notificationService.addNotification(
          this.i18n.translate("errorCameraPermissionDenied")
        );
        return;
      }

      // Solicitar acesso à câmera com configurações otimizadas
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user", // Câmera frontal preferencial
        },
        audio: false,
      });

      // Abrir o modal imediatamente após obter o stream
      this.isCameraOpen.set(true);

      // Aguardar a próxima atualização do DOM para conectar o vídeo
      setTimeout(() => {
        const videoElement = this.videoElement();
        if (videoElement) {
          const video = videoElement.nativeElement;
          video.srcObject = this.cameraStream;

          // Garantir que o vídeo comece a reproduzir
          video.onloadedmetadata = () => {
            console.log("✅ Metadata do vídeo carregada");
            video.play().catch((playError) => {
              console.error("Erro ao reproduzir vídeo:", playError);
            });
          };

          // Adicionar mais logs para debugging
          video.onloadstart = () =>
            console.log("📹 Iniciando carregamento do vídeo");
          video.oncanplay = () =>
            console.log("✅ Vídeo pronto para reprodução");
          video.onplay = () => console.log("▶️ Vídeo começou a reproduzir");

          // Tratar erros de reprodução do vídeo
          video.onerror = (error) => {
            console.error("Erro na reprodução do vídeo:", error);
            this.notificationService.addNotification(
              this.i18n.translate("errorVideoPlayback")
            );
            this.closeCamera();
          };

          // Forçar reprodução após um pequeno delay
          setTimeout(() => {
            if (video.paused) {
              video.play().catch((err) => {
                console.error("Erro ao forçar reprodução:", err);
              });
            }
          }, 500);
        } else {
          console.error("❌ Elemento de vídeo não encontrado");
          this.closeCamera();
        }
      }, 100);
    } catch (err: any) {
      console.error("Erro ao acessar a câmera:", err);

      let errorMessage = this.i18n.translate("errorAccessingCamera");
      let actionableMessage = "";

      // Personalizar mensagem de erro baseada no tipo de erro
      if (err.name === "NotAllowedError") {
        errorMessage = this.i18n.translate("errorCameraPermissionDenied");
        actionableMessage = this.i18n.translate("solutionPermissionDenied");
      } else if (err.name === "NotFoundError") {
        errorMessage = this.i18n.translate("errorNoCameraFound");
        actionableMessage = this.i18n.translate("solutionNoCameraFound");
      } else if (err.name === "NotReadableError") {
        errorMessage = this.i18n.translate("errorCameraInUse");
        actionableMessage = this.i18n.translate("solutionCameraInUse");
      } else if (err.name === "OverconstrainedError") {
        errorMessage = this.i18n.translate("errorCameraConstraints");
        actionableMessage = this.i18n.translate("solutionCameraConstraints");
      } else if (err.name === "AbortError") {
        errorMessage = this.i18n.translate("errorCameraAborted");
        actionableMessage = this.i18n.translate("solutionCameraAborted");
      } else if (err.name === "TypeError") {
        errorMessage = this.i18n.translate("errorCameraTypeError");
        actionableMessage = this.i18n.translate("solutionCameraTypeError");
      }

      // Mostrar mensagem principal
      this.notificationService.addNotification(errorMessage);

      // Mostrar solução específica após um delay
      if (actionableMessage) {
        setTimeout(() => {
          this.notificationService.addNotification(actionableMessage);
        }, 2000);
      }

      // Log detalhado para debugging
      console.group("🔧 Informações para Debugging:");
      console.log("Tipo do erro:", err.name);
      console.log("Mensagem:", err.message);
      console.log("URL atual:", window.location.href);
      console.log("Protocolo:", window.location.protocol);
      console.log("Navegador:", navigator.userAgent);
      console.groupEnd();
    }
  }

  capturePhoto() {
    const video = this.videoElement()?.nativeElement;
    if (!video) {
      this.notificationService.addNotification(
        this.i18n.translate("errorVideoNotAvailable")
      );
      return;
    }

    // Verificar se o vídeo está pronto
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      this.notificationService.addNotification(
        this.i18n.translate("errorVideoNotReady")
      );
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        this.notificationService.addNotification(
          this.i18n.translate("errorCanvasNotSupported")
        );
        return;
      }

      // Desenhar o frame atual do vídeo no canvas
      ctx.drawImage(video, 0, 0);

      // Converter para blob com qualidade otimizada
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const file = new File([blob], `profile-photo-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });

            try {
              await this.authService.uploadAvatar(file);
              this.notificationService.addNotification(
                this.i18n.translate("photoUploadedSuccessfully")
              );
            } catch (error) {
              console.error("Erro ao fazer upload da foto:", error);
              this.notificationService.addNotification(
                this.i18n.translate("errorUploadingPhoto")
              );
            }
          } else {
            this.notificationService.addNotification(
              this.i18n.translate("errorCapturingPhoto")
            );
          }
          this.closeCamera();
        },
        "image/jpeg",
        0.9
      ); // Qualidade de 90%
    } catch (error) {
      console.error("Erro ao capturar foto:", error);
      this.notificationService.addNotification(
        this.i18n.translate("errorCapturingPhoto")
      );
      this.closeCamera();
    }
  }

  closeCamera() {
    try {
      // Parar todas as tracks da stream
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((track) => {
          track.stop();
        });
        this.cameraStream = null;
      }

      // Limpar o elemento de vídeo
      const videoElement = this.videoElement();
      if (videoElement) {
        const video = videoElement.nativeElement;
        video.srcObject = null;
      }

      // Fechar o modal
      this.isCameraOpen.set(false);
    } catch (error) {
      console.error("Erro ao fechar a câmera:", error);
      // Mesmo com erro, fechar o modal
      this.isCameraOpen.set(false);
    }
  }

  // Métodos para template
  showCameraModal() {
    return this.isCameraOpen();
  }

  openCameraModal() {
    console.log("🎬 Abrindo modal da câmera...");
    this.openCamera();
  }

  closeCameraModal() {
    console.log("🔚 Fechando modal da câmera...");
    this.closeCamera();
  }

  // Método de debug
  debugCameraState() {
    console.group("🔍 Estado da Câmera - Debug");
    console.log("Modal aberto:", this.isCameraOpen());
    console.log("Stream ativa:", !!this.cameraStream);
    console.log("Elemento de vídeo:", this.videoElement());

    const videoEl = this.videoElement();
    if (videoEl) {
      const video = videoEl.nativeElement;
      console.log("Video srcObject:", video.srcObject);
      console.log("Video readyState:", video.readyState);
      console.log("Video paused:", video.paused);
      console.log("Video muted:", video.muted);
      console.log("Video autoplay:", video.autoplay);
      console.log(
        "Video dimensions:",
        video.videoWidth + "x" + video.videoHeight
      );
    }
    console.groupEnd();
  }

  checkIfChanged() {
    return this.isChanged();
  }

  isChanged() {
    const originalUser = this.user();
    const initialState = this.initialUserState;

    const nameChanged = this.name() !== originalUser.name;
    const phoneChanged = this.phone() !== (originalUser.phone || "");
    const emailChanged = this.email() !== (originalUser.email || "");
    const avatarChanged =
      initialState && this.user().avatar_url !== initialState.avatar_url;
    const specialtiesChanged =
      this.user().role === "professional" &&
      JSON.stringify(this.specialties()) !==
        JSON.stringify(originalUser.specialties || []);

    const hasChanges =
      nameChanged ||
      phoneChanged ||
      emailChanged ||
      avatarChanged ||
      specialtiesChanged;

    return hasChanges;
  }
  resetForm() {
    const currentUser = this.user();
    this.name.set(currentUser.name);
    this.phone.set(currentUser.phone || "");
    this.email.set(currentUser.email || "");
    this.address.set(
      currentUser.address || { street: "", city: "", state: "", zip_code: "" }
    );
    this.specialties.set(currentUser.specialties || []);
    this.isEditing.set(false);
  }

  saveProfile() {
    console.log("💾 saveProfile() called - calling saveChanges()");
    this.saveChanges();
  }

  async sendSmsVerification() {
    try {
      const userId = this.user().id;
      const phoneWithId = `${userId}|${this.phone()}`;
      const response: any = await this.smsVerificationService
        .sendVerification(phoneWithId)
        .toPromise();
      if (response.sent) {
        this.smsSent = true;
        this.smsValid = null;
        this.showSmsModal.set(true);
        this.notificationService.addNotification(
          this.i18n.translate("smsSentInfo")
        );
      } else {
        this.notificationService.addNotification(
          this.i18n.translate("smsSendError")
        );
      }
    } catch (err) {
      this.notificationService.addNotification(
        this.i18n.translate("smsSendError")
      );
    }
  }

  async validateSmsCode() {
    // Limpa mensagem anterior antes de validar
    this.lastNotification.set("");
    try {
      console.log("Validating SMS code:", this.smsCode);
      const userId = this.user().id;
      const phoneWithId = `${userId}|${this.phone()}`;
      console.log("Telefone (id|telefone):", phoneWithId);
      const response: any = await this.smsVerificationService
        .validateCode(phoneWithId, this.smsCode)
        .toPromise();
      console.log("SMS verification response:", response);
      if (response.valid && response.update) {
        this.smsValid = true;
        this.lastNotification.set("");
        this.notificationService.addNotification(
          this.i18n.translate("smsCodeValid")
        );
        // Recarrega perfil do usuário após validação
        const authId = this.user().auth_id;
        if (authId) {
          await this.authService.refreshAppUser(authId);
        }
      } else if (response.error === "expired") {
        this.smsValid = null;
        const msg = this.i18n.translate("smsCodeExpired");
        this.lastNotification.set(msg);
        this.notificationService.addNotification(msg);
      } else {
        this.smsValid = null;
        const msg = this.i18n.translate("smsCodeInvalid");
        this.lastNotification.set(msg);
        this.notificationService.addNotification(msg);
      }
    } catch (err) {
      console.error("Error validating SMS code:", err);
      this.smsValid = null;
      const msg = this.i18n.translate("smsCodeInvalid");
      this.lastNotification.set(msg);
      this.notificationService.addNotification(msg);
    }
  }

  private showToast(message: string, type: "success" | "error" = "success") {
    this.saveToastMessage.set(message);
    this.saveToastType.set(type);
    this.showSaveToast.set(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showSaveToast.set(false);
    }, 3000);
  }
}
