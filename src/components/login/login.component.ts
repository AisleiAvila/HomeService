import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../pipes/i18n.pipe";

export interface LoginPayload {
  email: string;
  password: string;
}

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div
        class="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md relative"
      >
        <button
          (click)="switchToLanding.emit()"
          class="absolute top-4 left-4 text-gray-600 hover:text-indigo-600 flex items-center"
        >
          <i class="fas fa-arrow-left mr-2"></i>
          <span>{{ "backToHome" | i18n }}</span>
        </button>

        <div class="text-center pt-10">
          <h1 class="text-3xl font-bold text-gray-900">
            {{ "signIn" | i18n }}
          </h1>
          <p class="mt-2 text-sm text-gray-600">Welcome back to MaintainApp</p>
        </div>

        <form (ngSubmit)="login()" class="space-y-6">
          <!-- Mensagem de Erro -->
          @if (errorMessage()) {
          <div
            class="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md"
          >
            <div class="flex items-center">
              <i class="fas fa-exclamation-circle mr-2"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          </div>
          }

          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700"
              >{{ "email" | i18n }}</label
            >
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
            />
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700"
              >{{ "password" | i18n }}</label
            >
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
            />
          </div>

          <div class="flex items-center justify-between">
            <div class="text-sm">
              <button
                type="button"
                (click)="handleForgotPassword()"
                class="font-medium text-indigo-600 hover:text-indigo-500"
              >
                {{ "forgotPassword" | i18n }}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="!email() || !password() || isLoading()"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
            >
              @if (isLoading()) {
              <i class="fas fa-spinner fa-spin mr-2"></i>
              {{ "loggingIn" | i18n }}
              } @else {
              {{ "login" | i18n }}
              }
            </button>
          </div>
        </form>

        <p class="mt-4 text-sm text-center text-gray-600">
          {{ "dontHaveAccount" | i18n }}
          <button
            (click)="switchToRegister.emit()"
            class="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {{ "createAccount" | i18n }}
          </button>
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  loggedIn = output<LoginPayload>();
  switchToRegister = output<void>();
  switchToLanding = output<void>();
  forgotPassword = output<string>();

  email = signal("");
  password = signal("");
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  login() {
    console.log("Logging in with", this.email(), this.password());

    // Limpar mensagens de erro anteriores
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.loggedIn.emit({
      email: this.email(),
      password: this.password(),
    });
  }

  setError(message: string) {
    this.errorMessage.set(message);
    this.isLoading.set(false);
  }

  clearError() {
    this.errorMessage.set(null);
    this.isLoading.set(false);
  }

  handleForgotPassword() {
    console.log("Forgot password for email:", this.email());
    if (this.email()) {
      this.forgotPassword.emit(this.email());
    }
  }
}
