import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../../pipes/i18n.pipe";
import {
  AccessibleTenant,
  AuthService,
  TenantBillingState,
  TenantBillingSummary,
  TenantInvoice,
  TenantMenuItem,
  TenantMenuRole,
  TenantProfile,
  TenantProfileUpdatePayload,
  TenantSubscription,
  TenantSubscriptionUpdatePayload,
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
  readonly billingState = signal<TenantBillingState | null>(null);
  readonly billingSubscription = signal<TenantSubscription | null>(null);
  readonly billingInvoices = signal<TenantInvoice[]>([]);

  readonly isLoadingBilling = signal(false);
  readonly isSavingBilling = signal(false);
  readonly isOpeningBillingCheckout = signal(false);
  readonly isOpeningBillingPortal = signal(false);
  readonly isSavingMenuSettings = signal(false);

  readonly menuRoles: TenantMenuRole[] = [
    "admin",
    "super_user",
    "professional",
    "professional_almoxarife",
    "almoxarife",
    "secretario",
  ];
  readonly menuSettings = signal<Partial<Record<TenantMenuRole, TenantMenuItem[]>>>({});
  readonly availableMenuItems: { id: TenantMenuItem; labelKey: string }[] = [
    { id: "dashboard", labelKey: "dashboard" },
    { id: "schedule", labelKey: "schedule" },
    { id: "agenda", labelKey: "agenda" },
    { id: "overview", labelKey: "overview" },
    { id: "requests", labelKey: "requests" },
    { id: "approvals", labelKey: "approvals" },
    { id: "finances", labelKey: "finances" },
    { id: "stock-intake", labelKey: "stockIntake" },
    { id: "daily-mileage", labelKey: "dailyMileage" },
    { id: "clients", labelKey: "clients" },
    { id: "tenants", labelKey: "tenants" },
    { id: "categories", labelKey: "categories" },
    { id: "extra-services", labelKey: "extraServices" },
    { id: "profile", labelKey: "profile" },
  ];

  readonly formName = signal("");
  readonly formPhone = signal("");
  readonly formContactEmail = signal("");
  readonly formAddress = signal("");
  readonly formLocality = signal("");
  readonly formPostalCode = signal("");
  readonly formLogoImageData = signal<string | null>(null);
  readonly formStatus = signal<"active" | "inactive">("active");

  readonly billingFormStatus = signal<TenantSubscriptionUpdatePayload["status"]>("active");
  readonly billingFormPaymentStatus = signal("");
  readonly billingFormProviderSubscriptionId = signal("");
  readonly billingFormCurrency = signal("EUR");
  readonly billingFormAmountCents = signal("");
  readonly billingFormCurrentPeriodEnd = signal("");
  readonly billingFormGraceUntil = signal("");

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

  readonly canSaveBilling = computed(() => {
    if (this.isLoading() || this.isLoadingBilling() || this.isSavingBilling()) {
      return false;
    }

    if (!this.profile()) {
      return false;
    }

    const amountValue = this.billingFormAmountCents().trim();
    if (amountValue) {
      const parsed = Number(amountValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return false;
      }
    }

    return true;
  });

  readonly canOpenBillingCheckout = computed(() => {
    return !this.isLoadingBilling() && !this.isOpeningBillingCheckout() && !!this.profile();
  });

  readonly canOpenBillingPortal = computed(() => {
    return !this.isLoadingBilling() && !this.isOpeningBillingPortal() && !!this.profile();
  });

  readonly canSaveMenuSettings = computed(() => {
    if (this.isLoading() || this.isSavingMenuSettings()) {
      return false;
    }

    return !!this.profile();
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
          this.billingState.set(null);
          this.billingSubscription.set(null);
          this.billingInvoices.set([]);
          return;
        }

        const selected = this.selectedTenantId() || tenants[0].id;
        this.selectedTenantId.set(selected);
        await this.loadTenantData(selected);
        return;
      }

      await this.loadTenantData();
    } finally {
      this.isLoading.set(false);
    }
  }

  async onTenantSelectionChange(tenantId: string): Promise<void> {
    this.selectedTenantId.set(tenantId);
    await this.loadTenantData(tenantId);
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

  async saveBilling(): Promise<void> {
    if (!this.canSaveBilling()) {
      this.notificationService.addNotification("Verifique os dados de cobrança e tente novamente.");
      return;
    }

    this.isSavingBilling.set(true);

    try {
      const payload: TenantSubscriptionUpdatePayload = {
        status: this.billingFormStatus(),
        payment_status: this.toNullableText(this.billingFormPaymentStatus()),
        provider_subscription_id: this.toNullableText(this.billingFormProviderSubscriptionId()),
        currency: (this.billingFormCurrency().trim() || "EUR").toUpperCase(),
        amount_cents: this.parseNullableNumber(this.billingFormAmountCents()),
        current_period_end: this.toNullableIso(this.billingFormCurrentPeriodEnd()),
        grace_until: this.toNullableIso(this.billingFormGraceUntil()),
      };

      const tenantId = this.isSuperUser() ? this.selectedTenantId() : undefined;
      const summary = await this.authService.updateTenantSubscription(payload, tenantId || undefined);

      if (!summary) {
        this.notificationService.addNotification("Falha ao atualizar cobrança do tenant.");
        return;
      }

      this.applyBillingSummary(summary);
      await this.loadBillingInvoices(tenantId || undefined);
      this.notificationService.addNotification("Cobrança do tenant atualizada com sucesso.");
    } finally {
      this.isSavingBilling.set(false);
    }
  }

  async refreshBilling(): Promise<void> {
    const tenantId = this.isSuperUser() ? this.selectedTenantId() : undefined;
    await this.loadTenantBilling(tenantId || undefined);
    await this.loadBillingInvoices(tenantId || undefined);
  }

  async openBillingCheckout(): Promise<void> {
    if (!this.canOpenBillingCheckout()) {
      return;
    }

    this.isOpeningBillingCheckout.set(true);

    try {
      const tenantId = this.isSuperUser() ? this.selectedTenantId() : undefined;
      const result = await this.authService.createTenantCheckoutSession(tenantId || undefined);

      if (!result?.checkoutUrl) {
        this.notificationService.addNotification('Não foi possível iniciar o checkout de assinatura.');
        return;
      }

      globalThis.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
    } finally {
      this.isOpeningBillingCheckout.set(false);
    }
  }

  async openBillingPortal(): Promise<void> {
    if (!this.canOpenBillingPortal()) {
      return;
    }

    this.isOpeningBillingPortal.set(true);

    try {
      const tenantId = this.isSuperUser() ? this.selectedTenantId() : undefined;
      const result = await this.authService.createTenantBillingPortalSession(tenantId || undefined);

      if (!result?.portalUrl) {
        this.notificationService.addNotification('Não foi possível abrir o portal de cobrança.');
        return;
      }

      globalThis.open(result.portalUrl, '_blank', 'noopener,noreferrer');
    } finally {
      this.isOpeningBillingPortal.set(false);
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

  private async loadTenantData(tenantId?: string): Promise<void> {
    await Promise.all([
      this.loadTenantProfile(tenantId),
      this.loadTenantBilling(tenantId),
      this.loadBillingInvoices(tenantId),
      this.loadTenantMenuSettings(tenantId),
    ]);
  }

  private async loadTenantMenuSettings(tenantId?: string): Promise<void> {
    const settings = await this.authService.getTenantMenuSettings(tenantId);
    const mapped: Partial<Record<TenantMenuRole, TenantMenuItem[]>> = {};

    for (const role of this.menuRoles) {
      const roleSetting = settings.find((entry) => entry.role === role);
      mapped[role] = roleSetting?.enabled_items?.length
        ? [...roleSetting.enabled_items]
        : this.getDefaultMenuItemsForRole(role);
    }

    this.menuSettings.set(mapped);
  }

  private async loadTenantBilling(tenantId?: string): Promise<void> {
    this.isLoadingBilling.set(true);

    try {
      const summary = await this.authService.getTenantBilling(tenantId);
      if (!summary) {
        this.billingState.set(null);
        this.billingSubscription.set(null);
        this.resetBillingForm();
        return;
      }

      this.applyBillingSummary(summary);
    } finally {
      this.isLoadingBilling.set(false);
    }
  }

  private async loadBillingInvoices(tenantId?: string): Promise<void> {
    try {
      const invoices = await this.authService.listTenantInvoices(tenantId, 10);
      this.billingInvoices.set(invoices);
    } catch {
      this.billingInvoices.set([]);
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

  private applyBillingSummary(summary: TenantBillingSummary): void {
    this.billingState.set(summary.state || null);
    this.billingSubscription.set(summary.subscription || null);

    const subscription = summary.subscription;
    if (!subscription) {
      this.resetBillingForm();
      return;
    }

    this.billingFormStatus.set(
      this.ensureAllowedSubscriptionStatus(subscription.status)
    );
    this.billingFormPaymentStatus.set(subscription.payment_status || "");
    this.billingFormProviderSubscriptionId.set(subscription.provider_subscription_id || "");
    this.billingFormCurrency.set((subscription.currency || "EUR").toUpperCase());
    this.billingFormAmountCents.set(
      subscription.amount_cents == null ? "" : String(subscription.amount_cents)
    );
    this.billingFormCurrentPeriodEnd.set(this.toLocalDateTimeInput(subscription.current_period_end || null));
    this.billingFormGraceUntil.set(this.toLocalDateTimeInput(subscription.grace_until || null));
  }

  private resetBillingForm(): void {
    this.billingFormStatus.set("active");
    this.billingFormPaymentStatus.set("");
    this.billingFormProviderSubscriptionId.set("");
    this.billingFormCurrency.set("EUR");
    this.billingFormAmountCents.set("");
    this.billingFormCurrentPeriodEnd.set("");
    this.billingFormGraceUntil.set("");
  }

  private ensureAllowedSubscriptionStatus(
    status: string | null | undefined
  ): TenantSubscriptionUpdatePayload["status"] {
    const normalized = String(status || "").trim().toLowerCase();
    const allowed: TenantSubscriptionUpdatePayload["status"][] = [
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "canceled",
      "incomplete",
      "incomplete_expired",
    ];

    if ((allowed as string[]).includes(normalized)) {
      return normalized as TenantSubscriptionUpdatePayload["status"];
    }

    return "active";
  }

  private toLocalDateTimeInput(value: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  private toNullableIso(value: string): string | null {
    const normalized = value.trim();
    if (!normalized) return null;

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private parseNullableNumber(value: string): number | null {
    const normalized = value.trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return Math.round(parsed);
  }

  formatBillingStatus(status: string | null | undefined): string {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) return "-";

    const labels: Record<string, string> = {
      trialing: "Trial",
      active: "Ativo",
      past_due: "Em atraso",
      unpaid: "Não pago",
      canceled: "Cancelado",
      incomplete: "Incompleto",
      incomplete_expired: "Incompleto expirado",
      no_subscription: "Sem assinatura",
      not_configured: "Não configurado",
      unknown: "Desconhecido",
    };

    return labels[normalized] || normalized;
  }

  formatInvoiceAmount(amountCents: number | null | undefined, currency: string | null | undefined): string {
    const amount = Number(amountCents || 0) / 100;
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: String(currency || "EUR").toUpperCase(),
    }).format(amount);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
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

  getRoleLabel(role: TenantMenuRole): string {
    const labels: Record<TenantMenuRole, string> = {
      admin: "Admin",
      super_user: "Super user",
      professional: "Profissional",
      professional_almoxarife: "Profissional + Almoxarife",
      almoxarife: "Almoxarife",
      secretario: "Secretário",
    };

    return labels[role];
  }

  isRoleMenuItemEnabled(role: TenantMenuRole, item: TenantMenuItem): boolean {
    const roleItems = this.menuSettings()[role] || [];
    return roleItems.includes(item);
  }

  onMenuItemToggle(role: TenantMenuRole, item: TenantMenuItem, enabled: boolean): void {
    const current = this.menuSettings();
    const roleItems = [...(current[role] || [])];
    const index = roleItems.indexOf(item);

    if (enabled && index === -1) {
      roleItems.push(item);
    }

    if (!enabled && index >= 0) {
      roleItems.splice(index, 1);
    }

    this.menuSettings.set({
      ...current,
      [role]: roleItems,
    });
  }

  async saveMenuSettings(): Promise<void> {
    if (!this.canSaveMenuSettings()) {
      return;
    }

    this.isSavingMenuSettings.set(true);
    try {
      const tenantId = this.isSuperUser() ? this.selectedTenantId() : undefined;
      const currentSettings = this.menuSettings();

      const updates = this.menuRoles.map((role) => {
        const items = currentSettings[role] || this.getDefaultMenuItemsForRole(role);
        return this.authService.updateTenantMenuSettings(role, items, tenantId || undefined);
      });

      const results = await Promise.all(updates);
      const failed = results.filter((result) => !result).length;

      if (failed > 0) {
        this.notificationService.addNotification("Algumas configurações de menu não foram salvas.");
      } else {
        this.notificationService.addNotification("Configuração de menu salva com sucesso.");
      }

      await this.loadTenantMenuSettings(tenantId || undefined);
      await this.authService.loadTenantMenuSettings(tenantId || undefined);
    } finally {
      this.isSavingMenuSettings.set(false);
    }
  }

  private getDefaultMenuItemsForRole(role: TenantMenuRole): TenantMenuItem[] {
    const defaults: Record<TenantMenuRole, TenantMenuItem[]> = {
      admin: [
        "overview",
        "requests",
        "approvals",
        "finances",
        "stock-intake",
        "daily-mileage",
        "clients",
        "tenants",
        "categories",
        "extra-services",
        "profile",
      ],
      super_user: [
        "overview",
        "requests",
        "approvals",
        "finances",
        "stock-intake",
        "daily-mileage",
        "clients",
        "tenants",
        "categories",
        "extra-services",
        "profile",
      ],
      professional: ["dashboard", "schedule", "daily-mileage", "profile"],
      professional_almoxarife: ["dashboard", "schedule", "daily-mileage", "stock-intake", "profile"],
      almoxarife: ["stock-intake", "profile"],
      secretario: ["agenda", "requests", "stock-intake", "profile"],
    };

    return [...defaults[role]];
  }
}
