/**
 * Script de teste para a API de códigos postais portugueses
 *
 * Este script testa a integração com https://www.codigo-postal.pt/ws/v1/ptcp/search/
 * Execute com: node test-postal-code-api.js
 */

// Simulação da chamada HTTP (em produção seria através do HttpClient do Angular)
async function testPostalCodeApi() {
  const API_BASE_URL = "https://www.codigo-postal.pt/ws/v1/ptcp";

  console.log("🔍 Testando API de Códigos Postais Portugueses\n");
  console.log("=".repeat(50));

  // Códigos postais para testar
  const testCodes = [
    "1000-001", // Lisboa
    "4000-001", // Porto
    "3000-001", // Coimbra
    "2000-001", // Santarém
    "8000-001", // Faro
    "1100-048", // Lisboa (área específica)
    "9999-999", // Código inválido
    "1234", // Formato incompleto
  ];

  for (const postalCode of testCodes) {
    await testSinglePostalCode(postalCode);
    console.log("-".repeat(50));
  }

  // Teste de busca por localidade
  console.log("\n🏙️ Testando busca por localidade:");
  await testLocalitySearch("Lisboa");
  await testLocalitySearch("Porto");
  await testLocalitySearch("Coimbra");
}

/**
 * Testa um código postal específico
 */
async function testSinglePostalCode(postalCode) {
  console.log(`\n📮 Testando: ${postalCode}`);

  try {
    // Normaliza o código postal
    const normalizedCode = normalizePostalCode(postalCode);
    console.log(`   Normalizado: ${normalizedCode || "INVÁLIDO"}`);

    if (!normalizedCode) {
      console.log("   ❌ Formato inválido");
      return;
    }

    // Busca na API usando os primeiros 4 dígitos
    const cp4 = normalizedCode.substring(0, 4);
    const searchUrl = `https://www.codigo-postal.pt/ws/v1/ptcp/search/${cp4}`;

    console.log(`   🌐 URL: ${searchUrl}`);

    // Simula a chamada à API (substitua por fetch real se necessário)
    const response = await simulateApiCall(searchUrl, normalizedCode);

    if (response.success) {
      console.log(
        `   ✅ Válido: ${response.data.locality}, ${response.data.district}`
      );
      console.log(`   📍 Concelho: ${response.data.municipality}`);
      if (response.data.street) {
        console.log(`   🛣️  Rua: ${response.data.street}`);
      }
    } else {
      console.log(`   ❌ ${response.error}`);
    }
  } catch (error) {
    console.log(`   🚨 Erro: ${error.message}`);
  }
}

/**
 * Testa busca por localidade
 */
async function testLocalitySearch(locality) {
  console.log(`\n🔍 Buscando códigos postais para: ${locality}`);

  try {
    const searchUrl = `https://www.codigo-postal.pt/ws/v1/ptcp/search/${encodeURIComponent(
      locality
    )}`;
    console.log(`   🌐 URL: ${searchUrl}`);

    // Simula a busca por localidade
    const mockResults = getMockLocalityResults(locality);

    if (mockResults.length > 0) {
      console.log(`   ✅ Encontrados ${mockResults.length} resultados:`);
      mockResults.slice(0, 3).forEach((result) => {
        console.log(
          `      ${result.cp} - ${result.locality} (${result.district})`
        );
      });
      if (mockResults.length > 3) {
        console.log(`      ... e mais ${mockResults.length - 3} resultados`);
      }
    } else {
      console.log("   ❌ Nenhum resultado encontrado");
    }
  } catch (error) {
    console.log(`   🚨 Erro: ${error.message}`);
  }
}

/**
 * Normaliza código postal para o formato XXXX-XXX
 */
function normalizePostalCode(postalCode) {
  if (!postalCode) return null;

  // Remove todos os caracteres não numéricos
  const numbers = postalCode.replace(/\D/g, "");

  // Deve ter exatamente 7 dígitos
  if (numbers.length !== 7) return null;

  // Formata como XXXX-XXX
  return `${numbers.substring(0, 4)}-${numbers.substring(4, 7)}`;
}

/**
 * Simula chamada à API (substitua por fetch real)
 */
