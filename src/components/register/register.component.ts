import { Component, ChangeDetectionStrategy, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  registrationComplete = output<void>();
  cancel = output<void>();

  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  name = signal('');
  email = signal('');
  phone = signal('');
  password = signal('');
  confirmPassword = signal('');

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      this.notificationService.addNotification('Please fill out all fields correctly.');
      return;
    }
    if (this.password() !== this.confirmPassword()) {
      this.notificationService.addNotification('Passwords do not match.');
      return;
    }

    const success = this.dataService.registerClient({
      name: this.name(),
      email: this.email(),
      phone: this.phone(),
      password: this.password(),
    });

    if (success) {
      this.registrationComplete.emit();
    }
  }
}
