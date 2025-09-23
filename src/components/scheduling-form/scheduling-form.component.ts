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
import { I18nService } from "../../services/i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

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
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private i18n = inject(I18nService);

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

    if (req.professional_id) {
      this.selectedProfessionalId.set(req.professional_id);
    }

    if (req.scheduled_start_datetime || req.scheduled_date) {
      const scheduledDateTime = new Date(
        req.scheduled_start_datetime || req.scheduled_date!
      );
      this.scheduledDate.set(scheduledDateTime.toISOString().split("T")[0]);
      this.scheduledTime.set(
        scheduledDateTime.toTimeString().split(":").slice(0, 2).join(":")
      );
    }

    if (req.estimated_duration_minutes) {
      const hours = Math.floor(req.estimated_duration_minutes / 60);
      const minutes = req.estimated_duration_minutes % 60;
      this.estimatedDurationHours.set(hours);
      this.estimatedDurationMinutes.set(minutes);
    }
  }

  getMinDateTime(): string {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Mínimo 1 hora no futuro
    return now.toISOString().slice(0, 16);
  }

  async scheduleService() {
    if (!this.isFormValid() || !this.canSchedule()) {
      return;
    }

    try {
      const scheduledDateTime = new Date(
        `${this.scheduledDate()}T${this.scheduledTime()}`
      );

      await this.dataService.scheduleServiceStart(
        this.request().id,
        this.selectedProfessionalId()!,
        scheduledDateTime,
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
