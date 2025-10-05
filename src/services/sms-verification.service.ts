import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../environments/environment";
import { of } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class SmsVerificationService {
  constructor(private http: HttpClient) {}

  sendVerification(phone: string) {
    // Endpoint Supabase Function ou outro backend
    return this.http.post(`${environment.apiUrl}/sms/send`, { phone });
  }

  validateCode(phone: string, code: string) {
    // Simulação: só valida se o código for 123456
    if (code !== "123456") {
      // Retorna erro de validação
      return of({ valid: false, update: false });
    }

    // Busca usuário por id, valida telefone, só atualiza se corresponder
    // Espera que o id do usuário seja passado como parte do telefone (ex: "id|telefone")
    let userId: string | null = null;
    let inputPhone = phone;
    if (phone.includes("|")) {
      const parts = phone.split("|");
      userId = parts[0];
      inputPhone = parts[1];
    }
    if (!userId) {
      console.error("ID do usuário não fornecido para validação de telefone.");
      return of({ valid: false, update: false, error: "missing_id" });
    }
    const getUrl = `${
      environment.supabaseRestUrl
    }/users?id=eq.${encodeURIComponent(userId)}`;
    console.log("Supabase GET query URL:", getUrl);
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
            console.error("Usuário não encontrado pelo id.", result);
            return of({ valid: false, update: false, error: "user_not_found" });
          }
          const user = result[0];
          const dbPhone = (user.phone || "").replace(/\s+/g, "");
          const inputPhoneNorm = inputPhone.replace(/\s+/g, "");
          const phoneMatch = dbPhone === inputPhoneNorm;
          console.log("Comparando telefone:", {
            dbPhone,
            inputPhoneNorm,
            phoneMatch,
          });
          if (!phoneMatch) {
            return of({ valid: false, update: false, error: "phone_mismatch" });
          }
          const patchUrl = `${
            environment.supabaseRestUrl
          }/users?id=eq.${encodeURIComponent(userId)}`;
          console.log("Supabase PATCH query URL:", patchUrl);
          return this.http
            .patch(
              patchUrl,
              { phone_verified: true },
              {
                headers: {
                  apikey: environment.supabaseAnonKey,
                  Authorization: `Bearer ${environment.supabaseAnonKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=representation",
                },
              }
            )
            .pipe(
              map(() => {
                // Considera status 200 como sucesso, independente do array
                return { valid: true, update: true };
              })
            );
        })
      );
  }
}
