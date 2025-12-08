# 📱 Exemplos de Integração - Serviço SMS

## 🎯 Casos de Uso Práticos

### 1. Verificação de Telefone no Cadastro

```typescript
// cadastro.component.ts
import { Component, inject, signal } from "@angular/core";
import { SmsService } from "../services/sms.service";
import { AuthService } from "../services/auth.service";

export class CadastroComponent {
  private smsService = inject(SmsService);
  private authService = inject(AuthService);

  phone = signal<string>("");
  verificationCode = signal<string>("");
  sentCode = signal<string>("");
  codeSent = signal<boolean>(false);

  // Gerar e enviar código
  async sendVerificationCode(): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.sentCode.set(code);

    const response = await this.smsService.sendVerificationCode(
      this.phone(),
      code,
      5 // expira em 5 minutos
    );

    if (response.success) {
      this.codeSent.set(true);
      // Salvar código e expiração no backend
      await this.authService.saveSmsCode(this.phone(), code);
    }
  }

  // Validar código
  async validateCode(): Promise<boolean> {
    return this.verificationCode() === this.sentCode();
  }
}
```

### 2. Notificação de Mudança de Status

```typescript
// service-request.service.ts
import { Injectable, inject } from "@angular/core";
import { SmsService } from "./sms.service";
import { DataService } from "./data.service";

@Injectable({ providedIn: "root" })
export class ServiceRequestService {
  private smsService = inject(SmsService);
  private dataService = inject(DataService);

  async updateStatus(requestId: string, newStatus: string): Promise<void> {
    // Atualizar status no banco
    await this.dataService.updateServiceRequest(requestId, {
      status: newStatus,
    });

    // Obter dados do pedido e usuário
    const request = this.dataService.getRequestById(requestId);
    const user = this.dataService.getUserById(request.client_id);

    // Enviar SMS se usuário optou por receber
    if (user.receive_sms_notifications && user.phone_verified) {
      await this.smsService.sendServiceNotification(
        user.phone,
        requestId,
        newStatus
      );
    }
  }
}
```

### 3. Lembrete de Serviço Agendado

```typescript
// reminder.service.ts
import { Injectable, inject } from "@angular/core";
import { SmsService } from "./sms.service";

@Injectable({ providedIn: "root" })
export class ReminderService {
  private smsService = inject(SmsService);

  async sendServiceReminder(
    phone: string,
    serviceName: string,
    scheduledDate: Date
  ): Promise<void> {
    // Formatar data
    const formattedDate = scheduledDate.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Enviar lembrete
    await this.smsService.sendReminder(phone, serviceName, formattedDate);
  }

  // Agendar lembrete para 1 dia antes
  scheduleReminder(
    phone: string,
    serviceName: string,
    scheduledDate: Date
  ): void {
    const oneDayBefore = new Date(scheduledDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    const now = new Date();
    const delay = oneDayBefore.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        this.sendServiceReminder(phone, serviceName, scheduledDate);
      }, delay);
    }
  }
}
```

### 4. Confirmação de Pagamento

```typescript
// payment.component.ts
import { Component, inject, input } from "@angular/core";
import { SmsService } from "../services/sms.service";
import { ServiceRequest } from "../models/maintenance.models";

export class PaymentComponent {
  private smsService = inject(SmsService);

  request = input.required<ServiceRequest>();

  async confirmPayment(amount: number): Promise<void> {
    // Processar pagamento...

    // Enviar confirmação por SMS
    const message = `HomeService: Pagamento recebido para o pedido #${
      this.request().id
    }. Valor: €${amount.toFixed(2)}. Obrigado!`;

    await this.smsService.sendSms({
      to: this.request().client_phone!,
      message: message,
    });
  }
}
```

### 5. Atribuição de Serviço ao Profissional

```typescript
// admin-dashboard.component.ts
import { Component, inject } from "@angular/core";
import { SmsService } from "../services/sms.service";
import { DataService } from "../services/data.service";

export class AdminDashboardComponent {
  private smsService = inject(SmsService);
  private dataService = inject(DataService);

  async assignProfessional(
    requestId: string,
    professionalId: number
  ): Promise<void> {
    // Atribuir no banco de dados
    await this.dataService.assignProfessional(requestId, professionalId);

    // Obter dados
    const request = this.dataService.getRequestById(requestId);
    const professional = this.dataService.getUserById(professionalId);

    // Notificar profissional por SMS
    if (professional.receive_sms_notifications && professional.phone_verified) {
      const message = `HomeService: Novo serviço atribuído! ${request.title} - ${request.city}. Verifique os detalhes no app.`;

      await this.smsService.sendSms({
        to: professional.phone,
        message: message,
      });
    }
  }
}
```

### 6. Reset de Senha via SMS

```typescript
// forgot-password.component.ts
import { Component, inject, signal } from "@angular/core";
import { SmsService } from "../services/sms.service";
import { AuthService } from "../services/auth.service";

export class ForgotPasswordComponent {
  private smsService = inject(SmsService);
  private authService = inject(AuthService);

  phone = signal<string>("");
  resetCode = signal<string>("");
  newPassword = signal<string>("");
  codeSent = signal<boolean>(false);

  async sendResetCode(): Promise<void> {
    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Salvar código no banco com expiração
    await this.authService.saveResetCode(this.phone(), code, 15); // 15 min

    // Enviar por SMS
    const response = await this.smsService.sendSms({
      to: this.phone(),
      message: `HomeService: Seu código de recuperação é ${code}. Válido por 15 minutos.`,
    });

    if (response.success) {
      this.codeSent.set(true);
    }
  }

  async resetPassword(): Promise<void> {
    // Validar código e atualizar senha
    const valid = await this.authService.validateResetCode(
      this.phone(),
      this.resetCode()
    );

    if (valid) {
      await this.authService.updatePassword(this.phone(), this.newPassword());

      // Confirmar por SMS
      await this.smsService.sendSms({
        to: this.phone(),
        message: "HomeService: Sua senha foi alterada com sucesso!",
      });
    }
  }
}
```

