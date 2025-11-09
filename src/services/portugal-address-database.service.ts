import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import {
  Distrito,
  Concelho,
  CodigoPostal,
  EnderecoCompleto,
  ValidationResultDatabase,
} from "../interfaces/portugal-address.interface";
import { signal } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class PortugalAddressDatabaseService {
  private readonly supabase = inject(SupabaseService);

  districts = signal<Distrito[]>([]);

  constructor() {
    this.getDistritos().then((d) => this.districts.set(d));
  }

  /**
   * Busca todos os distritos
   */
  async getDistritos(): Promise<Distrito[]> {
    const { data, error } = await this.supabase.client
      .from("distritos")
      .select("*")
      .order("nome");

    if (error) {
      console.error("Erro ao buscar distritos:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Busca distrito por código
   */
  async getDistritoByCodigo(codigo: string): Promise<Distrito | null> {
    const { data, error } = await this.supabase.client
      .from("distritos")
      .select("*")
      .eq("codigo", codigo)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // No rows found
      console.error("Erro ao buscar distrito:", error);
      throw error;
    }

    return data;
  }

  /**
   * Busca concelhos por distrito
   */
  async getConcelhosByDistrito(distritoId: number): Promise<Concelho[]> {
    const { data, error } = await this.supabase.client
      .from("concelhos")
      .select("*")
      .eq("distrito_id", distritoId)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar concelhos:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Busca concelho por código
   */
  async getConcelhoByCodigo(codigo: string): Promise<Concelho | null> {
    const { data, error } = await this.supabase.client
      .from("concelhos")
      .select("*")
      .eq("codigo", codigo)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // No rows found
      console.error("Erro ao buscar concelho:", error);
      throw error;
    }

    return data;
  }

  /**
   * Valida e busca informações de um código postal
   */
  async validateCodigoPostal(
    codigoPostal: string
  ): Promise<ValidationResultDatabase> {
    console.log(
      "🔍 [DATABASE] Iniciando validateCodigoPostal para:",
      codigoPostal
    );

    try {
      // Normalizar código postal (remover espaços, formatar)
      const normalizado = this.normalizeCodigoPostal(codigoPostal);
      console.log("✏️ [DATABASE] Código normalizado:", normalizado);

      if (!normalizado) {
        console.warn("⚠️ [DATABASE] Formato inválido após normalização");
        return {
          valid: false,
          error: "Formato de código postal inválido",
        };
      }

      // TESTE: Primeiro verificar se a tabela existe e tem dados
      console.log("🔍 [DATABASE] Testando conectividade com Supabase...");
      const { count, error: countError } = await this.supabase.client
        .from("codigos_postais")
        .select("*", { count: "exact", head: true });

      console.log("📊 [DATABASE] Total de registros na tabela:", count);
      console.log("📊 [DATABASE] Erro de contagem:", countError);

      // Buscar o código postal na base de dados
      console.log("🔍 [DATABASE] Buscando endereço na base de dados...");
      const endereco = await this.getEnderecoByCodigoPostal(normalizado);
      console.log("📊 [DATABASE] Resultado da busca:", endereco);

      if (endereco) {
        console.log("✅ [DATABASE] Endereço encontrado com sucesso");
        return {
          valid: true,
          endereco,
        };
      } else {
        console.warn(
          "❌ [DATABASE] Código postal não encontrado na base de dados"
        );
        return {
          valid: false,
          error: "Código postal não encontrado",
        };
      }
    } catch (error) {
      console.error("❌ [DATABASE] Erro na validação:", error);
      return {
        valid: false,
        error: "Erro interno na validação",
      };
    }
  }

  /**
   * Busca endereço completo por código postal
   */
  async getEnderecoByCodigoPostal(
    codigoPostal: string
  ): Promise<EnderecoCompleto | null> {
    console.log(
      "🔍 [DATABASE] Iniciando getEnderecoByCodigoPostal para:",
      codigoPostal
    );

    const normalizado = this.normalizeCodigoPostal(codigoPostal);
    console.log("✏️ [DATABASE] Código normalizado para busca:", normalizado);

    if (!normalizado) {
      console.warn("⚠️ [DATABASE] Código normalizado é null, retornando null");
      return null;
    }

    console.log("💾 [DATABASE] Executando query no Supabase...");

    // TESTE: Buscar apenas o código postal sem JOINs para debug
    const { data, error } = await this.supabase.client
      .from("codigos_postais")
      .select("*")
      .eq("codigo_postal_completo", normalizado)
      .limit(1)
      .single();

    console.log("📊 [DATABASE] Resposta do Supabase - data:", data);
    console.log("📊 [DATABASE] Resposta do Supabase - error:", error);

    if (error) {
      if (error.code === "PGRST116") {
        console.warn("❌ [DATABASE] Nenhum registro encontrado (PGRST116)");
        return null; // No rows found
      }
      console.error("❌ [DATABASE] Erro ao buscar endereço:", error);
      throw error;
    }

    if (!data) {
      console.warn("⚠️ [DATABASE] Data é null, retornando null");
      return null;
    }

    console.log(
      "🔧 [DATABASE] Construindo endereço completo a partir dos dados..."
    );

    // Buscar informações de distrito e concelho separadamente
    console.log("🔍 [DATABASE] Buscando distrito:", data.cod_distrito);
    const { data: distritoData } = await this.supabase.client
      .from("distritos")
      .select("nome_distrito")
      .eq("cod_distrito", data.cod_distrito)
      .single();

    console.log(
      "🔍 [DATABASE] Buscando concelho:",
      data.cod_distrito,
      data.cod_concelho
    );
    const { data: concelhoData } = await this.supabase.client
      .from("concelhos")
      .select("nome_concelho")
      .eq("cod_distrito", data.cod_distrito)
      .eq("cod_concelho", data.cod_concelho)
      .single();

    console.log("📊 [DATABASE] Distrito encontrado:", distritoData);
    console.log("📊 [DATABASE] Concelho encontrado:", concelhoData);

    // Construir endereço completo
    const endereco: EnderecoCompleto = {
      codigo_postal: data.codigo_postal_completo,
      localidade: data.nome_localidade,
      concelho: concelhoData?.nome_concelho || "Desconhecido",
      distrito: distritoData?.nome_distrito || "Desconhecido",
      designacao_postal: data.desig_postal,
    };

    console.log("🏗️ [DATABASE] Endereço base construído:", endereco);

    // Adicionar arteria se disponível
    if (data.nome_arteria) {
      let arteria = "";

      if (data.tipo_arteria) arteria += data.tipo_arteria + " ";
      if (data.prep1) arteria += data.prep1 + " ";
      if (data.titulo_arteria) arteria += data.titulo_arteria + " ";
      if (data.nome_arteria) arteria += data.nome_arteria;
      if (data.local_arteria) arteria += " (" + data.local_arteria + ")";

      endereco.arteria = arteria.trim();
      console.log("🛣️ [DATABASE] Arteria adicionada:", endereco.arteria);
    }

    console.log(
      "✅ [DATABASE] Endereço completo construído com sucesso:",
      endereco
    );
    return endereco;
  }

  /**
   * Busca sugestões de códigos postais por localidade
   */
  async getCodigosByLocalidade(
    localidade: string,
    limit: number = 10
  ): Promise<CodigoPostal[]> {
    const { data, error } = await this.supabase.client
      .from("codigos_postais")
      .select("*")
      .ilike("nome_localidade", `%${localidade}%`)
      .order("nome_localidade")
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar códigos por localidade:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Busca códigos postais por concelho
   */
  async getCodigosByConcelho(
    codigoConcelho: string,
    limit: number = 50
  ): Promise<CodigoPostal[]> {
    const { data, error } = await this.supabase.client
      .from("codigos_postais")
      .select("*")
      .eq("cod_concelho", codigoConcelho)
      .order("codigo_postal_completo")
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar códigos por concelho:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Estatísticas das tabelas
   */
  async getEstatisticas(): Promise<{
    total_distritos: number;
    total_concelhos: number;
    total_codigos_postais: number;
  }> {
    try {
      const [distritosResult, concelhosResult, codigosResult] =
        await Promise.all([
          this.supabase.client
            .from("distritos")
            .select("*", { count: "exact", head: true }),
          this.supabase.client
            .from("concelhos")
            .select("*", { count: "exact", head: true }),
          this.supabase.client
            .from("codigos_postais")
            .select("*", { count: "exact", head: true }),
        ]);

      return {
        total_distritos: distritosResult.count || 0,
        total_concelhos: concelhosResult.count || 0,
        total_codigos_postais: codigosResult.count || 0,
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return {
        total_distritos: 0,
        total_concelhos: 0,
        total_codigos_postais: 0,
      };
    }
  }

  /**
   * Normaliza código postal para o formato correto
   */
  private normalizeCodigoPostal(codigo: string): string | null {
    if (!codigo) return null;

    // Remover todos os caracteres não numéricos exceto hífen
    let limpo = codigo.replace(/[^0-9-]/g, "");

    // Se não tem hífen, adicionar na posição correta (XXXX-XXX)
    if (limpo.length === 7 && !limpo.includes("-")) {
      limpo = limpo.substring(0, 4) + "-" + limpo.substring(4);
    }

    // Verificar formato final
    if (!/^\d{4}-\d{3}$/.test(limpo)) {
      return null;
    }

    return limpo;
  }

  /**
   * NOVO: Busca sugestões de códigos postais por texto parcial
   */
  async searchPostalCodes(
    searchText: string,
    limit: number = 10
  ): Promise<CodigoPostal[]> {
    const { data, error } = await this.supabase.client
      .from("codigos_postais")
      .select("*")
      .like("codigo_postal_completo", `${searchText}%`)
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar sugestões de código postal:", error);
      throw error;
    }
    return data || [];
  }

  /**
   * NOVO: Busca sugestões de localidades por texto parcial
   */
  async searchLocalities(
    searchText: string,
    limit: number = 10
  ): Promise<{ localidade: string }[]> {
    const { data, error } = await this.supabase.client
      .from("codigos_postais")
      .select("nome_localidade")
      .like("nome_localidade", `${searchText}%`)
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar sugestões de localidade:", error);
      throw error;
    }

    // O Supabase pode retornar duplicados, então precisamos filtrar
    if (data) {
      const uniqueLocalities = [
        ...new Set(data.map((item) => item.nome_localidade)),
      ];
      return uniqueLocalities.map((localidade) => ({ localidade }));
    }

    return [];
  }
}
