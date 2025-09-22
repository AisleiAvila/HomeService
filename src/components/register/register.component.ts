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

  register() {
    // Validar campos antes de enviar
    const emailValue = this.email().trim();
    const nameValue = this.name().trim();
    const passwordValue = this.password();

    // Validação básica
    if (!nameValue || !emailValue || !passwordValue) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Validação de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      alert("Por favor, insira um e-mail válido (exemplo: usuario@email.com)");
      return;
    }

    // Validação de senha (mínimo 6 caracteres)
    if (passwordValue.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
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
