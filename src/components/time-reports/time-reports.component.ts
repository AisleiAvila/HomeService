import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { I18nService } from "../../services/i18n.service";
import { I18nPipe } from "../../pipes/i18n.pipe";
import {
  ServiceRequest,
  SchedulingStatus,
} from "../../models/maintenance.models";

@Component({
  selector: "app-time-reports",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./time-reports.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeReportsComponent {
  // Services
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private i18n = inject(I18nService);

  // State
  selectedDateRange = signal<"today" | "week" | "month" | "custom">("week");
  customStartDate = signal<string>("");
  customEndDate = signal<string>("");
  selectedCategory = signal<string>("all");

  // Computed properties
  currentUser = this.authService.appUser;

  canViewReports = computed(() => {
    const user = this.currentUser();
    return user?.role === "admin";
  });

  allRequests = this.dataService.serviceRequests;
  categories = this.dataService.categories;

  filteredRequests = computed(() => {
    let requests = this.allRequests();

    // Filtrar por categoria
    if (this.selectedCategory() !== "all") {
      requests = requests.filter((r) => r.category === this.selectedCategory());
    }

    // Filtrar por período
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );

    switch (this.selectedDateRange()) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "custom":
        if (this.customStartDate() && this.customEndDate()) {
          startDate = new Date(this.customStartDate());
          endDate = new Date(this.customEndDate());
          endDate.setHours(23, 59, 59);
        } else {
          return requests;
        }
        break;
      default:
        return requests;
    }

    return requests.filter((r) => {
      const requestDate = new Date(
        r.scheduled_start_datetime || r.requested_datetime || r.requested_date
      );
      return requestDate >= startDate && requestDate <= endDate;
    });
  });

  completedRequests = computed(() => {
    return this.filteredRequests().filter((r) => r.status === "Completed");
  });

  delayedRequests = computed(() => {
    return this.filteredRequests().filter(
      (r) => this.dataService.getSchedulingStatus(r) === "Delayed"
    );
  });

  todayScheduledRequests = computed(() => {
    return this.dataService.getTodayScheduledRequests();
  });

  productivityReport = computed(() => {
    return this.dataService.getProfessionalProductivityReport();
  });

  summaryStats = computed(() => {
    const requests = this.filteredRequests();
    const completed = this.completedRequests();

    let totalEstimatedMinutes = 0;
    let totalActualMinutes = 0;
    let onTimeCount = 0;

    completed.forEach((request) => {
      if (request.estimated_duration_minutes) {
        totalEstimatedMinutes += request.estimated_duration_minutes;
      }

      const actualDuration = this.dataService.calculateActualDuration(request);
      if (actualDuration) {
        totalActualMinutes += actualDuration;
      }

      // Considera "no horário" se iniciou dentro de 15 minutos do agendado
      if (request.scheduled_start_datetime && request.actual_start_datetime) {
        const scheduled = new Date(request.scheduled_start_datetime);
        const actual = new Date(request.actual_start_datetime);
        const diffMinutes =
          (actual.getTime() - scheduled.getTime()) / (1000 * 60);
        if (Math.abs(diffMinutes) <= 15) {
          onTimeCount++;
        }
      }
    });

    return {
      totalRequests: requests.length,
      completedRequests: completed.length,
      delayedRequests: this.delayedRequests().length,
      completionRate:
        requests.length > 0
          ? Math.round((completed.length / requests.length) * 100)
          : 0,
      averageEstimatedDuration:
        totalEstimatedMinutes > 0
          ? Math.round(totalEstimatedMinutes / completed.length)
          : 0,
      averageActualDuration:
        totalActualMinutes > 0
          ? Math.round(totalActualMinutes / completed.length)
          : 0,
      onTimePercentage:
        completed.length > 0
          ? Math.round((onTimeCount / completed.length) * 100)
          : 0,
    };
  });

  formatDuration(minutes: number): string {
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
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
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

  exportToCSV() {
    const requests = this.filteredRequests();
    const csvData = requests.map((request) => ({
      id: request.id,
      title: request.title,
      category: request.category,
      client: request.client_name || "",
      professional: request.professional_name || "",
      status: request.status,
      requested_datetime: request.requested_datetime || request.requested_date,
      scheduled_datetime:
        request.scheduled_start_datetime || request.scheduled_date,
      estimated_duration: request.estimated_duration_minutes || "",
      actual_start: request.actual_start_datetime || "",
      actual_end: request.actual_end_datetime || "",
      actual_duration: this.dataService.calculateActualDuration(request) || "",
      variance: this.dataService.calculateDurationVariance(request) || "",
    }));

    const csvContent = this.convertToCSV(csvData);
    this.downloadCSV(
      csvContent,
      `relatorio-tempo-${new Date().toISOString().split("T")[0]}.csv`
    );
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ];

    return csvRows.join("\n");
  }

  private downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
