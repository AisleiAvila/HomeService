import { Component, inject, OnInit } from '@angular/core';
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


export class ConfirmEmailComponent implements OnInit {
    constructor() {
      // Ao inicializar, lógica de logout movida para ngOnInit
    }
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly notification = inject(NotificationService);

  password = '';
  confirmPassword = '';
  loading = false;
  error = '';
  success = false;
  private readonly i18n = inject<any>(/* I18nService */ require('../../i18n.service'));

  ngOnInit() {
    // Ao inicializar, força logout se houver sessão ativa
    this.supabase.client.auth.getSession().then(({ data }) => {
      if (data?.session) {
        this.supabase.client.auth.signOut();
      }
    });
  }

  private getTokenParams() {
    let token = this.route.snapshot.queryParamMap.get('token');
    let type = this.route.snapshot.queryParamMap.get('type');
    let email = this.route.snapshot.queryParamMap.get('email');
    if (!token && globalThis.location.hash) {
      const params = new URLSearchParams(globalThis.location.hash.substring(1));
      token = params.get('access_token');
      type = params.get('type') || 'magiclink';
      email = params.get('email');
    }
    return { token, type, email };
  }

  async onSubmit() {
    this.error = '';
    if (this.password.length < 6) {
      this.error = this.i18n.translate('passwordTooShort', 'A senha deve ter pelo menos 6 caracteres. Por favor, escolha uma senha mais forte.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = this.i18n.translate('passwordsDoNotMatch', 'As senhas informadas não coincidem. Verifique e tente novamente.');
      return;
    }
    this.loading = true;

    // Aceita token, type e email tanto via query string quanto via hash fragment
    const { token, type, email } = this.getTokenParams();

    if (!token || !type || !email) {
      this.error = this.i18n.translate('invalidOrExpiredLink', 'O link de acesso é inválido ou expirou. Solicite um novo convite ao administrador.');
      this.loading = false;
      return;
    }
    try {
      // Confirma o token
      const { error: verifyError } = await this.supabase.client.auth.verifyOtp({
        email,
        token,
        type: type as EmailOtpType
      });
      if (verifyError) {
        this.error = this.i18n.translate('invalidOrUsedLink', 'O link de acesso é inválido, expirou ou já foi utilizado. Solicite um novo convite ao administrador.');
        this.loading = false;
        return;
      }
      // Agora define a nova senha para o usuário autenticado
      const { error: updateError } = await this.supabase.client.auth.updateUser({
        password: this.password
      });
      if (updateError) {
        this.error = this.i18n.translate('unableToSetPassword', 'Não foi possível definir a nova senha. Tente novamente ou entre em contato com o suporte.');
        this.loading = false;
        return;
      }
      this.success = true;
      this.notification.addNotification(this.i18n.translate('passwordSetSuccess', 'Senha definida com sucesso! Agora você já pode acessar a plataforma.'));
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2500);
    } catch (e: any) {
      console.error('Erro inesperado ao definir a senha:', e);
      this.error = this.i18n.translate('unexpectedPasswordError', 'Ocorreu um erro inesperado ao definir a senha. Tente novamente ou contate o suporte.');
    } finally {
      this.loading = false;
    }
  }
}
