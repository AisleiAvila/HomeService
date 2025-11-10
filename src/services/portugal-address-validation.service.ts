import { Injectable, inject } from "@angular/core";
import { Observable, from, map } from "rxjs";
import {
  ValidationResult
} from "../interfaces/postal-code.interface";
import { PostalCodeUtils } from "../utils/postal-code.utils";
import { PortugalAddressDatabaseService } from "./portugal-address-database.service";

@Injectable({
  providedIn: "root",
})
export class PortugalAddressValidationService {
  private readonly databaseService = inject(PortugalAddressDatabaseService);

  constructor() {}

  /**
   * Valida formato de código postal português (XXXX-XXX) - versão síncrona básica
   */
  validatePostalCode(postalCode: string): boolean {
    return PostalCodeUtils.isValidFormat(postalCode);
  }

  /**
   * Valida código postal usando a API oficial - versão assíncrona completa
   * AGORA USA BASE DE DADOS COMO FONTE PRIMÁRIA
   */
  validatePostalCodeWithApi(postalCode: string): Observable<ValidationResult> {
    console.log(
      "🔧 [DB SERVICE] Iniciando validatePostalCodeWithApi para:",
      postalCode
    );

    // Primeiro tentar com a base de dados local
    return from(this.validateWithDatabase(postalCode)).pipe(
      map((result) => {
        console.log("🔍 [DB SERVICE] Resultado da base de dados:", result);

        if (result.valid && result.endereco) {
          console.log(
            "✅ [DB SERVICE] Dados válidos encontrados na base de dados:",
            result.endereco
          );

          return {
            isValid: true,
            postalCode: result.endereco.codigo_postal,
            locality: result.endereco.localidade,
            municipality: result.endereco.concelho,
            district: result.endereco.distrito,
            street: result.endereco.arteria || "",
          } as ValidationResult;
        } else {
          console.warn(
            "⚠️ [DB SERVICE] Base de dados não retornou dados válidos, usando fallback"
          );
          // Fallback para API externa apenas se não encontrar na base de dados
          return this.fallbackToApi(postalCode);
        }
      })
    );
  }

  /**
   * Valida com base de dados local - novo método
   */
  private async validateWithDatabase(
    postalCode: string
  ): Promise<{ valid: boolean; endereco?: any }> {
    console.log(
      "💾 [DB SERVICE] Tentando validação na base de dados para:",
      postalCode
    );

    try {
      const result = await this.databaseService.validateCodigoPostal(
        postalCode
      );

      console.log(
        "📊 [DB SERVICE] Resultado do databaseService.validateCodigoPostal:",
        result
      );
      return result;
    } catch (error) {
      console.error(
        "❌ [DB SERVICE] Erro na validação com base de dados:",
        error
      );
      return { valid: false };
    }
  }

  /**
   * Fallback para API externa
   */
  private fallbackToApi(postalCode: string): ValidationResult {
    console.log("Usando API externa como fallback para:", postalCode);
    // Aqui poderia chamar a API original, por agora retornar resultado básico
    return {
      isValid: PostalCodeUtils.isValidFormat(postalCode),
      postalCode: postalCode,
      error: "Código postal não encontrado na base de dados local",
    };
  }

  /**
   * Formata código postal para o padrão português
   */
  formatPostalCode(input: string): string {
    return PostalCodeUtils.format(input);
  }

  /**
   * Lista de distritos de Portugal - ATUALIZADO para usar base de dados
   */
  async getPortugueseDistricts(): Promise<string[]> {
    try {
      const distritos = await this.databaseService.getDistritos();
      return distritos.map((d) => d.nome).sort((a, b) => a.localeCompare(b, 'pt-PT'));
    } catch (error) {
      console.warn(
        "Erro ao buscar distritos da base de dados, usando lista fixa:",
        error
      );
      return this.getPortugueseDistrictsOffline();
    }
  }

