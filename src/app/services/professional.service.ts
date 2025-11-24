import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface Professional {
  name: string;
  email: string;
  phone: string;
  specialty: string;
}

@Injectable({ providedIn: 'root' })
export class ProfessionalService {
    /**
     * Verifica se o e-mail já existe na tabela users via fetch
     */
    async emailExists(email: string): Promise<boolean> {
      const supabaseUrl = environment.supabaseRestUrl;
      const supabaseKey = environment.supabaseAnonKey;
      const checkRes = await fetch(`${supabaseUrl}/users?select=email&email=eq.${email}`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'accept-profile': 'public'
        }
      });
      if (checkRes.ok) {
        const existsArr = await checkRes.json();
        return Array.isArray(existsArr) && existsArr.length > 0;
      } else {
        let errText = await checkRes.text();
        let errJson;
        try {
          errJson = JSON.parse(errText);
        } catch {
          errJson = { message: errText };
        }
        console.error('Erro Supabase GET:', errJson);
        return false;
      }
    }
  loading = signal(false);
  error = signal<string | null>(null);

  async registerProfessional(professional: Professional): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // 1. Cria profissional no Supabase
      const supabaseUrl = environment.supabaseRestUrl;
      const supabaseKey = environment.supabaseAnonKey;
      // Verifica se e-mail já existe via fetch centralizado
      if (await this.emailExists(professional.email)) {
        this.error.set('E-mail já cadastrado.');
        this.loading.set(false);
        return false;
      }

      // 1. Gera token único para confirmação (exemplo: UUID)
      const token = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now();
      console.log('Token de confirmação gerado: ', token);

      // 2. Gera senha temporária
      const tempPassword = Math.random().toString(36).slice(-8);
      console.log('Senha temporária gerada:', tempPassword);

      // 3. Monta o link e o HTML usando o token recém-gerado
      const confirmLink = `https://home-service-nu.vercel.app/confirmar-email?email=${encodeURIComponent(professional.email)}&token=${token}`;
      const html = `<p>Olá ${professional.name},</p>
        <p>Seu cadastro como profissional foi realizado com sucesso.<br>
        Use a senha temporária abaixo para acessar o sistema pela primeira vez:<br>
        <b>${tempPassword}</b></p>
        <p>Antes de acessar, confirme seu e-mail clicando no link abaixo:</p>
        <p><a href='${confirmLink}'>Confirmar e-mail</a></p>
        <p>Após o primeiro login, você será redirecionado para definir uma nova senha.</p>`;

      // 4. Cria profissional no Supabase incluindo o token e senha temporária
      const res = await fetch(`${supabaseUrl}/users`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          'accept-profile': 'public'
        },
        body: JSON.stringify({
          name: professional.name,
          email: professional.email,
          phone: professional.phone,
          specialty: professional.specialty,
          role: 'professional',
          status: 'Pending',
          confirmation_token: token,
          password: tempPassword
        })
      });
      if (!res.ok) {
        let errText = await res.text();
        let errJson;
        try {
          errJson = JSON.parse(errText);
        } catch {
          errJson = { message: errText };
        }
        console.error('Erro Supabase:', errJson);
        this.error.set(errJson?.message || errText || 'Erro ao criar profissional.');
        this.loading.set(false);
        return false;
      }

      // 4. Dispara e-mail de confirmação
      console.log('Enviando e-mail de confirmação:', {
        to: professional.email,
        subject: 'Confirmação de cadastro - HomeService',
        html,
        token
      });
      await fetch('http://localhost:4001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: professional.email,
          subject: 'Confirmação de cadastro - HomeService',
          html,
          token,
          tempPassword
        })
      });

      this.loading.set(false);
      return true;
    } catch (error) {
      console.error('Erro ao registrar profissional:', error);
      this.error.set('Erro inesperado ao registrar profissional.');
      this.loading.set(false);
      return false;
    }
  }
}
