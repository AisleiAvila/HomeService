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
import { AuthService } from "../../services/auth.service";
import { NotificationService } from "../../services/notification.service";

@Component({
  selector: "app-forgot-password",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./forgot-password.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  backToLogin = output<void>();

  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  email = signal("");
  isLoading = signal(false);
  isEmailSent = signal(false);
  errorMessage = signal<string | null>(null);

  async sendResetEmail() {
    if (!this.email()) {
      this.errorMessage.set("Por favor, informe seu e-mail");
      return;
    }

    // Validar formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email())) {
      this.errorMessage.set("Por favor, informe um e-mail válido");
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.sendPasswordResetCode(this.email());
      this.isEmailSent.set(true);
      this.notificationService.addNotification(
        "Um código de redefinição foi enviado para seu e-mail"
      );
    } catch (error: any) {
      console.error("Erro ao enviar código de redefinição:", error);
      this.errorMessage.set(
        error.message || "Erro ao enviar código. Tente novamente."
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

  goToVerification() {
    // Armazenar o email temporariamente para a próxima tela
    localStorage.setItem("resetPasswordEmail", this.email());
    this.backToLogin.emit();
  }
}
