import { Injectable } from "@angular/core";
import {
  PostalCodeApiService,
  ValidationResult,
} from "./postal-code-api.service";
import { Observable, map, of } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class PortugalAddressValidationService {
  constructor(private postalCodeApi: PostalCodeApiService) {}

  /**
   * Valida formato de código postal português (XXXX-XXX) - versão síncrona básica
   */
  validatePostalCode(postalCode: string): boolean {
    const portuguesePostalCodeRegex = /^\d{4}-\d{3}$/;
    return portuguesePostalCodeRegex.test(postalCode);
  }

  /**
   * Valida código postal usando a API oficial - versão assíncrona completa
   */
  validatePostalCodeWithApi(postalCode: string): Observable<ValidationResult> {
    return this.postalCodeApi.validatePostalCode(postalCode);
  }

  /**
   * Formata código postal para o padrão português
   */
  formatPostalCode(input: string): string {
    // Remove todos os caracteres não numéricos
    const numbers = input.replace(/\D/g, "");

    // Se tem 7 dígitos, formata como XXXX-XXX
    if (numbers.length === 7) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4, 7)}`;
    }

    // Se tem menos de 7 dígitos, adiciona hífen após 4 dígitos
    if (numbers.length > 4) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    }

    return numbers;
  }

  /**
   * Lista de distritos de Portugal
   */
  getPortugueseDistricts(): string[] {
    return [
      "Aveiro",
      "Beja",
      "Braga",
      "Bragança",
      "Castelo Branco",
      "Coimbra",
      "Évora",
      "Faro",
      "Guarda",
      "Leiria",
      "Lisboa",
      "Portalegre",
      "Porto",
      "Santarém",
      "Setúbal",
      "Viana do Castelo",
      "Vila Real",
      "Viseu",
      // Regiões Autónomas
      "Região Autónoma dos Açores",
      "Região Autónoma da Madeira",
    ];
  }

  /**
   * Valida se o distrito é válido em Portugal
   */
  validateDistrict(district: string): boolean {
    return this.getPortugueseDistricts().includes(district);
  }

  /**
   * Obtém informações de código postal usando a API real ou fallback
   */
  async getPostalCodeInfo(postalCode: string): Promise<{
    locality: string;
    district: string;
    concelho: string;
  } | null> {
    if (!this.validatePostalCode(postalCode)) {
      return null;
    }

    try {
      // Tenta usar a API real primeiro
      const result = await this.postalCodeApi
        .validatePostalCode(postalCode)
        .toPromise();

      if (result?.isValid && result.locality && result.district) {
        return {
          locality: result.locality,
          district: result.district,
          concelho: result.municipality || result.locality,
        };
      }
    } catch (error) {
      console.warn("API indisponível, usando dados offline:", error);
    }

    // Fallback para dados simulados se a API falhar
    return this.getPostalCodeInfoOffline(postalCode);
  }

  /**
   * Fallback offline para informações de códigos postais
   */
  private getPostalCodeInfoOffline(postalCode: string): Promise<{
    locality: string;
    district: string;
    concelho: string;
  } | null> {
    // Simulação de dados - em produção integraria com API real
    const mockData: Record<
      string,
      { locality: string; district: string; concelho: string }
    > = {
      "1000-001": {
        locality: "Lisboa",
        district: "Lisboa",
        concelho: "Lisboa",
      },
      "4000-001": { locality: "Porto", district: "Porto", concelho: "Porto" },
      "3000-001": {
        locality: "Coimbra",
        district: "Coimbra",
        concelho: "Coimbra",
      },
      "2000-001": {
        locality: "Santarém",
        district: "Santarém",
        concelho: "Santarém",
      },
      "8000-001": { locality: "Faro", district: "Faro", concelho: "Faro" },
      "1100-048": {
        locality: "Lisboa",
        district: "Lisboa",
        concelho: "Lisboa",
      },
      "4000-066": {
        locality: "Porto",
        district: "Porto",
        concelho: "Porto",
      },
    };

    // Simula delay de API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockData[postalCode] || null);
      }, 300);
    });
  }
}
