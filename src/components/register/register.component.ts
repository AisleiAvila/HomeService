import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { UserRole } from "../../models/maintenance.models";
import { I18nPipe } from "../../pipes/i18n.pipe";
import { inject } from "@angular/core";
import { I18nService } from "../../services/i18n.service";
import { NotificationService } from "../../services/notification.service";

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
  role = signal<UserRole>("client");

  // Injeção do serviço de internacionalização
  i18n = inject(I18nService);

  private notificationService = inject(NotificationService);

  register() {
    const emailValue = this.email().trim();
    const nameValue = this.name().trim();
    const passwordValue = this.password();

    if (!nameValue || !emailValue || !passwordValue) {
      this.notificationService.addNotification(
        "Por favor, preencha todos os campos obrigatórios."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      this.notificationService.addNotification(
        "Por favor, insira um e-mail válido (exemplo: usuario@email.com)"
      );
      return;
    }

    if (passwordValue.length < 6) {
      this.notificationService.addNotification(
        "A senha deve ter pelo menos 6 caracteres."
      );
      return;
    }

    this.registered.emit({
      name: nameValue,
      email: emailValue,
      password: passwordValue,
      role: this.role(),
    });
  }
}
