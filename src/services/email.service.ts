import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface EmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  token?: string;
  tempPassword?: string;
}

export interface EmailResponse {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly http = inject(HttpClient);

  /**
   * Envia e-mail HTML
   */
  sendHtmlEmail(params: EmailParams): Observable<EmailResponse> {
    return this.sendEmail(params);
  }

  /**
   * Envia e-mail de texto simples
   */
  sendTextEmail(params: EmailParams): Observable<EmailResponse> {
    return this.sendEmail(params);
  }

  /**
   * Envia e-mail OTP (código de verificação)
   */
  sendOtpEmail(to: string, otp: string, context?: string): Observable<EmailResponse> {
    const subject = 'Código de assinatura do Relatório Técnico';
    const text = `Seu código (OTP) para assinar o Relatório Técnico é: ${otp}.\n\nExpira em 10 minutos.\n\n${context || ''}`;

    return this.sendEmail({
      to,
      subject,
      text
    });
  }

  /**
   * Método genérico para envio de e-mails via servidor local
   */
  private sendEmail(params: EmailParams): Observable<EmailResponse> {
    const url = this.getEmailServiceUrl();

    return this.http.post<EmailResponse>(url, params).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtém URL do serviço de e-mail baseado no ambiente
   */
  private getEmailServiceUrl(): string {
    // Em desenvolvimento: servidor local
    // Em produção: endpoint Vercel
    const isProduction = globalThis.location.hostname.includes('vercel.app');
    return isProduction ? '/api/send-email' : 'http://localhost:4001/api/send-email';
  }

  /**
   * Tratamento de erros
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Erro desconhecido no envio de e-mail';

    if (error.error instanceof ErrorEvent) {
      // Erro do lado cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do lado servidor
      if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.status === 0) {
        errorMessage = 'Servidor de e-mail não disponível. Verifique se o servidor local está rodando.';
      } else {
        errorMessage = `Erro ${error.status}: ${error.message}`;
      }
    }

    console.error('EmailService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}