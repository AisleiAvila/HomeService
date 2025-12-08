import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmsService } from '../services/sms.service';
import { I18nPipe } from '../pipes/i18n.pipe';

/**
 * Componente de exemplo para demonstrar uso do SmsService
 * 
 * Este componente mostra como:
 * - Enviar SMS simples
 * - Usar templates predefinidos
 * - Verificar estado de envio
 * - Visualizar histórico
 * 
 * @example
 * ```html
 * <app-sms-demo></app-sms-demo>
 * ```
 */
@Component({
  selector: 'app-sms-demo',
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container mx-auto p-6 max-w-4xl">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <!-- Cabeçalho -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            📱 {{ 'sms_service_demo' | i18n }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            {{ 'sms_demo_description' | i18n }}
          </p>
        </div>

        <!-- Formulário de Envio -->
        <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 class="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            {{ 'send_sms' | i18n }}
          </h3>

          <!-- Campo de telefone -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'phone_number' | i18n }} *
            </label>
            <input
              type="tel"
              [(ngModel)]="phoneNumber"
              placeholder="+351912345678"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ 'phone_format_hint' | i18n }}
            </p>
          </div>

          <!-- Seletor de template -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'template' | i18n }}
            </label>
            <select
              [(ngModel)]="selectedTemplate"
              (change)="onTemplateChange()"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="custom">{{ 'custom_message' | i18n }}</option>
              <option value="verification">{{ 'verification_code' | i18n }}</option>
              <option value="notification">{{ 'service_notification' | i18n }}</option>
              <option value="reminder">{{ 'reminder' | i18n }}</option>
            </select>
          </div>

          <!-- Variáveis do template (condicional) -->
          @if (selectedTemplate() !== 'custom') {
            <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                {{ 'template_variables' | i18n }}:
              </p>
              @if (selectedTemplate() === 'verification') {
                <input
                  type="text"
                  [(ngModel)]="verificationCode"
                  placeholder="Código (ex: 123456)"
                  class="w-full px-3 py-2 mb-2 border border-blue-300 rounded-lg dark:bg-gray-700 dark:border-blue-700 dark:text-white"
                />
                <input
                  type="number"
                  [(ngModel)]="expiresIn"
                  placeholder="Expira em (minutos)"
                  class="w-full px-3 py-2 border border-blue-300 rounded-lg dark:bg-gray-700 dark:border-blue-700 dark:text-white"
                />
              }
              @if (selectedTemplate() === 'notification') {
                <input
                  type="text"
                  [(ngModel)]="requestId"
                  placeholder="ID do Pedido (ex: SR-001)"
                  class="w-full px-3 py-2 mb-2 border border-blue-300 rounded-lg dark:bg-gray-700 dark:border-blue-700 dark:text-white"
                />
                <input
                  type="text"
                  [(ngModel)]="status"
                  placeholder="Status (ex: Concluído)"
                  class="w-full px-3 py-2 border border-blue-300 rounded-lg dark:bg-gray-700 dark:border-blue-700 dark:text-white"
                />
              }
              @if (selectedTemplate() === 'reminder') {
                <input
                  type="text"
                  [(ngModel)]="serviceName"
                  placeholder="Nome do Serviço"
                  class="w-full px-3 py-2 mb-2 border border-blue-300 rounded-lg dark:bg-gray-700 dark:border-blue-700 dark:text-white"
                />
                <input
                  type="text"
                  [(ngModel)]="serviceDate"
                  placeholder="Data (ex: 15/01/2024 às 14:00)"
                  class="w-full px-3 py-2 border border-blue-300 rounded-lg dark:bg-gray-700 dark:border-blue-700 dark:text-white"
                />
              }
            </div>
          }

          <!-- Campo de mensagem -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'message' | i18n }} *
            </label>
            <textarea
              [(ngModel)]="message"
              [disabled]="selectedTemplate() !== 'custom'"
              rows="4"
              maxlength="1600"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:border-gray-500 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
              placeholder="{{ 'enter_message' | i18n }}"
            ></textarea>
            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{{ message().length }} / 1600 {{ 'characters' | i18n }}</span>
              <span>~{{ Math.ceil(message().length / 160) }} SMS</span>
            </div>
          </div>

          <!-- Botão de envio -->
          <button
            (click)="sendSms()"
            [disabled]="!phoneNumber() || !message() || smsService.isSending()"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            @if (smsService.isSending()) {
              <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ 'sending' | i18n }}...</span>
            } @else {
              <span>📤 {{ 'send_sms' | i18n }}</span>
            }
          </button>
        </div>

        <!-- Histórico de SMS -->
        @if (smsService.smsHistory().length > 0) {
          <div class="mt-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
                📜 {{ 'sms_history' | i18n }}
              </h3>
              <button
                (click)="clearHistory()"
                class="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
              >
                {{ 'clear_history' | i18n }}
              </button>
            </div>

            <div class="space-y-3">
              @for (sms of smsService.smsHistory(); track sms.id) {
                <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4"
                     [ngClass]="{
                       'border-green-500': sms.status === 'delivered',
                       'border-blue-500': sms.status === 'sent',
                       'border-yellow-500': sms.status === 'pending',
                       'border-red-500': sms.status === 'failed'
                     }">
                  <div class="flex justify-between items-start mb-2">
                    <span class="font-medium text-gray-800 dark:text-white">
                      {{ sms.to }}
                    </span>
                    <span class="text-xs px-2 py-1 rounded-full"
                          [ngClass]="{
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300': sms.status === 'delivered',
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300': sms.status === 'sent',
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300': sms.status === 'pending',
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300': sms.status === 'failed'
                          }">
                      {{ sms.status }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {{ sms.message }}
                  </p>
                  <div class="flex justify-between text-xs text-gray-500 dark:text-gray-500">
                    <span>{{ sms.sent_at | date:'short' }}</span>
                    @if (sms.error) {
                      <span class="text-red-600 dark:text-red-400">{{ sms.error }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SmsDemoComponent {
  readonly smsService = inject(SmsService);
  readonly Math = Math;

  // Campos do formulário
  phoneNumber = signal<string>('');
  message = signal<string>('');
  selectedTemplate = signal<'custom' | 'verification' | 'notification' | 'reminder'>('custom');

  // Variáveis de template
  verificationCode = signal<string>('');
  expiresIn = signal<number>(5);
  requestId = signal<string>('');
  status = signal<string>('');
  serviceName = signal<string>('');
  serviceDate = signal<string>('');

  /**
   * Atualiza mensagem quando template muda
   */
  onTemplateChange(): void {
    const template = this.selectedTemplate();
    
    if (template === 'custom') {
      this.message.set('');
    } else {
      // Mensagem será construída pelo serviço usando variáveis
      this.message.set(`[Template: ${template}]`);
    }
  }

  /**
   * Envia SMS
   */
  async sendSms(): Promise<void> {
    const template = this.selectedTemplate();

    if (template === 'custom') {
      // Envio de mensagem customizada
      await this.smsService.sendSms({
        to: this.phoneNumber(),
        message: this.message(),
      });
    } else if (template === 'verification') {
      // Envio de código de verificação
      await this.smsService.sendVerificationCode(
        this.phoneNumber(),
        this.verificationCode() || '123456',
        this.expiresIn()
      );
    } else if (template === 'notification') {
      // Envio de notificação
      await this.smsService.sendServiceNotification(
        this.phoneNumber(),
        this.requestId() || 'SR-001',
        this.status() || 'Concluído'
      );
    } else if (template === 'reminder') {
      // Envio de lembrete
      await this.smsService.sendReminder(
        this.phoneNumber(),
        this.serviceName() || 'Serviço',
        this.serviceDate() || new Date().toLocaleDateString()
      );
    }
  }

  /**
   * Limpa histórico de SMS
   */
  clearHistory(): void {
    this.smsService.clearHistory();
  }
}