  /**
   * Lista offline de distritos (fallback)
   */
  getPortugueseDistrictsOffline(): string[] {
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
   * Valida se o distrito é válido em Portugal - ATUALIZADO para usar base de dados
   */
  async validateDistrict(district: string): Promise<boolean> {
    try {
      const distritos = await this.getPortugueseDistricts();
      return distritos.includes(district);
    } catch (error) {
      console.warn(
        "Erro na validação de distrito, usando lista offline:",
        error
      );
      return this.getPortugueseDistrictsOffline().includes(district);
    }
  }

  /**
   * Obtém informações de código postal usando a base de dados local
   * ATUALIZADO PARA USAR APENAS BASE DE DADOS
   */
  async getPostalCodeInfo(postalCode: string): Promise<{
    locality: string;
    district: string;
    concelho: string;
  } | null> {
    console.log("🏢 [DB SERVICE] getPostalCodeInfo iniciado para:", postalCode);

    if (!this.validatePostalCode(postalCode)) {
      console.warn(
        "⚠️ [DB SERVICE] Formato de código postal inválido:",
        postalCode
      );
      return null;
    }

    try {
      // USAR APENAS A BASE DE DADOS LOCAL
      console.log(
        "💾 [DB SERVICE] Consultando base de dados para código postal:",
        postalCode
      );
      const result = await this.databaseService.validateCodigoPostal(
        postalCode
      );

      if (result.valid && result.endereco) {
        const info = {
          locality: result.endereco.localidade,
          district: result.endereco.distrito,
          concelho: result.endereco.concelho,
        };
        console.log(
          "✅ [DB SERVICE] Informações encontradas na base de dados:",
          info
        );
        return info;
      } else {
        console.warn(
          "⚠️ [DB SERVICE] Código postal não encontrado na base de dados:",
          postalCode
        );
      }
    } catch (error) {
      console.error("❌ [DB SERVICE] Erro ao consultar base de dados:", error);
    }

    // FALLBACK: usar dados simulados apenas se absolutamente necessário
    console.log("🔄 [DB SERVICE] Usando fallback offline para:", postalCode);
    return this.getPostalCodeInfoOffline(postalCode);
  }

  /**
   * NOVOS MÉTODOS QUE UTILIZAM A BASE DE DADOS SUPABASE
   */

  /**
   * Busca sugestões de códigos postais por localidade
   */
  async getCodigoPostalSuggestions(
    localidade: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const codigos = await this.databaseService.getCodigosByLocalidade(
        localidade,
        limit
      );
      return codigos.map((c) => c.codigo_postal_completo);
    } catch (error) {
      console.warn("Erro ao buscar sugestões:", error);
      return [];
    }
  }

  /**
   * Busca concelhos por distrito
   */
  async getConcelhosByDistrito(nomeDistrito: string): Promise<string[]> {
    try {
      const distritos = await this.databaseService.getDistritos();
      const distrito = distritos.find((d) => d.nome === nomeDistrito);

      if (distrito) {
        const concelhos = await this.databaseService.getConcelhosByDistrito(
          distrito.id
        );
        return concelhos.map((c) => c.nome).sort((a, b) => a.localeCompare(b, 'pt-PT'));
      }

      return [];
    } catch (error) {
      console.warn("Erro ao buscar concelhos:", error);
      return [];
    }
  }

  /**
   * Busca códigos postais por concelho
   */
  async getCodigosByConcelho(nomeConcelho: string): Promise<string[]> {
    try {
      // Primeiro buscar o concelho para obter o código
      const { data } = await this.databaseService["supabase"].client
        .from("concelhos")
        .select("codigo")
        .eq("nome", nomeConcelho)
        .single();

      if (data) {
        const codigos = await this.databaseService.getCodigosByConcelho(
          data.codigo
        );
        return codigos.map((c) => c.codigo_postal_completo);
      }

      return [];
    } catch (error) {
      console.warn("Erro ao buscar códigos por concelho:", error);
      return [];
    }
  }

  /**
   * Obtém estatísticas da base de dados
   */
  async getDatabaseStats(): Promise<{
    total_distritos: number;
    total_concelhos: number;
    total_codigos_postais: number;
  }> {
    try {
      return await this.databaseService.getEstatisticas();
    } catch (error) {
      console.warn("Erro ao obter estatísticas:", error);
      return {
        total_distritos: 0,
        total_concelhos: 0,
        total_codigos_postais: 0,
      };
    }
  }

  /**
   * NOVO: Busca sugestões de códigos postais parciais
   */
  async getPostalCodeSuggestions(partial: string): Promise<string[]> {
    if (!partial || partial.length < 2) {
      return [];
    }
    try {
      const suggestions = await this.databaseService.searchPostalCodes(partial);
      return suggestions.map(s => s.codigo_postal_completo);
    } catch (error) {
      console.warn("Erro ao buscar sugestões de código postal:", error);
      return [];
    }
  }

  /**
   * NOVO: Busca sugestões de localidades parciais
   */
  async getLocalitySuggestions(partial: string): Promise<string[]> {
    if (!partial || partial.length < 2) {
      return [];
    }
    try {
      const suggestions = await this.databaseService.searchLocalities(partial);
      return suggestions.map(s => s.localidade);
    } catch (error) {
      console.warn("Erro ao buscar sugestões de localidade:", error);
      return [];
    }
  }

  /**
   * NOVO: Verifica se um código postal está completo (formato XXXX-XXX)
   */
  isPostalCodeComplete(postalCode: string): boolean {
    return /^\d{4}-\d{3}$/.test(postalCode);
  }

  /**
   * NOVO: Obtém informações de endereço pelo código postal
   */
  async getAddressInfoByPostalCode(postalCode: string): Promise<{ locality: string; district: string } | null> {
    const result = await this.databaseService.validateCodigoPostal(postalCode);
    if (result.valid && result.endereco) {
      return {
        locality: result.endereco.localidade,
        district: result.endereco.distrito,
      };
    }
    return null;
  }

  /**
   * NOVO: Obtém a lista de distritos a partir do signal no serviço de base de dados
   */
  get districts() {
    return this.databaseService.districts;
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
