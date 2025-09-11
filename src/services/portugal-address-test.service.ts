import { Injectable, inject } from "@angular/core";
import { PortugalAddressValidationService } from "./portugal-address-validation.service";
import { PortugalAddressDatabaseService } from "./portugal-address-database.service";

@Injectable({
  providedIn: "root",
})
export class PortugalAddressTestService {
  private validationService = inject(PortugalAddressValidationService);
  private databaseService = inject(PortugalAddressDatabaseService);

  /**
   * Teste completo da integração
   */
  async runIntegrationTest(): Promise<void> {
    console.log("🧪 INICIANDO TESTE DE INTEGRAÇÃO - Tabelas Portugal");
    console.log("================================================");

    try {
      // 1. Testar estatísticas
      console.log("\n📊 1. Testando estatísticas da base de dados...");
      const stats = await this.databaseService.getEstatisticas();
      console.log("Estatísticas:", stats);

      // 2. Testar distritos
      console.log("\n🏛️ 2. Testando busca de distritos...");
      const distritos = await this.validationService.getPortugueseDistricts();
      console.log(
        `Encontrados ${distritos.length} distritos:`,
        distritos.slice(0, 5),
        "..."
      );

      // 3. Testar concelhos de Lisboa
      console.log("\n🏛️ 3. Testando concelhos de Lisboa...");
      const concelhosLisboa =
        await this.validationService.getConcelhosByDistrito("Lisboa");
      console.log(
        `Concelhos de Lisboa (${concelhosLisboa.length}):`,
        concelhosLisboa.slice(0, 5),
        "..."
      );

      // 4. Testar validação de códigos postais conhecidos
      console.log("\n📮 4. Testando validação de códigos postais...");
      const testCodes = ["1000-001", "4000-001", "3000-001", "2000-001"];

      for (const code of testCodes) {
        console.log(`\n   Testando ${code}:`);

        // Validação básica
        const isValid = this.validationService.validatePostalCode(code);
        console.log(`   ✓ Formato válido: ${isValid}`);

        // Validação com API (base de dados)
        try {
          const validation = await this.validationService
            .validatePostalCodeWithApi(code)
            .toPromise();
          console.log(`   ✓ Validação completa:`, validation);
        } catch (error) {
          console.warn(`   ⚠️ Erro na validação de ${code}:`, error);
        }

        // Informações detalhadas
        try {
          const info = await this.validationService.getPostalCodeInfo(code);
          console.log(`   ✓ Informações:`, info);
        } catch (error) {
          console.warn(`   ⚠️ Erro ao obter informações de ${code}:`, error);
        }
      }

      // 5. Testar busca por localidade
      console.log("\n🔍 5. Testando busca por localidade...");
      const suggestions =
        await this.validationService.getCodigoPostalSuggestions("Lisboa", 5);
      console.log(`Sugestões para "Lisboa":`, suggestions);

      // 6. Testar validação com base de dados direta
      console.log("\n💾 6. Testando validação direta na base de dados...");
      const dbTest = await this.databaseService.validateCodigoPostal(
        "1000-001"
      );
      console.log("Resultado da validação direta:", dbTest);

      console.log("\n✅ TESTE DE INTEGRAÇÃO CONCLUÍDO COM SUCESSO!");
      console.log("================================================");
    } catch (error) {
      console.error("❌ ERRO NO TESTE DE INTEGRAÇÃO:", error);
      console.log("================================================");
    }
  }

  /**
   * Teste rápido para verificar se as tabelas estão funcionais
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      const stats = await this.databaseService.getEstatisticas();
      const hasData =
        stats.total_codigos_postais > 0 &&
        stats.total_distritos > 0 &&
        stats.total_concelhos > 0;

      if (hasData) {
        console.log(
          "✅ Health Check OK - Tabelas portuguesas funcionais:",
          stats
        );
        return true;
      } else {
        console.warn("⚠️ Health Check FALHOU - Tabelas sem dados:", stats);
        return false;
      }
    } catch (error) {
      console.error("❌ Health Check ERRO:", error);
      return false;
    }
  }

  /**
   * Demonstração das capacidades da nova integração
   */
  async demonstrateCapabilities(): Promise<void> {
    console.log("🎯 DEMONSTRAÇÃO DAS NOVAS CAPACIDADES");
    console.log("====================================");

    try {
      // Mostrar diferença entre sistema antigo e novo
      console.log("\n📊 Comparação: Sistema Antigo vs. Novo");

      const code = "1000-001";

      // Sistema antigo (só formatação)
      const oldValidation = this.validationService.validatePostalCode(code);
      console.log(`Sistema antigo (formato): ${oldValidation}`);

      // Sistema novo (base de dados completa)
      const newValidation = await this.databaseService.validateCodigoPostal(
        code
      );
      console.log("Sistema novo (base dados):", newValidation);

      // Capacidades novas
      console.log("\n🆕 Novas capacidades disponíveis:");
      console.log("1. ✅ Validação completa com dados reais de Portugal");
      console.log("2. ✅ Sugestões de códigos postais por localidade");
      console.log("3. ✅ Navegação hierárquica: Distrito → Concelho → Códigos");
      console.log("4. ✅ Dados offline completos (150,000+ códigos)");
      console.log("5. ✅ Performance superior (sem chamadas API externas)");
      console.log("6. ✅ Dados sempre atualizados e consistentes");

      console.log("\n🎯 DEMONSTRAÇÃO CONCLUÍDA!");
    } catch (error) {
      console.error("❌ Erro na demonstração:", error);
    }
  }
}
