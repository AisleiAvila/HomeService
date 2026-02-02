import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { ServiceRequest, User } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-scheduler",
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: "./scheduler.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulerComponent {
  serviceRequest = input.required<ServiceRequest>();
  close = output<void>();
  appointmentConfirmed = output<{
    requestId: number;
    professionalId: number;
    date: Date;
  }>();

  private readonly dataService = inject(DataService);

  availableProfessionals = computed(() => {
    return this.dataService.getProfessionalsByCategory(
      this.serviceRequest().category
    );
  });

  selectedProfessionalId = signal<number | null>(null);
  selectedDate = signal("");
  selectedTime = signal("");

  // Available time slots for scheduling
  availableTimeSlots = [
    { value: "08:00", label: "08:00" },
    { value: "09:00", label: "09:00" },
    { value: "10:00", label: "10:00" },
    { value: "11:00", label: "11:00" },
    { value: "14:00", label: "14:00" },
    { value: "15:00", label: "15:00" },
    { value: "16:00", label: "16:00" },
    { value: "17:00", label: "17:00" },
  ];

  canConfirm = computed(() => {
    return (
      this.selectedProfessionalId() &&
      this.selectedDate() &&
      this.selectedTime()
    );
  });

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  confirmAppointment() {
    if (!this.canConfirm()) return;

    const professionalId = this.selectedProfessionalId()!;
    // Combine date and time strings correctly, respecting local timezone
    const appointmentDate = new Date(
      `${this.selectedDate()}T${this.selectedTime()}`
    );

    this.appointmentConfirmed.emit({
      requestId: this.serviceRequest().id,
      professionalId,
      date: appointmentDate,
    });
  }
}
