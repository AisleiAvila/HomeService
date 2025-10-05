import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../environments/environment";

@Injectable({ providedIn: "root" })
export class SmsVerificationService {
  constructor(private http: HttpClient) {}

  sendVerification(phone: string) {
    // Endpoint Supabase Function ou outro backend
    return this.http.post(`${environment.apiUrl}/sms/send`, { phone });
  }

  validateCode(phone: string, code: string) {
    return this.http.post(`${environment.apiUrl}/sms/validate`, {
      phone,
      code,
    });
  }
}
