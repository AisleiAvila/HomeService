import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class PortugalAddressValidationService {
  constructor() {}

  /**
   * Valida formato de código postal português (XXXX-XXX)
   */
  validatePostalCode(postalCode: string): boolean {
    const portuguesePostalCodeRegex = /^\d{4}-\d{3}$/;
    return portuguesePostalCodeRegex.test(postalCode);
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
   * Obtém informações básicas de código postal (simulado)
   * Em produção, integraria com API dos CTT ou similar
   */
  async getPostalCodeInfo(postalCode: string): Promise<{
    locality: string;
    district: string;
    concelho: string;
  } | null> {
    if (!this.validatePostalCode(postalCode)) {
      return null;
    }

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
    };

    // Simula delay de API
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockData[postalCode] || null;
  }
}
