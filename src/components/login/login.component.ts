
import { Component, ChangeDetectionStrategy, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '../../pipes/i18n.pipe';
import { NotificationService } from '../../services/notification.service';
import { I18nService } from '../../services/i18n.service';

export interface LoginPayload {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-900">
      <div class="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-bold text-white">{{ 'login' | i18n }}</h2>
          <p class="mt-2 text-sm text-gray-400">
            {{ 'or' | i18n }} <a (click)="createAccount.emit()" class="font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer">{{ 'createAnAccount' | i18n }}</a>
          </p>
        </div>
        <form class="mt-8 space-y-6" (ngSubmit)="onLogin()">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email-address" class="sr-only">{{ 'emailAddress' | i18n }}</label>
              <input id="email-address" name="email" type="email" autocomplete="email" required
                     [(ngModel)]="email"
                     class="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm rounded-t-md"
                     placeholder="{{ 'emailAddress' | i18n }}">
            </div>
            <div>
              <label for="password" class="sr-only">{{ 'password' | i18n }}</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required
                     [(ngModel)]="password"
                     class="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm rounded-b-md"
                     placeholder="{{ 'password' | i18n }}">
            </div>
          </div>

          <div class="flex items-center justify-between text-sm">
            <a (click)="onForgotPassword()" class="font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer">{{ 'forgotPassword' | i18n }}</a>
          </div>

          <div>
            <button type="submit"
                    class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800">
              {{ 'signIn' | i18n }}
            </button>
          </div>
          <div class="text-center">
            <button type="button" (click)="cancel.emit()"
                    class="w-full flex justify-center py-3 px-4 border border-gray-600 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800 mt-4">
              {{ 'cancel' | i18n }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  login = output<LoginPayload>();
  createAccount = output<void>();
  cancel = output<void>();
  forgotPassword = output<string>();

  private notificationService = inject(NotificationService);
  private i18n = inject(I18nService);

  email = signal('');
  password = signal('');

  onLogin() {
    this.login.emit({ email: this.email(), password: this.password() });
  }

  onForgotPassword() {
    if (this.email()) {
      this.forgotPassword.emit(this.email());
    } else {
      this.notificationService.addNotification(this.i18n.translate('forgotPasswordEmailMissing'));
    }
  }
}
