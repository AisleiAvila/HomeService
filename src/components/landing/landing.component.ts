import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  signIn = output<void>();
  createAccount = output<void>();
  currentYear = new Date().getFullYear();

  /**
   * Método para lidar com o envio do formulário de orçamento
   * @param event - Evento do formulário
   */
  onSubmitQuote(event: Event): void {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const quoteData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      service: formData.get('service') as string,
      message: formData.get('message') as string,
    };

    console.log('Quote request:', quoteData);

    // Aqui você pode implementar a lógica para enviar os dados
    // Por exemplo: chamar um serviço para enviar email ou salvar no backend
    // this.quoteService.sendQuote(quoteData).subscribe(...)

    // Exemplo: Redirecionar para WhatsApp com os dados preenchidos
    const whatsappMessage = this.buildWhatsAppMessage(quoteData);
    const whatsappUrl = `https://wa.me/351910997548?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');

    // Resetar o formulário após o envio
    form.reset();
    
    // Opcional: Mostrar mensagem de sucesso
    this.showSuccessMessage();
  }

  /**
   * Constrói a mensagem formatada para WhatsApp
   * @param data - Dados do formulário
   * @returns Mensagem formatada
   */
  private buildWhatsAppMessage(data: {
    name: string;
    email: string;
    phone: string;
    service: string;
    message: string;
  }): string {
    return `
*Pedido de Orçamento - Natan Construtora*

*Nome:* ${data.name}
*Email:* ${data.email}
*Telefone:* ${data.phone}
*Serviço:* ${data.service}

*Mensagem:*
${data.message || 'Sem mensagem adicional'}

---
Enviado através do site HomeService
    `.trim();
  }

  /**
   * Exibe uma mensagem de sucesso após o envio do formulário
   */
  private showSuccessMessage(): void {
    // Implementação simples - você pode melhorar com um serviço de notificações
    alert('Pedido de orçamento enviado com sucesso! Entraremos em contato em breve.');
    
    // Ou usar um toast/snackbar mais elegante:
    // this.notificationService.success('Pedido enviado com sucesso!');
  }
}