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
 * Segue os padrões da plataforma Natan General Service:
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
    ? 'https://natan-general-service.vercel.app/api/send-sms'
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
      this.validateSmsParams(params);
      const message = this.prepareMessage(params);
      const response = await this.sendSmsRequest(params.to, message, params.template);
      this.handleSuccessfulSms(response, params.to, message);
      return response;
    } catch (error) {
      return this.handleSmsError(error);
    } finally {
      this._isSending.set(false);
    }
  }

  /**
   * Valida parâmetros do SMS
   * 
   * @param params - Parâmetros do SMS
   * @throws Error se parâmetros inválidos
   */
  private validateSmsParams(params: SmsParams): void {
    if (!params.to || !this.isValidPhoneNumber(params.to)) {
      throw new Error(this.i18n.translate('sms_invalid_phone'));
    }
  }

  /**
   * Prepara mensagem a partir de parâmetros
   * 
   * @param params - Parâmetros do SMS
   * @returns Mensagem preparada
   * @throws Error se mensagem inválida
   */
  private prepareMessage(params: SmsParams): string {
    const message = params.template
      ? this.buildMessageFromTemplate(params.template, params.variables || {})
      : params.message;

    if (!message || message.trim().length === 0) {
      throw new Error(this.i18n.translate('sms_empty_message'));
    }

    return message;
  }

  /**
   * Envia requisição HTTP para backend
   * 
   * @param to - Número de telefone
   * @param message - Mensagem
   * @param template - Template opcional
   * @returns Resposta do servidor
   * @throws Error se envio falhar
   */
  private async sendSmsRequest(
    to: string,
    message: string,
    template?: string
  ): Promise<SmsResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const response = await firstValueFrom(
      this.http.post<SmsResponse>(
        this.SMS_ENDPOINT,
        { to, message, template },
        { headers }
      )
    );

    if (!response?.success) {
      throw new Error(response?.error || this.i18n.translate('sms_send_failed'));
    }

    return response;
  }

  /**
   * Processa SMS enviado com sucesso
   * 
   * @param response - Resposta do servidor
   * @param to - Número de telefone
   * @param message - Mensagem enviada
   */
  private handleSuccessfulSms(
    response: SmsResponse,
    to: string,
    message: string
  ): void {
    this.addToHistory({
      id: response.messageId || crypto.randomUUID(),
      to,
      message,
      status: 'sent',
      sent_at: new Date(),
    });

    this.notificationService.addNotification(
      this.i18n.translate('sms_sent_success')
    );
  }

  /**
   * Processa erro no envio de SMS
   * 
   * @param error - Erro capturado
   * @returns Resposta de erro
   */
  private handleSmsError(error: unknown): SmsResponse {
    console.error('❌ [SMS] Erro ao enviar SMS:', error);

    const errorMessage = this.extractErrorMessage(error);
    this.notifyErrorIfNeeded(errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }

  /**
   * Extrai mensagem de erro de diferentes tipos de erro
   * 
   * @param error - Erro capturado
   * @returns Mensagem de erro formatada
   */
  private extractErrorMessage(error: unknown): string {
    let errorMessage = this.i18n.translate('sms_send_error');

    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('❌ [SMS] Mensagem de erro:', error.message);
    } else if (error && typeof error === 'object' && 'error' in error) {
      const httpError = error as { error?: { message?: string } };
      if (httpError.error?.message) {
        errorMessage = httpError.error.message;
      }
      console.error('❌ [SMS] Detalhes HTTP:', httpError);
    }

    return errorMessage;
  }

  /**
   * Notifica erro se não for erro de conexão
   * 
   * @param errorMessage - Mensagem de erro
   */
  private notifyErrorIfNeeded(errorMessage: string): void {
    const isConnectionError = errorMessage.includes('Connection refused') || 
                             errorMessage.includes('ECONNREFUSED');

    if (isConnectionError) {
      console.warn('⚠️ [SMS] Servidor SMS não disponível. Apenas notificação in-app será criada.');
    } else {
      this.notificationService.addNotification(errorMessage);
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
      verification_pt: 'Natan General Service: Seu código de verificação é {{code}}. Válido por {{expiresIn}} minutos.',
      notification_pt: 'Natan General Service: Atualização do pedido #{{requestId}}. Novo status: {{status}}.',
      reminder_pt: 'Natan General Service: Lembrete - {{serviceName}} agendado para {{date}}.',
      
      // Templates em Inglês
      verification_en: 'Natan General Service: Your verification code is {{code}}. Valid for {{expiresIn}} minutes.',
      notification_en: 'Natan General Service: Update on request #{{requestId}}. New status: {{status}}.',
      reminder_en: 'Natan General Service: Reminder - {{serviceName}} scheduled for {{date}}.',
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
