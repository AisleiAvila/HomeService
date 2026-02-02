import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
  inject,
  OnInit,
  input,
  effect,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { AuthService } from "../../services/auth.service";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-reset-password",
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: "./reset-password.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  backToLogin = output<void>();
  passwordResetComplete = output<void>();

  // Input para receber email da tela anterior
  initialEmail = input<string>("");

  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  email = signal("");
  resetCode = signal("");
  newPassword = signal("");
  confirmPassword = signal("");

  isLoading = signal(false);
  isCodeVerified = signal(false);
  errorMessage = signal<string | null>(null);

  step = signal<"verify-code" | "new-password">("verify-code");

  constructor() {
    // Effect para definir email inicial quando recebido
    effect(() => {
      const initial = this.initialEmail();
      if (initial) {
        this.email.set(initial);
      }
    });
  }

  async ngOnInit() {
    // Sempre começar com verificação de código
    this.step.set("verify-code");
  }

  async verifyCode() {
    if (!this.resetCode()) {
      this.errorMessage.set("Por favor, informe o código recebido");
      return;
    }

    if (this.resetCode().length !== 6) {
      this.errorMessage.set("O código deve ter 6 dígitos");
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const isValid = await this.authService.verifyPasswordResetCode(
        this.email(),
        this.resetCode()
      );

      if (isValid) {
        this.isCodeVerified.set(true);
        this.step.set("new-password");
        this.notificationService.addNotification(
          "Código verificado com sucesso!"
        );
      } else {
        this.errorMessage.set("Código inválido ou expirado");
      }
    } catch (error: any) {
      console.error("Erro ao verificar código:", error);
      this.errorMessage.set(
        error.message || "Erro ao verificar código. Tente novamente."
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async resetPassword() {
    // Validações
    if (!this.newPassword()) {
      this.errorMessage.set("Por favor, informe a nova senha");
      return;
    }

    if (this.newPassword().length < 6) {
      this.errorMessage.set("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.errorMessage.set("As senhas não coincidem");
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.updatePasswordWithCode(
        this.email(),
        this.resetCode(),
        this.newPassword()
      );

      // Limpar dados temporários
      localStorage.removeItem("resetPasswordEmail");

      this.notificationService.addNotification(
        "Senha alterada com sucesso! Faça login com sua nova senha."
      );

      this.passwordResetComplete.emit();
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      this.errorMessage.set(
        error.message || "Erro ao redefinir senha. Tente novamente."
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async resendCode() {
    this.isLoading.set(true);
    try {
      await this.authService.sendPasswordResetCode(this.email());
      this.notificationService.addNotification(
        "Um novo código foi enviado para seu e-mail"
      );
    } catch (error: any) {
      console.error("Erro ao reenviar código:", error);
      this.errorMessage.set(
        error.message || "Erro ao reenviar código. Tente novamente."
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  goBackToCodeVerification() {
    this.step.set("verify-code");
    this.isCodeVerified.set(false);
    this.newPassword.set("");
    this.confirmPassword.set("");
    this.errorMessage.set(null);
  }

  // Método para formatar o input do código (apenas números)
  onCodeInput(event: any) {
    const value = event.target.value.replace(/\D/g, "").slice(0, 6);
    this.resetCode.set(value);
  }
}
