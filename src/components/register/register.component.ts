import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { UserRole } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { NotificationService } from "../../services/notification.service";
import { I18nService } from "@/src/i18n.service";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./register.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  registered = output<RegisterPayload>();
  switchToLogin = output<void>();
  switchToLanding = output<void>();

  name = signal("");
  email = signal("");
  password = signal("");
  role = signal<UserRole>("professional");

  // Injeção do serviço de internacionalização
  readonly i18n = inject(I18nService);

  private readonly notificationService = inject(NotificationService);

  // URL do logo com parâmetro para evitar cache
  logoUrl = `assets/logo-new.png?v=${Date.now()}`;

  register() {
    console.log("🚀 RegisterComponent.register() chamado");
    
    const emailValue = this.email().trim();
    const nameValue = this.name().trim();
    const passwordValue = this.password();

    console.log("📝 Dados do formulário:", {
      name: nameValue,
      email: emailValue,
      passwordLength: passwordValue.length,
      role: this.role(),
    });

    if (!nameValue || !emailValue || !passwordValue) {
      console.log("❌ Validação falhou: campos vazios");
      this.notificationService.addNotification(
        "Por favor, preencha todos os campos obrigatórios."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      console.log("❌ Validação falhou: formato de e-mail inválido");
      this.notificationService.addNotification(
        "Por favor, insira um e-mail válido (exemplo: usuario@email.com)"
      );
      return;
    }

    if (passwordValue.length < 6) {
      console.log("❌ Validação falhou: senha muito curta");
      this.notificationService.addNotification(
        "A senha deve ter pelo menos 6 caracteres."
      );
      return;
    }

    console.log("✅ Validação passou, emitindo evento registered");
    this.registered.emit({
      name: nameValue,
      email: emailValue,
      password: passwordValue,
      role: this.role(),
    });
    console.log("✅ Evento registered emitido com sucesso");
  }
}
