
import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// FIX: Correct import path for the UserRole model
import { UserRole } from '../../models/maintenance.models';
import { I18nPipe } from '../../pipes/i18n.pipe';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  registered = output<RegisterPayload>();
  switchToLogin = output<void>();
  switchToLanding = output<void>();
  
  name = signal('');
  email = signal('');
  password = signal('');
  role = signal<UserRole>('client');

  register() {
    this.registered.emit({
      name: this.name(),
      email: this.email(),
      password: this.password(),
      role: this.role()
    });
  }
}
