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
  templateUrl: "./login.component.html",
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

  // Estado de validação
  emailInvalid = signal(false);
  passwordInvalid = signal(false);

  // Rate limiting: máximo de 5 tentativas em 10 minutos
  maxAttempts = 5;
  attemptWindowMs = 10 * 60 * 1000; // 10 minutos
  attempts = signal<number[]>([]); // array de timestamps

  readonly i18n = inject(I18nService);

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
      .catch(() => {
        // Registra tentativa
        this.attempts.set([...filteredAttempts, now]);
        this.setError('authServerError');
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
