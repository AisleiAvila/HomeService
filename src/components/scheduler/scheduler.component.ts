


import { Component, ChangeDetectionStrategy, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRequest, User } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './scheduler.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulerComponent {
  serviceRequest = input.required<ServiceRequest>();
  close = output<void>();
  appointmentConfirmed = output<{ requestId: number, professionalId: number, date: Date }>();

  private dataService = inject(DataService);

  availableProfessionals = computed(() => {
    return this.dataService.getProfessionalsByCategory(this.serviceRequest().category);
  });

  selectedProfessionalId = signal<number | null>(null);
  selectedDate = signal('');
  selectedTime = signal('');

  canConfirm = computed(() => {
    return this.selectedProfessionalId() && this.selectedDate() && this.selectedTime();
  });

  confirmAppointment() {
    if (!this.canConfirm()) return;
    
    const professionalId = this.selectedProfessionalId()!;
    // Combine date and time strings correctly, respecting local timezone
    const appointmentDate = new Date(`${this.selectedDate()}T${this.selectedTime()}`);
        
    this.appointmentConfirmed.emit({
      requestId: this.serviceRequest().id,
      professionalId,
      date: appointmentDate
    });
  }
}