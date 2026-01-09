import {
  Component,
  input,
  output,
  inject,
  computed,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ServiceRequest,
  SchedulingStatus,
} from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "@/src/i18n.service";

@Component({
  selector: "app-time-control",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./time-control.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeControlComponent {
  // Inputs
  request = input.required<ServiceRequest>();

  // Outputs
  onStartWork = output<number>();
  onFinishWork = output<number>();
  onUpdateDuration = output<{ requestId: number; duration: number }>();

  // Services
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly i18n = inject(I18nService);

  // Computed properties
  currentUser = this.authService.appUser;

  canStartWork = computed(() => {
    const user = this.currentUser();
    const req = this.request();
    return (
      user?.role === "professional" &&
      req.professional_id === user.id &&
      !req.actual_start_datetime &&
      req.status === "Data Definida"
    );
  });

  canFinishWork = computed(() => {
    const user = this.currentUser();
    const req = this.request();
    return (
      user?.role === "professional" &&
      req.professional_id === user.id &&
      req.actual_start_datetime &&
      !req.actual_end_datetime &&
      req.status === "Em Progresso"
    );
  });

  canManageSchedule = computed(() => {
    const user = this.currentUser();
    return user?.role === "admin";
  });

  schedulingStatus = computed(() => {
    return this.dataService.getSchedulingStatus(this.request());
  });

  actualDuration = computed(() => {
    return this.dataService.calculateActualDuration(this.request());
  });

  durationVariance = computed(() => {
    return this.dataService.calculateDurationVariance(this.request());
  });

  formatDuration(minutes: number | null): string {
    if (!minutes) return "--";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  }

  formatDateTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return "--";
    const date = new Date(dateTimeString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  getStatusClass(status: SchedulingStatus): string {
    switch (status) {
      case "Concluído":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-brand-primary-100 text-brand-primary-800";
      case "Delayed":
        return "bg-red-100 text-red-800";
      case "Scheduled Today":
        return "bg-orange-100 text-orange-800";
      case "Scheduled":
        return "bg-purple-100 text-purple-800";
      case "Awaiting Schedule":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  getDurationVarianceClass(variance: number | null): string {
    if (!variance) return "text-gray-600";
    if (variance > 0) return "text-red-600"; // Atrasou
    if (variance < 0) return "text-green-600"; // Adiantou
    return "text-gray-600"; // Exato
  }

  async startWork() {
    try {
      await this.dataService.startServiceWork(this.request().id);
      this.onStartWork.emit(this.request().id);
    } catch (error) {
      console.error("Erro ao iniciar trabalho:", error);
    }
  }

  async finishWork() {
    try {
      await this.dataService.finishServiceWork(this.request().id);
      this.onFinishWork.emit(this.request().id);
    } catch (error) {
      console.error("Erro ao finalizar trabalho:", error);
    }
  }
}

