
import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nPipe } from '../../pipes/i18n.pipe';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, I18nPipe],
  templateUrl: './landing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  signIn = output<void>();
  createAccount = output<void>();
  currentYear = new Date().getFullYear();
  imgError = false;
  // Placeholder SVG (data URI) exibido se a imagem principal não estiver disponível
  placeholderDataUrl =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#3730a3"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g fill="none" stroke="#60a5fa" stroke-opacity="0.25">
    <circle cx="200" cy="150" r="120"/>
    <circle cx="1000" cy="520" r="160"/>
    <path d="M100 600 C300 500, 900 500, 1100 600"/>
  </g>
  <g fill="#93c5fd" fill-opacity="0.9">
    <path d="M300 420 h150 v-80 a20 20 0 0 1 20 -20 h60 a20 20 0 0 1 20 20 v80 h150 v100 H300 Z" opacity="0.25"/>
  </g>
  <text x="50%" y="45%" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="44" fill="#e0e7ff" opacity="0.95">Natan Construtora</text>
  <text x="50%" y="55%" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#bfdbfe" opacity="0.9">Imagem temporária (assets/landing-page.png ausente)</text>
  <text x="50%" y="64%" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#93c5fd" opacity="0.85">Substitua por src/assets/landing-page.png</text>
</svg>
`);

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
`;
  }

  private showSuccessMessage(): void {
    // Implemente a lógica para mostrar mensagem de sucesso se desejar
  }
}