import {
  Component,
  signal,
  input,
  output,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { inject } from "@angular/core";
import { SmsVerificationService } from "../../services/sms-verification.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-sms-verification-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./sms-verification-modal.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmsVerificationModalComponent {
  user = input.required<{
    id: string;
    phone: string;
    phone_verified: boolean;
  }>();
  verified = output<boolean>();

  private readonly smsService = inject(SmsVerificationService);

  code = signal("");
  sentCode = signal("");
  expiresAt = signal<Date | null>(null);
  error = signal<string | null>(null);
  loading = signal(false);
  success = signal(false);

  sendCode() {
    this.loading.set(true);
    const phoneParam = `${this.user().id}|${this.user().phone}`;
    this.smsService.sendVerification(phoneParam).subscribe((res: any) => {
      if (res.sent) {
        this.sentCode.set(res.code);
        this.expiresAt.set(new Date(res.expiresAt));
        this.error.set(null);
      } else {
        this.error.set("Falha ao enviar código SMS");
      }
      this.loading.set(false);
    });
  }

  validate() {
    this.loading.set(true);
    const phoneParam = `${this.user().id}|${this.user().phone}`;
    this.smsService
      .validateCode(phoneParam, this.code())
      .subscribe((res: any) => {
        if (res.valid) {
          this.success.set(true);
          this.verified.emit(true);
          this.error.set(null);
        } else {
          let msg = "Código inválido";
          if (res.error === "expired") msg = "Código expirado";
          if (res.error === "no_code") msg = "Nenhum código gerado";
          if (res.error === "phone_mismatch") msg = "Telefone não confere";
          if (res.error === "user_not_found") msg = "Usuário não encontrado";
          this.error.set(msg);
        }
        this.loading.set(false);
      });
  }
}

