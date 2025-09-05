import { Component, ChangeDetectionStrategy, input, output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { User, ServiceCategory, ServiceRequest } from '../../models/maintenance.models';
import { DataService } from '../../services/data.service';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './service-request-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceRequestFormComponent {
  client = input.required<User>();
  requestSubmitted = output<void>();

  private dataService = inject(DataService);
  categories = this.dataService.categories;

  // Individual signals for each form field for cleaner two-way binding
  title = signal('');
  category = signal<ServiceCategory>(this.categories()[0]!);
  description = signal('');
  requestedDate = signal(new Date().toISOString().split('T')[0]); // today's date
  
  // Signals for address fields
  street = signal('123 Maple St');
  city = signal('Springfield');
  state = signal('IL');
  zipCode = signal('62704');
  
  onSubmit(form: NgForm) {
    if (form.valid) {
      // FIX: Removed properties not expected by addServiceRequest. The service handles defaults.
      const newRequest = {
          clientId: this.client().id,
          title: this.title(),
          description: this.description(),
          category: this.category(),
          requestedDate: new Date(this.requestedDate()),
          address: {
            street: this.street(),
            city: this.city(),
            state: this.state(),
            zipCode: this.zipCode()
          }
      };
      this.dataService.addServiceRequest(newRequest);
      this.requestSubmitted.emit();
    }
  }
}