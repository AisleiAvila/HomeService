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

  /**
   * URLs alternativas da API (incluindo HTTP devido ao redirect)
   */
  private readonly ALTERNATIVE_API_URLS = [
    "https://www.codigo-postal.pt/ws/v1/ptcp",
    "http://www.codigo-postal.pt/ws/v1/ptcp",
    "https://codigo-postal.pt/ws/v1/ptcp",
    "http://codigo-postal.pt/ws/v1/ptcp",
  ];

  /**
   * Proxies CORS como último recurso - ordenados por confiabilidade
   */
  private readonly CORS_PROXY_URLS = [
    "https://api.allorigins.win/get?url=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://corsproxy.io/?",
    "https://cors-anywhere.herokuapp.com/",
  ];

  private readonly REQUEST_TIMEOUT = 8000; // 8 segundos
  private currentProxyIndex = 0;

  /**
   * Modo debug para desenvolvimento - permite logs detalhados
   * Altere para `true` durante desenvolvimento ou debugging
   */
  private readonly DEBUG_MODE = true; // TODO: Alterar para false em produção

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

    console.log("🔍 Validando código postal:", normalizedCode);

    // Tenta múltiplas URLs da API
    return this.tryMultipleApiUrls(normalizedCode).pipe(
      catchError((error) => {
        if (this.DEBUG_MODE) {
          console.warn(
            "❌ Todas as APIs falharam, tentando proxies CORS...",
            error
          );
        }
        return this.tryWithCorsProxy(normalizedCode);
      }),
      catchError((error) => {
        console.warn(
          "❌ Proxies CORS também falharam, usando fallback offline...",
          error
        );
        return this.getOfflineFallback(normalizedCode);
      })
    );
  }

  /**
   * Tenta múltiplas URLs da API em sequência
   */
  private tryMultipleApiUrls(
    normalizedCode: string
  ): Observable<ValidationResult> {
    const cp4 = normalizedCode.substring(0, 4);

    return this.tryApiUrlsSequentially(normalizedCode, cp4, 0);
  }

  /**
   * Tenta URLs da API sequencialmente
   */
  private tryApiUrlsSequentially(
    normalizedCode: string,
    cp4: string,
    urlIndex: number
  ): Observable<ValidationResult> {
    if (urlIndex >= this.ALTERNATIVE_API_URLS.length) {
      throw new Error("Todas as URLs da API falharam");
    }

    const baseUrl = this.ALTERNATIVE_API_URLS[urlIndex];
    const searchUrl = `${baseUrl}/search/${cp4}`;

    if (this.DEBUG_MODE) {
      console.log(
        `🔄 Tentando API ${urlIndex + 1}/${
          this.ALTERNATIVE_API_URLS.length
        }: ${searchUrl}`
      );
    }

    return this.http.get<PostalCodeApiResponse>(searchUrl).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map((response) => {
        if (this.DEBUG_MODE) {
          console.log(`✅ API ${urlIndex + 1} funcionou!`);
        }
        return this.processApiResponse(response, normalizedCode);
      }),
      catchError((error) => {
        if (this.DEBUG_MODE) {
          console.warn(
            `❌ API ${urlIndex + 1} falhou:`,
            error.message || error.status || "Erro desconhecido"
          );
        }

        // Tenta a próxima URL
        return this.tryApiUrlsSequentially(normalizedCode, cp4, urlIndex + 1);
      })
    );
  }

  /**
   * Tenta acesso direto à API
   */
  private tryDirectApiCall(
    normalizedCode: string
  ): Observable<ValidationResult> {
    const cp4 = normalizedCode.substring(0, 4);
    const searchUrl = `${this.API_BASE_URL}/search/${cp4}`;

    return this.http.get<PostalCodeApiResponse>(searchUrl).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map((response) => this.processApiResponse(response, normalizedCode)),
      catchError((error) => {
        // Se for erro CORS, não loggar como erro grave
        if (error.status === 0) {
          throw new Error("CORS_ERROR");
        }
        throw error;
      })
    );
  }

  /**
   * Tenta acesso via proxy CORS
   */
  private tryWithCorsProxy(
    normalizedCode: string
  ): Observable<ValidationResult> {
    const cp4 = normalizedCode.substring(0, 4);
    const originalUrl = `${this.API_BASE_URL}/search/${cp4}`;

    return this.tryProxiesSequentially(originalUrl, normalizedCode, 0).pipe(
      catchError(() => {
        if (this.DEBUG_MODE) {
          console.warn(
            "Todos os proxies CORS falharam, usando fallback offline"
          );
        }
        return this.getOfflineFallback(normalizedCode);
      })
    );
  }

  /**
   * Tenta proxies CORS sequencialmente
   */
  private tryProxiesSequentially(
    originalUrl: string,
    normalizedCode: string,
    proxyIndex: number
  ): Observable<ValidationResult> {
    if (proxyIndex >= this.CORS_PROXY_URLS.length) {
      throw new Error("Todos os proxies CORS falharam");
    }

    const proxyUrl = this.CORS_PROXY_URLS[proxyIndex];
    const proxiedUrl = proxyUrl + encodeURIComponent(originalUrl);

    console.log(
      `🔄 Tentando proxy ${proxyIndex + 1}/${this.CORS_PROXY_URLS.length}: ${
        proxyUrl.replace("https://", "").split("/")[0]
      }`
    );

    return this.http.get<any>(proxiedUrl).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map((response) => {
        console.log(`✅ Sucesso com proxy ${proxyIndex + 1}`);
        return this.processProxyResponse(response, normalizedCode, proxyIndex);
      }),
      catchError((error) => {
        if (this.DEBUG_MODE) {
          console.warn(`❌ Proxy ${proxyIndex + 1} falhou:`, error.message);
        }
        return this.tryProxiesSequentially(
          originalUrl,
          normalizedCode,
          proxyIndex + 1
        );
      })
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
   * Processa resposta de proxy CORS que pode ter diferentes formatos
   * @param response Resposta do proxy (pode ser encapsulada)
   * @param targetPostalCode Código postal que estamos procurando  
   * @param proxyIndex Índice do proxy usado (para debugging)
   * @returns Resultado da validação
   */
  private processProxyResponse(
    response: any,
    targetPostalCode: string,
    proxyIndex: number
  ): ValidationResult {
    try {
      let actualData: PostalCodeApiResponse;

      // Diferentes formatos de proxy
      if (response.contents) {
        // AllOrigins format: { contents: "JSON_STRING" }
        actualData = JSON.parse(response.contents);
      } else if (response.data) {
        // Alguns proxies encapsulam em { data: ... }
        actualData = response.data;
      } else if (Array.isArray(response)) {
        // Resposta direta da API portuguesa
        actualData = { 
          results: response, 
          result: response.length > 0, 
          num_results: response.length 
        };
      } else if (response.results) {
        // Formato padrão da API
        actualData = response;
      } else {
        // Tentar interpretar como resposta direta
        actualData = { 
          results: [response], 
          result: true, 
          num_results: 1 
        };
      }

      if (this.DEBUG_MODE) {
        console.log(`🔍 Proxy ${proxyIndex + 1} retornou:`, actualData);
      }

      return this.processApiResponse(actualData, targetPostalCode);
    } catch (error) {
      console.warn(`❌ Erro ao processar resposta do proxy ${proxyIndex + 1}:`, error);
      return {
        isValid: false,
        error: `Erro ao processar resposta do proxy: ${error}`
      };
    }
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
   * Fallback offline com base de dados local básica
   * @param postalCode Código postal normalizado
   * @returns Observable com resultado offline
   */
  private getOfflineFallback(postalCode: string): Observable<ValidationResult> {
    console.log("🔄 Usando validação offline para:", postalCode);

    // Base de dados offline básica
    const offlineDatabase: Record<
      string,
      { locality: string; district: string; municipality: string }
    > = {
      "1000": {
        locality: "Lisboa",
        district: "Lisboa",
        municipality: "Lisboa",
      },
      "1100": {
        locality: "Lisboa",
        district: "Lisboa",
        municipality: "Lisboa",
      },
      "1200": {
        locality: "Lisboa",
        district: "Lisboa",
        municipality: "Lisboa",
      },
      "1300": {
        locality: "Lisboa",
        district: "Lisboa",
        municipality: "Lisboa",
      },
      "4000": { locality: "Porto", district: "Porto", municipality: "Porto" },
      "4100": { locality: "Porto", district: "Porto", municipality: "Porto" },
      "4200": { locality: "Porto", district: "Porto", municipality: "Porto" },
      "3000": {
        locality: "Coimbra",
        district: "Coimbra",
        municipality: "Coimbra",
      },
      "3100": {
        locality: "Coimbra",
        district: "Coimbra",
        municipality: "Coimbra",
      },
      "2000": {
        locality: "Santarém",
        district: "Santarém",
        municipality: "Santarém",
      },
      "2100": {
        locality: "Santarém",
        district: "Santarém",
        municipality: "Santarém",
      },
      "8000": { locality: "Faro", district: "Faro", municipality: "Faro" },
      "8100": { locality: "Faro", district: "Faro", municipality: "Faro" },
      "2970": {
        locality: "Sesimbra",
        district: "Setúbal",
        municipality: "Sesimbra",
      },
      "2975": {
        locality: "Sesimbra",
        district: "Setúbal",
        municipality: "Sesimbra",
      },
      // Códigos postais adicionais para melhor cobertura
      "9000": { locality: "Funchal", district: "Ilha da Madeira", municipality: "Funchal" },
      "9500": { locality: "Ponta Delgada", district: "Ilha de São Miguel", municipality: "Ponta Delgada" },
      "7000": { locality: "Évora", district: "Évora", municipality: "Évora" },
      "6000": { locality: "Castelo Branco", district: "Castelo Branco", municipality: "Castelo Branco" },
      "5000": { locality: "Vila Real", district: "Vila Real", municipality: "Vila Real" },
      "2800": { locality: "Almada", district: "Setúbal", municipality: "Almada" },
      "2900": { locality: "Setúbal", district: "Setúbal", municipality: "Setúbal" },
        municipality: "Sesimbra",
      },
      "2975": {
        locality: "Sesimbra",
        district: "Setúbal",
        municipality: "Sesimbra",
      },
    };

    const cp4 = postalCode.substring(0, 4);
    const areaInfo = offlineDatabase[cp4];

    if (areaInfo) {
      return of({
        isValid: true,
        postalCode: postalCode,
        locality: areaInfo.locality,
        district: areaInfo.district,
        municipality: areaInfo.municipality,
        error: "Validação offline - API indisponível",
      });
    }

    // Se não encontrar na base offline, validar apenas formato
    const isValidFormat = /^\d{4}-\d{3}$/.test(postalCode);

    return of({
      isValid: isValidFormat,
      postalCode: isValidFormat ? postalCode : undefined,
      error: isValidFormat
        ? "Formato válido mas localização desconhecida (API indisponível)"
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
