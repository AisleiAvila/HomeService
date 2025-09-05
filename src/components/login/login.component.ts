import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '../../pipes/i18n.pipe';

export interface LoginPayload {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  login = output<LoginPayload>();
  createAccount = output<void>();
  cancel = output<void>();
  forgotPassword = output<string>();

  email = signal('');
  password = signal('');

  submitLogin() {
    this.login.emit({ email: this.email(), password: this.password() });
  }

  handleForgotPassword() {
    if (this.email()) {
      this.forgotPassword.emit(this.email());
    }
  }
}
