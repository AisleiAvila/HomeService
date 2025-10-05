import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../environments/environment";
import { of } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class SmsVerificationService {
  constructor(private http: HttpClient) {}

  // Gera código randômico de 6 dígitos
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Envia SMS (simulado) e salva código/expiração no usuário
  sendVerification(
    phone: string
  ): import("rxjs").Observable<{
    sent: boolean;
    code?: string;
    expiresAt?: string;
    error?: string;
  }> {
    // Espera que o id do usuário seja passado como parte do telefone (ex: "id|telefone")
    let userId: string | null = null;
    let inputPhone = phone;
    if (phone.includes("|")) {
      const parts = phone.split("|");
      userId = parts[0];
      inputPhone = parts[1];
    }
    if (!userId) {
      return of({ sent: false, error: "missing_id" });
    }
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutos
    const patchUrl = `${
      environment.supabaseRestUrl
    }/users?id=eq.${encodeURIComponent(userId)}`;
    // Salva código e expiração no usuário
    return this.http
      .patch(
        patchUrl,
        { sms_code: code, sms_code_expires_at: expiresAt },
        {
          headers: {
            apikey: environment.supabaseAnonKey,
            Authorization: `Bearer ${environment.supabaseAnonKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
        }
      )
      .pipe(map(() => ({ sent: true, code, expiresAt })));
  }

  validateCode(phone: string, code: string) {
    // Busca usuário por id, valida telefone, código e expiração
    let userId: string | null = null;
    let inputPhone = phone;
    if (phone.includes("|")) {
      const parts = phone.split("|");
      userId = parts[0];
      inputPhone = parts[1];
    }
    if (!userId) {
      return of({ valid: false, update: false, error: "missing_id" });
    }
    const getUrl = `${
      environment.supabaseRestUrl
    }/users?id=eq.${encodeURIComponent(userId)}`;
    return this.http
      .get(getUrl, {
        headers: {
          apikey: environment.supabaseAnonKey,
          Authorization: `Bearer ${environment.supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
      })
      .pipe(
        mergeMap((result: any) => {
          if (!Array.isArray(result) || result.length === 0) {
            return of({ valid: false, update: false, error: "user_not_found" });
          }
          const user = result[0];
          const dbPhone = (user.phone || "").replace(/\s+/g, "");
          const inputPhoneNorm = inputPhone.replace(/\s+/g, "");
          const phoneMatch = dbPhone === inputPhoneNorm;
          if (!phoneMatch) {
            return of({ valid: false, update: false, error: "phone_mismatch" });
          }
          // Valida código e expiração
          if (!user.sms_code || !user.sms_code_expires_at) {
            return of({ valid: false, update: false, error: "no_code" });
          }
          const now = new Date();
          const expires = new Date(user.sms_code_expires_at);
          if (now > expires) {
            return of({ valid: false, update: false, error: "expired" });
          }
          if (code !== user.sms_code) {
            return of({ valid: false, update: false, error: "invalid_code" });
          }
          // Código válido, atualiza phone_verified
          const patchUrl = `${
            environment.supabaseRestUrl
          }/users?id=eq.${encodeURIComponent(userId)}`;
          return this.http
            .patch(
              patchUrl,
              {
                phone_verified: true,
                sms_code: null,
                sms_code_expires_at: null,
              },
              {
                headers: {
                  apikey: environment.supabaseAnonKey,
                  Authorization: `Bearer ${environment.supabaseAnonKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=representation",
                },
              }
            )
            .pipe(map(() => ({ valid: true, update: true })));
        })
      );
  }
}
