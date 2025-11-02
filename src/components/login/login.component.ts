import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { I18nService } from "../../i18n.service";

export interface LoginPayload {
  email: string;
  password: string;
}

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div
      class="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-300 mobile-safe"
    >
      <div
        class="w-full max-w-md md:max-w-lg lg:max-w-xl p-4 md:p-8 space-y-8 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl relative border border-indigo-100 transition-all duration-300"
      >
        <button
          (click)="switchToLanding.emit()"
          class="absolute top-3 left-3 text-indigo-400 hover:text-indigo-700 flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80 px-2 py-1 rounded-lg shadow-sm"
          aria-label="Voltar para Home"
        >
          <i class="fas fa-arrow-left mr-2"></i>
          <span class="hidden sm:inline">{{ "backToHome" | i18n }}</span>
        </button>

        <!-- Seletor de idioma no topo direito -->
        <div class="absolute top-3 right-3 flex items-center gap-2 z-10">
          <i class="fas fa-globe text-indigo-500 text-lg"></i>
          <select
            class="px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            (change)="i18n.setLanguage($event.target.value)"
            [value]="i18n.language()"
            aria-label="Selecionar idioma"
          >
            <option value="pt">Português</option>
            <option value="en">English</option>
          </select>
        </div>
        <div class="flex flex-col items-center pt-10 pb-2 gap-2">
          <img
            src="src/assets/logo_dasad.png"
            alt="Logo HomeService"
            class="h-16 w-16 md:h-20 md:w-20 rounded-full shadow-lg mb-2"
          />
          <h1
            class="text-3xl md:text-4xl font-extrabold text-indigo-700 drop-shadow-sm"
          >
            {{ "signIn" | i18n }}
          </h1>
          <p class="mt-2 text-base text-indigo-400 font-medium">
            {{ "welcomeBack" | i18n }}
          </p>
        </div>

        <form (ngSubmit)="login()" class="space-y-7">
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
              class="block text-sm font-semibold text-indigo-700 mb-1"
              >{{ "email" | i18n }}</label
            >
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="w-full px-4 py-2 border border-indigo-200 rounded-lg shadow-sm placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-150 bg-indigo-50/40"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
            />
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-semibold text-indigo-700 mb-1"
              >{{ "password" | i18n }}</label
            >
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full px-4 py-2 border border-indigo-200 rounded-lg shadow-sm placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-150 bg-indigo-50/40"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
            />
          </div>

          <div class="flex items-center justify-between mt-2">
            <button
              type="button"
              (click)="handleForgotPassword()"
              class="text-sm font-semibold text-indigo-500 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 px-2 py-1 rounded-lg"
            >
              {{ "forgotPassword" | i18n }}
            </button>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="!email() || !password() || isLoading()"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all duration-150"
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

        <div class="mt-6 text-sm text-center text-indigo-500">
          <span>{{ "dontHaveAccount" | i18n }}</span>
          <button
            (click)="switchToRegister.emit()"
            class="font-bold text-indigo-600 hover:text-indigo-800 ml-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 px-2 py-1 rounded-lg"
          >
            {{ "createAccount" | i18n }}
          </button>
        </div>
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

  // Injeção do serviço de internacionalização
  readonly i18n = inject(I18nService);

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
    // Sempre permitir acesso à tela de reset, mesmo sem email preenchido
    this.forgotPassword.emit(this.email());
  }
}
