import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-email-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-confirmation.component.html',
})
export class EmailConfirmationComponent {
  private route = inject(ActivatedRoute);
  status = signal<'pending' | 'success' | 'error'>('pending');
  message = signal('');

  constructor() {
    this.route.queryParams.subscribe(async (params) => {
      const email = params['email'];
      if (!email) {
        this.status.set('error');
        this.message.set('E-mail não informado.');
        return;
      }
      try {
        const res = await fetch('/api/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.status.set('success');
          this.message.set('E-mail confirmado com sucesso!');
        } else {
          this.status.set('error');
          this.message.set(data.error || 'Falha ao confirmar e-mail.');
        }
      } catch (err) {
        this.status.set('error');
        this.message.set('Erro ao conectar ao servidor.');
      }
    });
  }
}
