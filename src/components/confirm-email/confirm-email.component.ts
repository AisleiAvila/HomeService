import { Component, inject } from '@angular/core';
import type { EmailOtpType } from '@supabase/gotrue-js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 class="text-xl font-bold mb-4">Definir nova senha</h2>
      <form (ngSubmit)="onSubmit()" *ngIf="!success">
        <div class="mb-4">
          <label class="block mb-1">Nova senha</label>
          <input type="password" [(ngModel)]="password" name="password" class="w-full border rounded px-3 py-2" required minlength="6" />
        </div>
        <div class="mb-4">
          <label class="block mb-1">Confirmar senha</label>
          <input type="password" [(ngModel)]="confirmPassword" name="confirmPassword" class="w-full border rounded px-3 py-2" required minlength="6" />
        </div>
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded" [disabled]="loading">
          {{ loading ? 'Salvando...' : 'Definir senha e entrar' }}
        </button>
        <div *ngIf="error" class="text-red-600 mt-2">{{ error }}</div>
      </form>
      <div *ngIf="success" class="text-green-700 font-semibold">
        Senha definida com sucesso! Redirecionando...
      </div>
    </div>
  `
})
export class ConfirmEmailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly notification = inject(NotificationService);

  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  success = false;

  async onSubmit() {
    this.error = '';
    if (this.password.length < 6) {
      this.error = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'As senhas não coincidem.';
      return;
    }
    this.loading = true;
    // O token vem como query param: ?token=...&type=signup
  const token = this.route.snapshot.queryParamMap.get('token');
  const type = this.route.snapshot.queryParamMap.get('type') as EmailOtpType;
  const email = this.route.snapshot.queryParamMap.get('email');
    if (!token || !type || !email) {
      this.error = 'Link de confirmação inválido.';
      this.loading = false;
      return;
    }
    try {
      // Confirma o token
      const { error: verifyError } = await this.supabase.client.auth.verifyOtp({
        email,
        token,
        type
      });
      if (verifyError) {
        this.error = verifyError.message;
        this.loading = false;
        return;
      }
      // Agora define a nova senha para o usuário autenticado
      const { error: updateError } = await this.supabase.client.auth.updateUser({
        password: this.password
      });
      if (updateError) {
        this.error = updateError.message;
        this.loading = false;
        return;
      }
      this.success = true;
      this.notification.addNotification('Senha definida com sucesso!');
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    } catch (e: any) {
      this.error = e.message || 'Erro ao definir senha.';
    } finally {
      this.loading = false;
    }
  }
}
