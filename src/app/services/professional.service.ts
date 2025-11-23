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
  loading = signal(false);
  error = signal<string | null>(null);

  async registerProfessional(professional: Professional): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // 1. Cria profissional no Supabase
      const supabaseUrl = environment.supabaseRestUrl;
      const supabaseKey = environment.supabaseAnonKey;
      // Verifica se e-mail já existe
      const checkRes = await fetch(`${supabaseUrl}/users?select=email&email=eq.${professional.email}`, {
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
        if (Array.isArray(existsArr) && existsArr.length > 0) {
          this.error.set('E-mail já cadastrado.');
          this.loading.set(false);
          return false;
        }
      }

      // Cria profissional no Supabase
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
      // 2. Dispara e-mail de confirmação
      const emailRes = await fetch('http://localhost:4001/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: professional.email,
          subject: 'Confirme seu cadastro no HomeService',
          html: `<p>Olá ${professional.name},</p><p>Para ativar seu cadastro, clique no botão abaixo:</p>`
        })
      });
      if (!emailRes.ok) {
        const err = await emailRes.json();
        console.error('Erro envio e-mail:', err);
        this.error.set('Cadastro realizado, mas falha ao enviar e-mail.');
        this.loading.set(false);
        return false;
      }
      this.loading.set(false);
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Erro inesperado.');
      this.loading.set(false);
      return false;
    }
  }
}
