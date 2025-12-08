import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { I18nService } from '../i18n.service';
import { NotificationService } from './notification.service';

/**
 * Modelo para parâmetros de envio de SMS
 */
export interface SmsParams {
  to: string; // Número de telefone no formato internacional (+351...)
  message?: string; // Mensagem a ser enviada (opcional quando template é usado)
  template?: 'verification' | 'notification' | 'reminder' | 'custom'; // Template predefinido
  variables?: Record<string, string>; // Variáveis para substituição no template
}

/**
 * Modelo para resposta do envio de SMS
 */
export interface SmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp?: string;
}

/**
 * Modelo para histórico de SMS
 */
export interface SmsHistory {
  id: string;
  to: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sent_at: Date;
  delivered_at?: Date;
  error?: string;
}

/**
 * SmsService - Serviço para envio de SMS via Twilio
 * 
 * Segue os padrões da plataforma HomeService:
 * - Angular Signals para estado reativo
 * - Injeção de dependências via inject()
 * - Integração com I18nService para mensagens multilíngues
 * - Tratamento de erros com NotificationService
 * 
 * @example
 * ```typescript
 * const smsService = inject(SmsService);
 * 
 * // Envio simples
 * await smsService.sendSms({
 *   to: '+351912345678',
 *   message: 'Seu código de verificação é: 123456'
 * });
 * 
 * // Envio com template
 * await smsService.sendSms({
 *   to: '+351912345678',
 *   template: 'verification',
 *   variables: { code: '123456', expiresIn: '5' }
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class SmsService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly notificationService = inject(NotificationService);

  // Signal para controlar estado de carregamento
  private readonly _isSending = signal<boolean>(false);
  readonly isSending = this._isSending.asReadonly();

  // Signal para histórico de SMS enviados
  private readonly _smsHistory = signal<SmsHistory[]>([]);
  readonly smsHistory = this._smsHistory.asReadonly();

  // Endpoint do servidor de SMS (ajustar conforme deploy)
  private readonly SMS_ENDPOINT = environment.production
    ? 'https://home-service-nu.vercel.app/api/send-sms'
    : 'http://localhost:4001/api/send-sms';

  /**
   * Envia SMS usando o backend Node.js com Twilio
   * 
   * @param params - Parâmetros do SMS (destinatário, mensagem, template)
   * @returns Promise com resposta do envio
   */
  async sendSms(params: SmsParams): Promise<SmsResponse> {
    this._isSending.set(true);

    try {
      // Validação de entrada
      if (!params.to || !this.isValidPhoneNumber(params.to)) {
        throw new Error(this.i18n.translate('sms_invalid_phone'));
      }

      // Construir mensagem (template ou mensagem customizada)
      const message = params.template
        ? this.buildMessageFromTemplate(params.template, params.variables || {})
        : params.message;

      if (!message || message.trim().length === 0) {
        throw new Error(this.i18n.translate('sms_empty_message'));
      }

      // Enviar requisição HTTP para o backend
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
      });
      const response = await firstValueFrom(
        this.http.post<SmsResponse>(
          this.SMS_ENDPOINT,
          {
            to: params.to,
            message: message,
            template: params.template,
          },
          { headers }
        )
      );

      if (!response?.success) {
        throw new Error(response?.error || this.i18n.translate('sms_send_failed'));
      }

      // Adicionar ao histórico
      this.addToHistory({
        id: response.messageId || crypto.randomUUID(),
        to: params.to,
        message: message,
        status: 'sent',
        sent_at: new Date(),
      });

      // Notificar sucesso
      this.notificationService.addNotification(
        this.i18n.translate('sms_sent_success')
      );

      return response;
    } catch (error) {
      console.error('Erro ao enviar SMS:', error);

      const errorMessage = error instanceof Error 
        ? error.message 
        : this.i18n.translate('sms_send_error');

      this.notificationService.addNotification(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this._isSending.set(false);
    }
  }

  /**
   * Envia SMS de verificação com código
   * 
   * @param phone - Número de telefone
   * @param code - Código de verificação
   * @param expiresInMinutes - Tempo de expiração em minutos
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    expiresInMinutes: number = 5
  ): Promise<SmsResponse> {
    return this.sendSms({
      to: phone,
      template: 'verification',
      variables: {
        code: code,
        expiresIn: expiresInMinutes.toString(),
      },
    });
  }

  /**
   * Envia SMS de notificação sobre atualização de pedido de serviço
   * 
   * @param phone - Número de telefone
   * @param requestId - ID do pedido
   * @param status - Novo status
   */
  async sendServiceNotification(
    phone: string,
    requestId: string,
    status: string
  ): Promise<SmsResponse> {
    return this.sendSms({
      to: phone,
      template: 'notification',
      variables: {
        requestId: requestId,
        status: this.i18n.translate(`status_${status.toLowerCase()}`),
      },
    });
  }

  /**
   * Envia SMS de lembrete
   * 
   * @param phone - Número de telefone
   * @param serviceName - Nome do serviço
   * @param date - Data do serviço
   */
  async sendReminder(
    phone: string,
    serviceName: string,
    date: string
  ): Promise<SmsResponse> {
    return this.sendSms({
      to: phone,
      template: 'reminder',
      variables: {
        serviceName: serviceName,
        date: date,
      },
    });
  }

  /**
   * Constrói mensagem a partir de template predefinido
   * 
   * @param template - Nome do template
   * @param variables - Variáveis para substituição
   * @returns Mensagem construída
   */
  private buildMessageFromTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    const currentLang = this.i18n.getCurrentLanguage();
    const templates = this.getSmsTemplates();

    const templateKey = `${template}_${currentLang}` as keyof typeof templates;
    let message = templates[templateKey] || templates[`${template}_pt` as keyof typeof templates] || '';

    // Substituir variáveis no template
    for (const [key, value] of Object.entries(variables)) {
      message = message.replaceAll(`{{${key}}}`, value);
    }

    return message;
  }

  /**
   * Templates de SMS em português e inglês
   * 
   * @returns Objeto com templates de SMS
   */
  private getSmsTemplates() {
    return {
      // Templates em Português
      verification_pt: 'HomeService: Seu código de verificação é {{code}}. Válido por {{expiresIn}} minutos.',
      notification_pt: 'HomeService: Atualização do pedido #{{requestId}}. Novo status: {{status}}.',
      reminder_pt: 'HomeService: Lembrete - {{serviceName}} agendado para {{date}}.',
      
      // Templates em Inglês
      verification_en: 'HomeService: Your verification code is {{code}}. Valid for {{expiresIn}} minutes.',
      notification_en: 'HomeService: Update on request #{{requestId}}. New status: {{status}}.',
      reminder_en: 'HomeService: Reminder - {{serviceName}} scheduled for {{date}}.',
    };
  }

  /**
   * Valida formato de número de telefone internacional
   * 
   * @param phone - Número de telefone
   * @returns true se válido
   */
  private isValidPhoneNumber(phone: string): boolean {
    // Aceita formato internacional: +XXX... (mínimo 10 dígitos)
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(phone.replaceAll(/\s+/g, ''));
  }

  /**
   * Adiciona SMS ao histórico
   * 
   * @param sms - Dados do SMS
   */
  private addToHistory(sms: SmsHistory): void {
    this._smsHistory.update((current) => [sms, ...current].slice(0, 50)); // Mantém últimos 50
  }

  /**
   * Limpa histórico de SMS
   */
  clearHistory(): void {
    this._smsHistory.set([]);
  }

  /**
   * Atualiza status de um SMS no histórico
   * 
   * @param messageId - ID da mensagem
   * @param status - Novo status
   */
  updateSmsStatus(
    messageId: string,
    status: 'delivered' | 'failed',
    error?: string
  ): void {
    this._smsHistory.update((current) =>
      current.map((sms) =>
        sms.id === messageId
          ? {
              ...sms,
              status,
              delivered_at: status === 'delivered' ? new Date() : sms.delivered_at,
              error: error,
            }
          : sms
      )
    );
  }
}
