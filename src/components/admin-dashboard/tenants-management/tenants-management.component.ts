import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import {
  AccessibleTenant,
  AuthService,
  TenantProfile,
  TenantProfileUpdatePayload,
} from "../../../services/auth.service";
import { NotificationService } from "../../../services/notification.service";
import { PortugalAddressValidationService } from "../../../services/portugal-address-validation.service";

@Component({
  selector: "app-tenants-management",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./tenants-management.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantsManagementComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly portugalAddressValidation = inject(PortugalAddressValidationService);

  readonly currentUser = this.authService.appUser;
  readonly isSuperUser = computed(() => this.currentUser()?.role === "super_user");

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  readonly availableTenants = signal<AccessibleTenant[]>([]);
  readonly selectedTenantId = signal("");

  readonly profile = signal<TenantProfile | null>(null);

  readonly formName = signal("");
  readonly formPhone = signal("");
  readonly formContactEmail = signal("");
  readonly formAddress = signal("");
  readonly formLocality = signal("");
  readonly formPostalCode = signal("");
  readonly formLogoImageData = signal<string | null>(null);
  readonly formStatus = signal<"active" | "inactive">("active");

  readonly emailInvalid = computed(() => {
    const value = this.formContactEmail().trim();
    if (!value) return false;
    return !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
  });

  readonly postalCodeInvalid = computed(() => {
    const value = this.formPostalCode().trim();
    if (!value) return false;
    return !this.portugalAddressValidation.validatePostalCode(value);
  });

  readonly logoImageTooLarge = signal(false);
  readonly logoImageInvalidType = signal(false);
  readonly logoPreviewUrl = computed(() => this.formLogoImageData());

  readonly canSave = computed(() => {
    if (this.isLoading() || this.isSaving()) {
      return false;
    }

    if (!this.profile()) {
      return false;
    }

    if (!this.formName().trim()) {
      return false;
    }

    return !this.emailInvalid() && !this.postalCodeInvalid() && !this.logoImageTooLarge() && !this.logoImageInvalidType();
  });

  ngOnInit(): void {
    void this.initializeTenantContext();
  }

  private async initializeTenantContext(): Promise<void> {
    this.isLoading.set(true);

    try {
      if (this.isSuperUser()) {
        const tenants = await this.authService.listAccessibleTenants();
        this.availableTenants.set(tenants);

        if (tenants.length === 0) {
          this.profile.set(null);
          return;
        }

        const selected = this.selectedTenantId() || tenants[0].id;
        this.selectedTenantId.set(selected);
        await this.loadTenantProfile(selected);
        return;
      }

      await this.loadTenantProfile();
    } finally {
      this.isLoading.set(false);
    }
  }

  async onTenantSelectionChange(tenantId: string): Promise<void> {
    this.selectedTenantId.set(tenantId);
    await this.loadTenantProfile(tenantId);
  }

  onPostalCodeInput(value: string): void {
    this.formPostalCode.set(this.portugalAddressValidation.formatPostalCode(value));
  }

  async onLogoFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];

    this.logoImageTooLarge.set(false);
    this.logoImageInvalidType.set(false);

    if (!file) {
      return;
    }

    const allowedTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      this.logoImageInvalidType.set(true);
      this.notificationService.addNotification("Formato de imagem inválido. Use PNG, JPG ou WEBP.");
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.logoImageTooLarge.set(true);
      this.notificationService.addNotification("Imagem muito grande. Tamanho máximo: 2MB.");
      return;
    }

    const dataUrl = await this.readFileAsDataUrl(file);
    this.formLogoImageData.set(dataUrl);
  }

  removeLogoImage(): void {
    this.formLogoImageData.set(null);
    this.logoImageTooLarge.set(false);
    this.logoImageInvalidType.set(false);
  }

  async save(): Promise<void> {
    if (!this.canSave()) {
      this.notificationService.addNotification("Verifique os dados do tenant e tente novamente.");
      return;
    }

    this.isSaving.set(true);

    try {
      const payload: TenantProfileUpdatePayload = {
        name: this.formName().trim(),
        phone: this.toNullableText(this.formPhone()),
        contact_email: this.toNullableText(this.formContactEmail()),
        address: this.toNullableText(this.formAddress()),
        locality: this.toNullableText(this.formLocality()),
        postal_code: this.toNullableText(this.formPostalCode()),
        logo_image_data: this.formLogoImageData(),
        status: this.formStatus(),
      };

      const tenantId = this.isSuperUser() ? this.selectedTenantId() : undefined;
      const updated = await this.authService.updateTenantProfile(payload, tenantId || undefined);

      if (!updated) {
        this.notificationService.addNotification("Falha ao atualizar dados do tenant.");
        return;
      }

      this.applyProfileToForm(updated);
      this.notificationService.addNotification("Dados do tenant atualizados com sucesso.");
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadTenantProfile(tenantId?: string): Promise<void> {
    this.isLoading.set(true);

    try {
      const profile = await this.authService.getTenantProfile(tenantId);
      if (!profile) {
        this.profile.set(null);
        this.notificationService.addNotification("Não foi possível carregar os dados do tenant.");
        return;
      }

      this.applyProfileToForm(profile);
    } finally {
      this.isLoading.set(false);
    }
  }

  private applyProfileToForm(profile: TenantProfile): void {
    this.profile.set(profile);
    this.formName.set(profile.name || "");
    this.formPhone.set(profile.phone || "");
    this.formContactEmail.set(profile.contact_email || "");
    this.formAddress.set(profile.address || "");
    this.formLocality.set(profile.locality || "");
    this.formPostalCode.set(profile.postal_code || "");
    this.formLogoImageData.set(profile.logo_image_data || null);
    this.formStatus.set(profile.status === "inactive" ? "inactive" : "active");
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Formato de imagem inválido"));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error("Erro ao processar imagem"));
      reader.readAsDataURL(file);
    });
  }

  private toNullableText(value: string): string | null {
    const normalized = value.trim();
    return normalized || null;
  }
}