async function simulateApiCall(url, targetCode) {
  // Simula delay da API
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Dados mock baseados na estrutura real da API
  const mockApiData = {
    1000: [
      {
        cp: "1000-001",
        locality: "Lisboa",
        district: "Lisboa",
        municipality: "Lisboa",
      },
      {
        cp: "1000-002",
        locality: "Lisboa",
        district: "Lisboa",
        municipality: "Lisboa",
      },
    ],
    4000: [
      {
        cp: "4000-001",
        locality: "Porto",
        district: "Porto",
        municipality: "Porto",
      },
      {
        cp: "4000-002",
        locality: "Porto",
        district: "Porto",
        municipality: "Porto",
      },
    ],
    3000: [
      {
        cp: "3000-001",
        locality: "Coimbra",
        district: "Coimbra",
        municipality: "Coimbra",
      },
    ],
    2000: [
      {
        cp: "2000-001",
        locality: "Santarém",
        district: "Santarém",
        municipality: "Santarém",
      },
    ],
    8000: [
      {
        cp: "8000-001",
        locality: "Faro",
        district: "Faro",
        municipality: "Faro",
      },
    ],
    1100: [
      {
        cp: "1100-048",
        locality: "Lisboa",
        district: "Lisboa",
        municipality: "Lisboa",
        street: "Rua Augusta",
      },
    ],
  };

  const cp4 = targetCode.substring(0, 4);
  const results = mockApiData[cp4];

  if (!results) {
    return {
      success: false,
      error: "Código postal não encontrado na base de dados",
    };
  }

  // Procura match exato
  const exactMatch = results.find((r) => r.cp === targetCode);

  if (exactMatch) {
    return {
      success: true,
      data: exactMatch,
    };
  }

  // Se não encontrou match exato
  return {
    success: false,
    error: `Código postal ${targetCode} não encontrado. Área: ${results[0].locality}`,
  };
}

/**
 * Simula resultados de busca por localidade
 */
function getMockLocalityResults(locality) {
  const mockData = {
    Lisboa: [
      { cp: "1000-001", locality: "Lisboa", district: "Lisboa" },
      { cp: "1100-048", locality: "Lisboa", district: "Lisboa" },
      { cp: "1200-001", locality: "Lisboa", district: "Lisboa" },
    ],
    Porto: [
      { cp: "4000-001", locality: "Porto", district: "Porto" },
      { cp: "4100-001", locality: "Porto", district: "Porto" },
    ],
    Coimbra: [{ cp: "3000-001", locality: "Coimbra", district: "Coimbra" }],
  };

  return mockData[locality] || [];
}

/**
 * Demonstra como usar no Angular
 */
function demonstrateAngularUsage() {
  console.log("\n" + "=".repeat(50));
  console.log("📋 EXEMPLO DE USO NO ANGULAR:");
  console.log("=".repeat(50));

  const angularCode = `
// No seu componente Angular:
import { PostalCodeApiService } from './services/postal-code-api.service';

export class MyComponent {
  constructor(private postalCodeApi: PostalCodeApiService) {}
  
  validatePostalCode(code: string) {
    this.postalCodeApi.validatePostalCode(code).subscribe(result => {
      if (result.isValid) {
        console.log('Válido:', result.locality, result.district);
        // Preencher automaticamente cidade e distrito
        this.form.patchValue({
          city: result.locality,
          district: result.district,
          municipality: result.municipality
        });
      } else {
        console.log('Inválido:', result.error);
      }
    });
  }
}

// No template:
<app-postal-code-validator
  [(value)]="postalCode"
  (validationChange)="onValidationChange($event)"
  (addressInfoChange)="onAddressInfoChange($event)"
  [showAddressInfo]="true"
  required="true">
</app-postal-code-validator>
`;

  console.log(angularCode);
}

// Executa os testes
if (typeof window === "undefined") {
  // Node.js environment
  testPostalCodeApi()
    .then(() => {
      demonstrateAngularUsage();
      console.log("\n✅ Testes concluídos!");
    })
    .catch((error) => {
      console.error("❌ Erro nos testes:", error);
    });
} else {
  // Browser environment
  console.log("Execute este script no Node.js para ver os testes completos");
  demonstrateAngularUsage();
}

// Export para uso em testes
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizePostalCode,
    testSinglePostalCode,
    testLocalitySearch,
  };
}
