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
import { AuthService } from "../../services/auth.service";

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
      class="flex items-center justify-center min-h-screen bg-linear-to-br from-brand-primary-100 via-white to-brand-primary-300 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 mobile-safe"
      aria-label="Tela de login"
    >
      <div
        class="w-full max-w-md md:max-w-lg lg:max-w-xl p-4 md:p-8 space-y-8 bg-white/90 dark:bg-neutral-800/90 dark:border-neutral-700 backdrop-blur-md rounded-3xl shadow-2xl relative border border-brand-primary-100 transition-all duration-300"
        role="form"
        aria-labelledby="login-title"
      >
        <button
          (click)="switchToLanding.emit()"
          class="absolute top-3 left-3 text-brand-primary-400 dark:text-brand-primary-500 hover:text-brand-primary-700 dark:hover:text-brand-primary-400 flex items-center focus:outline-none focus:ring-2 focus:ring-brand-primary-400 bg-white/80 dark:bg-neutral-700/80 px-2 py-1 rounded-lg shadow-sm"
          aria-label="Voltar para Home"
          tabindex="0"
        >
          <i class="fas fa-arrow-left mr-2" aria-hidden="true"></i>
          <span class="hidden sm:inline">{{ "backToHome" | i18n }}</span>
        </button>

        <div class="flex flex-col items-center pt-4 pb-2 gap-2">
          <img
            [src]="logoUrl"
            alt="Logo Natan General Service"
            class="h-16 w-16 md:h-20 md:w-20 rounded-full shadow-lg mb-2"
          />
          <h1
            id="login-title"
            class="text-3xl md:text-4xl font-extrabold text-brand-primary-700 dark:text-brand-primary-400 drop-shadow-sm"
          >
            {{ "signIn" | i18n }}
          </h1>
          <p class="mt-2 text-base text-brand-primary-400 dark:text-brand-primary-300 font-medium">
            {{ "welcomeBack" | i18n }}
          </p>
        </div>

        <!-- Spinner centralizado -->


        <form (ngSubmit)="login()" class="space-y-7" autocomplete="off" aria-describedby="login-error">
          <!-- Mensagem de Erro -->
          @if (errorMessage()) {
          <div
            id="login-error"
            class="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-md"
            role="alert"
            aria-live="assertive"
          >
            <div class="flex items-center">
              <i class="fas fa-exclamation-circle mr-2" aria-hidden="true"></i>
              <span>{{ errorMessage() | i18n }}</span>
            </div>
          </div>
          }

          <div>
            <label
              for="email"
              class="block text-sm font-semibold text-brand-primary-700 dark:text-brand-primary-300 mb-1"
              >{{ "email" | i18n }}</label
            >
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              aria-required="true"
              [attr.aria-invalid]="emailInvalid() ? 'true' : 'false'"
              aria-describedby="email-error"
              class="w-full px-4 py-2 border rounded-lg shadow-sm placeholder-brand-primary-300 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400 focus:border-brand-primary-400 transition-all duration-150 bg-brand-primary-50/40 dark:bg-neutral-600 dark:border-neutral-500 dark:text-neutral-50"
              [ngClass]="{ 'border-red-400 dark:border-red-600': emailInvalid(), 'border-brand-primary-200 dark:border-neutral-500': !emailInvalid() }"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              (blur)="validateEmail()"
              tabindex="1"
            />
            @if (emailInvalid()) {
            <span id="email-error" class="text-xs text-red-600 mt-1 block" role="alert">{{ "invalidEmail" | i18n }}</span>
            }
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-semibold text-brand-primary-700 dark:text-brand-primary-300 mb-1"
              >{{ "password" | i18n }}</label
            >
            <div class="relative">
              <input
                id="password"
                name="password"
                [type]="showPassword ? 'text' : 'password'"
                autocomplete="off"
                required
                aria-required="true"
                [attr.aria-invalid]="passwordInvalid() ? 'true' : 'false'"
                aria-describedby="password-error"
                class="w-full px-4 py-2 border rounded-lg shadow-sm placeholder-brand-primary-300 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400 focus:border-brand-primary-400 transition-all duration-150 bg-brand-primary-50/40 dark:bg-neutral-600 dark:border-neutral-500 dark:text-neutral-50"
                [ngClass]="{ 'border-red-400 dark:border-red-600': passwordInvalid(), 'border-brand-primary-200 dark:border-neutral-500': !passwordInvalid() }"
                [ngModel]="password()"
                (ngModelChange)="password.set($event)"
                (blur)="validatePassword()"
                tabindex="2"
              />
              <button
                type="button"
                (click)="toggleShowPassword()"
                class="absolute right-2 top-2 text-brand-primary-400 dark:text-brand-primary-500 hover:text-brand-primary-700 dark:hover:text-brand-primary-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-400 bg-white/80 dark:bg-neutral-700/80 px-2 py-1 rounded-lg"
                aria-label="{{ showPassword ? 'Ocultar senha' : 'Mostrar senha' }}"
                tabindex="3"
              >
                <i class="fas" [ngClass]="showPassword ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
              </button>
            </div>
            @if (passwordInvalid()) {
            <span id="password-error" class="text-xs text-red-600 dark:text-red-300 mt-1 block" role="alert">{{ "invalidPassword" | i18n }}</span>
            }
          </div>

          <div class="flex items-center justify-between mt-2">
            <button
              type="button"
              (click)="handleForgotPassword()"
              class="text-sm font-semibold text-brand-primary-500 dark:text-brand-primary-400 hover:text-brand-primary-700 dark:hover:text-brand-primary-300 focus:outline-none focus:ring-2 focus:ring-brand-primary-400 px-2 py-1 rounded-lg"
              aria-label="{{ 'forgotPassword' | i18n }}"
              tabindex="4"
            >
              {{ "forgotPassword" | i18n }}
            </button>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="!email() || !password() || isLoading() || emailInvalid() || passwordInvalid()"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-linear-to-r from-brand-primary-500 via-brand-primary-600 to-brand-primary-700 dark:from-brand-primary-600 dark:via-brand-primary-700 dark:to-brand-primary-800 hover:shadow-lg hover:scale-[1.02] dark:hover:shadow-brand-primary-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary-400 dark:focus:ring-offset-neutral-800 disabled:bg-brand-primary-300 dark:disabled:bg-brand-primary-800 disabled:cursor-not-allowed disabled:hover:scale-100 transition-transform duration-150"
              style="text-decoration: none !important; border-bottom: none !important; box-shadow: none !important;"
              aria-label="{{ 'login' | i18n }}"
              tabindex="5"
            >
              <span style="text-decoration: none !important; border-bottom: none !important;">{{ "login" | i18n }}</span>
            </button>
          </div>
        </form>

        <div class="mt-6 text-sm text-center text-brand-primary-500 dark:text-brand-primary-400">
          <span>{{ "dontHaveAccount" | i18n }}</span>
          <button
            (click)="switchToRegister.emit()"
            class="font-bold text-brand-primary-600 dark:text-brand-primary-400 hover:text-brand-primary-800 dark:hover:text-brand-primary-300 ml-1 focus:outline-none focus:ring-2 focus:ring-brand-primary-400 px-2 py-1 rounded-lg"
            aria-label="{{ 'createAccount' | i18n }}"
            tabindex="6"
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
  private readonly authService = inject(AuthService);
  switchToRegister = output<void>();
  switchToLanding = output<void>();
  forgotPassword = output<string>();

  email = signal("");
  password = signal("");
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  // Estado para mostrar/ocultar senha
  showPassword = false;

  // URL do logo com parâmetro para evitar cache
  logoUrl = `assets/logo-new.png?v=${Date.now()}`;

  // Estado de validação
  emailInvalid = signal(false);
  passwordInvalid = signal(false);

  // Rate limiting: máximo de 5 tentativas em 10 minutos
  maxAttempts = 5;
  attemptWindowMs = 10 * 60 * 1000; // 10 minutos
  attempts = signal<number[]>([]); // array de timestamps

  readonly i18n = inject(I18nService);

  private mapLoginErrorToI18nKey(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'authServerError';
    }

    const key = String(error.message || '').trim();
    if (key === 'tenantBillingBlocked') {
      return 'tenantBillingBlocked';
    }

    if (key === 'authAccessDenied') {
      return 'authAccessDenied';
    }

    return 'authServerError';
  }

  login() {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    // Limitação de tentativas
    const now = Date.now();
    const windowStart = now - this.attemptWindowMs;
    const filteredAttempts = this.attempts().filter(ts => ts > windowStart);
    if (filteredAttempts.length >= this.maxAttempts) {
      this.setError('tooManyAttempts');
      this.isLoading.set(false);
      return;
    }

    // Validação antes do submit
    this.validateEmail();
    this.validatePassword();
    if (this.emailInvalid() || this.passwordInvalid()) {
      this.isLoading.set(false);
      return;
    }

    this.authService.loginCustom(this.email(), this.password())
      .then((user) => {
        // Registra tentativa
        this.attempts.set([...filteredAttempts, now]);
        if (user) {
          this.clearError();
          // Redirecionamento pode ser feito via AppComponent ou Router
        } else {
          this.setError('invalidCredentials');
        }
      })
      .catch((error) => {
        // Registra tentativa
        this.attempts.set([...filteredAttempts, now]);
        this.setError(this.mapLoginErrorToI18nKey(error));
      })
      .finally(() => {
        this.isLoading.set(false);
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
    this.forgotPassword.emit(this.email());
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  validateEmail() {
    // Validação de email simplificada e prática
    const emailValue = this.email().trim();
    // Padrão simples: caracteres locais + @ + domínio com TLD
    const regex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    this.emailInvalid.set(!regex.test(emailValue));
  }

  validatePassword() {
    // Exemplo: mínimo 6 caracteres
    const pwd = this.password();
    this.passwordInvalid.set(pwd.length < 6);
  }
}

