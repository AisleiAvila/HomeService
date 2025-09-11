/**
 * ❌ ARQUIVO DESCONTINUADO - NÃO USAR
 *
 * Este serviço foi substituído pelo sistema integrado de base de dados:
 * - PortugalAddressDatabaseService (consultas diretas ao Supabase)
 * - PortugalAddressValidationService (validação unificada)
 *
 * Razões para descontinuação:
 * 1. API externa instável
 * 2. Base de dados Supabase completa implementada
 * 3. Melhor performance e confiabilidade
 *
 * Data de descontinuação: 11 Setembro 2025
 */

import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class PostalCodeApiService {
  constructor() {
    throw new Error(
      "❌ PostalCodeApiService foi DESCONTINUADO. Use PortugalAddressValidationService em vez deste."
    );
  }

  validatePostalCode(): Observable<never> {
    throw new Error(
      "❌ Use PortugalAddressValidationService.validatePostalCodeWithApi() em vez deste método."
    );
  }

  searchByLocality(): Observable<never> {
    throw new Error(
      "❌ Use PortugalAddressDatabaseService.getCodigosByLocalidade() em vez deste método."
    );
  }

  testApiConnectivity(): Observable<never> {
    throw new Error(
      "❌ API externa descontinuada. Use base de dados Supabase."
    );
  }
}
