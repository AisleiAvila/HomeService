import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserRole } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  registered = output<{email: string, role: UserRole}>();
  switchToLogin = output<void>();
  switchToLanding = output<void>();

  name = signal('');
  email = signal('');
  password = signal('');
  role = signal<UserRole>('client');

  register() {
    if (this.name() && this.email() && this.password()) {
      // In a real app, you'd call a service here.
      // For this demo, we just emit the data.
      console.log(`Registering ${this.email()} as ${this.role()}`);
      this.registered.emit({ email: this.email(), role: this.role() });
    }
  }
}