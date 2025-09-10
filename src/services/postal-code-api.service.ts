import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, catchError, map, timeout } from "rxjs";

// Interface para a resposta da API https://www.codigo-postal.pt/
export interface PostalCodeApiResponse {
  result: boolean;
  num_results: number;
  results: PostalCodeResult[];
}

export interface PostalCodeResult {
  cp: string; // Código postal (ex: "1000-001")
  cp4: string; // Primeiros 4 dígitos (ex: "1000")
  cp3: string; // Últimos 3 dígitos (ex: "001")
  district: string; // Distrito (ex: "Lisboa")
  municipality: string; // Concelho (ex: "Lisboa")
  locality: string; // Localidade (ex: "Lisboa")
  street_name?: string; // Nome da rua (opcional)
  street_type?: string; // Tipo de rua (opcional)
}

export interface ValidationResult {
  isValid: boolean;
  postalCode?: string;
  locality?: string;
  district?: string;
  municipality?: string;
  street?: string;
  error?: string;
}

@Injectable({
  providedIn: "root",
})
export class PostalCodeApiService {
  private readonly API_BASE_URL = "https://www.codigo-postal.pt/ws/v1/ptcp";
  private readonly REQUEST_TIMEOUT = 5000; // 5 segundos

  constructor(private http: HttpClient) {}

  /**
   * Valida e obtém informações de um código postal através da API oficial
   * @param postalCode Código postal no formato XXXX-XXX ou XXXXXXX
   * @returns Observable com resultado da validação
   */
  validatePostalCode(postalCode: string): Observable<ValidationResult> {
    // Normaliza o código postal
    const normalizedCode = this.normalizePostalCode(postalCode);

    if (!normalizedCode) {
      return of({
        isValid: false,
        error: "Formato de código postal inválido. Use XXXX-XXX",
      });
    }

    // Busca na API usando apenas os primeiros 4 dígitos para melhor compatibilidade
    const cp4 = normalizedCode.substring(0, 4);
    const searchUrl = `${this.API_BASE_URL}/search/${cp4}`;

    return this.http.get<PostalCodeApiResponse>(searchUrl).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map((response) => this.processApiResponse(response, normalizedCode)),
      catchError((error) => this.handleApiError(error, normalizedCode))
    );
  }

  /**
   * Busca códigos postais por localidade
   * @param locality Nome da localidade (cidade, vila, etc.)
   * @returns Observable com lista de códigos postais encontrados
   */
  searchByLocality(locality: string): Observable<PostalCodeResult[]> {
    if (!locality || locality.trim().length < 2) {
      return of([]);
    }

    const searchUrl = `${this.API_BASE_URL}/search/${encodeURIComponent(
      locality.trim()
    )}`;

    return this.http.get<PostalCodeApiResponse>(searchUrl).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map((response) => (response.result ? response.results : [])),
      catchError(() => of([]))
    );
  }

  /**
   * Busca informações detalhadas de um código postal específico
   * @param postalCode Código postal completo (XXXX-XXX)
   * @returns Observable com informações detalhadas
   */
  getPostalCodeDetails(
    postalCode: string
  ): Observable<PostalCodeResult | null> {
    const normalizedCode = this.normalizePostalCode(postalCode);

    if (!normalizedCode) {
      return of(null);
    }

    return this.validatePostalCode(normalizedCode).pipe(
      map((result) => {
        if (result.isValid && result.postalCode) {
          return {
            cp: result.postalCode,
            cp4: result.postalCode.substring(0, 4),
            cp3: result.postalCode.substring(5, 8),
            district: result.district || "",
            municipality: result.municipality || "",
            locality: result.locality || "",
            street_name: result.street,
          };
        }
        return null;
      })
    );
  }

  /**
   * Normaliza código postal para o formato XXXX-XXX
   * @param postalCode Código postal em qualquer formato
   * @returns Código postal normalizado ou null se inválido
   */
  private normalizePostalCode(postalCode: string): string | null {
    if (!postalCode) return null;

    // Remove todos os caracteres não numéricos
    const numbers = postalCode.replace(/\D/g, "");

    // Deve ter exatamente 7 dígitos
    if (numbers.length !== 7) return null;

    // Formata como XXXX-XXX
    return `${numbers.substring(0, 4)}-${numbers.substring(4, 7)}`;
  }

  /**
   * Processa a resposta da API e encontra o código postal exato
   * @param response Resposta da API
   * @param targetPostalCode Código postal que estamos procurando
   * @returns Resultado da validação
   */
  private processApiResponse(
    response: PostalCodeApiResponse,
    targetPostalCode: string
  ): ValidationResult {
    if (
      !response.result ||
      !response.results ||
      response.results.length === 0
    ) {
      return {
        isValid: false,
        error: "Código postal não encontrado",
      };
    }

    // Procura pelo código postal exato
    const exactMatch = response.results.find(
      (result) => result.cp === targetPostalCode
    );

    if (exactMatch) {
      return {
        isValid: true,
        postalCode: exactMatch.cp,
        locality: exactMatch.locality,
        district: exactMatch.district,
        municipality: exactMatch.municipality,
        street: exactMatch.street_name,
      };
    }

    // Se não encontrou match exato, pega o primeiro resultado da mesma área
    const firstResult = response.results[0];
    return {
      isValid: false,
      postalCode: targetPostalCode,
      locality: firstResult.locality,
      district: firstResult.district,
      municipality: firstResult.municipality,
      error: `Código postal ${targetPostalCode} não encontrado. Área: ${firstResult.locality}, ${firstResult.district}`,
    };
  }

  /**
   * Trata erros da API
   * @param error Erro retornado
   * @param postalCode Código postal que estava sendo validado
   * @returns Resultado com fallback offline
   */
  private handleApiError(
    error: any,
    postalCode: string
  ): Observable<ValidationResult> {
    console.warn("Erro na API de códigos postais:", error);

    // Fallback: validação offline básica
    const isValidFormat = /^\d{4}-\d{3}$/.test(postalCode);

    return of({
      isValid: isValidFormat,
      postalCode: isValidFormat ? postalCode : undefined,
      error: isValidFormat
        ? "Validação offline (API indisponível)"
        : "Formato inválido e API indisponível",
    });
  }

  /**
   * Testa a conectividade com a API
   * @returns Observable indicando se a API está disponível
   */
  testApiConnectivity(): Observable<boolean> {
    const testUrl = `${this.API_BASE_URL}/search/1000`;

    return this.http.get<PostalCodeApiResponse>(testUrl).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(() => true),
      catchError(() => of(false))
    );
  }
}
