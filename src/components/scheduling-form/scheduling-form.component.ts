import {
  Component,
  input,
  output,
  signal,
  inject,
  computed,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ServiceRequest, User } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { I18nService } from "../../i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { PortugalAddressValidationService } from "../../services/portugal-address-validation.service";
import {
  normalizeServiceTimeZone,
  utcIsoToLocalParts,
} from "../../utils/timezone-datetime";
import { formatInTimeZone } from "date-fns-tz";

@Component({
  selector: "app-scheduling-form",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./scheduling-form.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingFormComponent {
  // Inputs
  request = input.required<ServiceRequest>();
  show = input<boolean>(false);

  // Outputs
  close = output<void>();
  scheduled = output<ServiceRequest>();

  // Serviços
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly addressValidation = inject(PortugalAddressValidationService);

  serviceTimeZone = signal<string>("Europe/Lisbon");

  // Estado do formulário
  selectedProfessionalId = signal<number | null>(null);
  scheduledDate = signal<string>("");
  scheduledTime = signal<string>("");
  estimatedDurationHours = signal<number>(1);
  estimatedDurationMinutes = signal<number>(0);

  // Propriedades computadas
  currentUser = this.authService.appUser;

  availableProfessionals = computed(() => {
    return this.dataService.getProfessionalsByCategory(this.request().category);
  });

  canSchedule = computed(() => {
    const user = this.currentUser();
    return user?.role === "admin";
  });

  totalEstimatedMinutes = computed(() => {
    return this.estimatedDurationHours() * 60 + this.estimatedDurationMinutes();
  });

  isFormValid = computed(() => {
    return (
      this.selectedProfessionalId() !== null &&
      this.scheduledDate() !== "" &&
      this.scheduledTime() !== "" &&
      this.totalEstimatedMinutes() > 0
    );
  });

  ngOnInit() {
    // Pré-popular campos se já existirem dados
    const req = this.request();

    // Primeiro usar valor já salvo (se existir), e em seguida confirmar via lookup do zip_code.
    this.serviceTimeZone.set(normalizeServiceTimeZone((req as any).service_time_zone));
    void this.refreshTimeZoneFromZip(req.zip_code);

    if (req.professional_id) {
      this.selectedProfessionalId.set(req.professional_id);
    }

    this.populateScheduledFieldsFromRequest(req);

    if (req.estimated_duration_minutes) {
      const hours = Math.floor(req.estimated_duration_minutes / 60);
      const minutes = req.estimated_duration_minutes % 60;
      this.estimatedDurationHours.set(hours);
      this.estimatedDurationMinutes.set(minutes);
    }
  }

  private populateScheduledFieldsFromRequest(req: ServiceRequest) {
    if (!req.scheduled_start_datetime && !req.scheduled_date) return;

    const tz = normalizeServiceTimeZone(this.serviceTimeZone());
    const source = req.scheduled_start_datetime || req.scheduled_date;
    const parts = utcIsoToLocalParts(source, tz);

    if (parts.date && parts.time) {
      this.scheduledDate.set(parts.date);
      this.scheduledTime.set(parts.time);
      return;
    }

    // Fallback (se valor não for parseável): mantém o comportamento antigo.
    const scheduledDateTime = new Date(source);
    if (!Number.isNaN(scheduledDateTime.getTime())) {
      this.scheduledDate.set(scheduledDateTime.toISOString().split("T")[0]);
      this.scheduledTime.set(
        scheduledDateTime.toTimeString().split(":").slice(0, 2).join(":")
      );
    }
  }

  private async refreshTimeZoneFromZip(zipCode: string) {
    const tz = normalizeServiceTimeZone(
      await this.addressValidation.getTimeZoneForZipCode(zipCode)
    );

    if (tz !== this.serviceTimeZone()) {
      this.serviceTimeZone.set(tz);
      this.populateScheduledFieldsFromRequest(this.request());
    }
  }

  getMinDateTime(): string {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Mínimo 1 hora no futuro
    const tz = normalizeServiceTimeZone(this.serviceTimeZone());
    return formatInTimeZone(now, tz, "yyyy-MM-dd'T'HH:mm");
  }

  async scheduleService() {
    if (!this.isFormValid() || !this.canSchedule()) {
      return;
    }

    try {
      const scheduledLocalDateTime = `${this.scheduledDate()}T${this.scheduledTime()}`;

      await this.dataService.scheduleServiceStart(
        this.request().id,
        this.selectedProfessionalId()!,
        scheduledLocalDateTime,
        this.request().zip_code,
        this.totalEstimatedMinutes()
      );

      this.scheduled.emit(this.request());
      this.close.emit();
    } catch (error) {
      console.error("Erro ao agendar serviço:", error);
    }
  }

  onCancel() {
    this.close.emit();
  }

  getProfessionalAvailabilityStatus(professional: User): string {
    // TODO: Implementar lógica de verificação de disponibilidade
    // Por enquanto, retorna sempre disponível
    return "available";
  }

  getRequestedDate(): string {
    const req = this.request?.();
    const dateStr = req?.requested_datetime || req?.requested_date;
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  }

  getRequestedTime(): string {
    const req = this.request?.();
    const dateStr = req?.requested_datetime || req?.requested_date;
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getMinDate(): string {
    // Retorna YYYY-MM-DD para data mínima
    return new Date().toISOString().split("T")[0];
  }
}