### 7. Notificação de Avaliação Pendente

```typescript
// evaluation.service.ts
import { Injectable, inject } from "@angular/core";
import { SmsService } from "./sms.service";

@Injectable({ providedIn: "root" })
export class EvaluationService {
  private smsService = inject(SmsService);

  async sendEvaluationReminder(
    clientPhone: string,
    professionalName: string,
    requestId: string
  ): Promise<void> {
    const message = `HomeService: Avalie o serviço prestado por ${professionalName}. Acesse o app e compartilhe sua experiência!`;

    await this.smsService.sendSms({
      to: clientPhone,
      message: message,
    });
  }
}
```

### 8. Alerta de Serviço Urgente

```typescript
// emergency-service.component.ts
import { Component, inject } from "@angular/core";
import { SmsService } from "../services/sms.service";
import { DataService } from "../services/data.service";

export class EmergencyServiceComponent {
  private smsService = inject(SmsService);
  private dataService = inject(DataService);

  async notifyNearbyProfessionals(
    category: string,
    location: string,
    urgency: "high" | "critical"
  ): Promise<void> {
    // Buscar profissionais da categoria próximos
    const professionals = await this.dataService.getProfessionalsByCategory(
      category
    );

    // Enviar SMS para todos
    const promises = professionals
      .filter((p) => p.receive_sms_notifications && p.phone_verified)
      .map((professional) =>
        this.smsService.sendSms({
          to: professional.phone,
          message: `⚠️ URGENTE - HomeService: Serviço de ${category} em ${location}. Responda rápido pelo app!`,
        })
      );

    await Promise.all(promises);
  }
}
```

### 9. Confirmação de Agendamento

```typescript
// scheduling.component.ts
import { Component, inject } from "@angular/core";
import { SmsService } from "../services/sms.service";
import { I18nService } from "../i18n.service";

export class SchedulingComponent {
  private smsService = inject(SmsService);
  private i18n = inject(I18nService);

  async confirmScheduling(
    clientPhone: string,
    professionalName: string,
    serviceName: string,
    date: Date
  ): Promise<void> {
    const formattedDate = date.toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    const message = `HomeService: Serviço agendado! ${serviceName} com ${professionalName} em ${formattedDate}. Te aguardamos!`;

    await this.smsService.sendSms({
      to: clientPhone,
      message: message,
    });
  }
}
```

### 10. Preferências de Notificação

```typescript
// user-settings.component.ts
import { Component, inject, signal } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { SmsService } from "../services/sms.service";

export class UserSettingsComponent {
  private authService = inject(AuthService);
  private smsService = inject(SmsService);

  smsNotifications = signal<boolean>(false);

  async toggleSmsNotifications(): Promise<void> {
    const newValue = !this.smsNotifications();

    // Atualizar preferência no banco
    await this.authService.updateUserPreferences({
      receive_sms_notifications: newValue,
    });

    this.smsNotifications.set(newValue);

    // Confirmar mudança
    if (newValue) {
      const user = this.authService.currentUser();
      await this.smsService.sendSms({
        to: user.phone,
        message:
          "HomeService: Notificações SMS ativadas! Você receberá atualizações importantes.",
      });
    }
  }
}
```

## 🔄 Padrões de Integração

### Verificar Preferências Antes de Enviar

```typescript
async sendSmsIfEnabled(userId: number, message: string): Promise<void> {
  const user = await this.dataService.getUserById(userId);

  if (user.receive_sms_notifications && user.phone_verified && user.phone) {
    await this.smsService.sendSms({
      to: user.phone,
      message: message,
    });
  }
}
```

### Tratamento de Erros Gracioso

```typescript
async sendSmsWithFallback(phone: string, message: string): Promise<void> {
  try {
    const response = await this.smsService.sendSms({ to: phone, message });

    if (!response.success) {
      // Fallback: enviar email
      await this.emailService.sendEmail({
        to: userEmail,
        subject: 'Notificação HomeService',
        body: message,
      });
    }
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    // Logar erro mas não bloquear fluxo
  }
}
```

### Batch de SMS (múltiplos destinatários)

```typescript
async sendBulkSms(
  recipients: Array<{ phone: string; message: string }>
): Promise<void> {
  const delay = 1000; // 1 segundo entre envios (respeitar rate limit)

  for (const recipient of recipients) {
    await this.smsService.sendSms({
      to: recipient.phone,
      message: recipient.message,
    });

    // Aguardar antes do próximo envio
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

## 📊 Monitoramento

### Rastrear Taxa de Entrega

```typescript
async trackDeliveryRate(): Promise<number> {
  const history = this.smsService.smsHistory();
  const total = history.length;
  const delivered = history.filter(sms => sms.status === 'delivered').length;

  return total > 0 ? (delivered / total) * 100 : 0;
}
```

### Dashboard de SMS

```typescript
getSmsStats() {
  const history = this.smsService.smsHistory();

  return {
    total: history.length,
    sent: history.filter(s => s.status === 'sent').length,
    delivered: history.filter(s => s.status === 'delivered').length,
    failed: history.filter(s => s.status === 'failed').length,
    pending: history.filter(s => s.status === 'pending').length,
  };
}
```

---

**💡 Dica**: Sempre respeitar preferências do usuário e manter histórico para auditoria!
