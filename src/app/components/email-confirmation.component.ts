import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-email-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-confirmation.component.html',
})
export class EmailConfirmationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  status = signal<'pending' | 'success' | 'error'>('pending');
  message = signal('');

  constructor() {
    this.route.queryParams.subscribe(async (params) => {
      const email = params['email'];
      const token = params['token'] || params['access_token'];
      if (!email || !token) {
        this.status.set('error');
        this.message.set('E-mail ou token não informado.');
        return;
      }
      try {
        const res = await fetch('/api/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.status.set('success');
          this.message.set('E-mail confirmado com sucesso! Redirecionando...');
          setTimeout(() => {
            this.router.navigate(['/reset-password'], { queryParams: { email, token } });
          }, 1500);
        } else {
          this.status.set('error');
          this.message.set(data.error || 'Falha ao confirmar e-mail.');
        }
      } catch (err) {
        console.error('Erro ao confirmar e-mail:', err);
        this.status.set('error');
        this.message.set('Erro ao conectar ao servidor.');
      }
    });
  }
}
