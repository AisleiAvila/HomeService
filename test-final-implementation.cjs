/**
 * Teste final da implementação de validação de código postal português
 * Este teste simula as chamadas do Angular em ambiente de navegador
 */

// Simulação das funcionalidades necessárias do Angular
const MockHttpClient = {
  get(url) {
    console.log(`🌐 HTTP GET: ${url}`);

    // Simula diferentes cenários de resposta
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simula erro CORS (mais comum em produção)
        if (url.includes("https://www.codigo-postal.pt")) {
          reject({ status: 0, message: "CORS error" });
        }
        // Simula redirect HTTP para algumas URLs
        else if (url.includes("http://www.codigo-postal.pt")) {
          reject({ status: 301, message: "Moved permanently" });
        }
        // Simula proxy CORS indisponível
        else if (url.includes("cors-anywhere.herokuapp.com")) {
          reject({ status: 403, message: "Access denied" });
        }
        // Simula allorigins funcionando
        else if (url.includes("api.allorigins.win")) {
          resolve({
            contents: JSON.stringify([
              {
                localidade: "Lisboa",
                distrito: "Lisboa",
                concelho: "Lisboa",
                cp: "1000-001",
                cp4: "1000",
                cp3: "001",
              },
            ]),
          });
        }
        // Simula dados diretos para teste
        else {
          resolve([
            {
              localidade: "Lisboa",
              distrito: "Lisboa",
              concelho: "Lisboa",
              cp: "1000-001",
              cp4: "1000",
              cp3: "001",
            },
          ]);
        }
      }, Math.random() * 2000 + 500); // 500-2500ms delay
    });
  },
};

// Simulação das funcionalidades RxJS necessárias
const rxjsSimulation = {
  of: (value) => ({
    pipe: (...operators) => {
      let result = value;
      // Simula o processamento dos operators
      return {
        subscribe: (observer) => {
          if (typeof observer === "function") {
            observer(result);
          } else {
            observer.next && observer.next(result);
            observer.complete && observer.complete();
          }
        },
      };
    },
  }),

  from: (promise) => ({
    pipe: (...operators) => ({
      subscribe: (observer) => {
        promise
          .then((result) => {
            if (typeof observer === "function") {
              observer(result);
            } else {
              observer.next && observer.next(result);
              observer.complete && observer.complete();
            }
          })
          .catch((error) => {
            observer.error && observer.error(error);
          });
      },
    }),
  }),
};

// Implementação simplificada do serviço para teste
class TestPostalCodeService {
  constructor() {
    this.API_BASE_URL = "https://www.codigo-postal.pt/ws/v1/ptcp";
    this.ALTERNATIVE_API_URLS = [
      "https://www.codigo-postal.pt/ws/v1/ptcp",
      "http://www.codigo-postal.pt/ws/v1/ptcp",
      "https://codigo-postal.pt/ws/v1/ptcp",
      "http://codigo-postal.pt/ws/v1/ptcp",
    ];
    this.CORS_PROXY_URLS = [
      "https://api.allorigins.win/get?url=",
      "https://corsproxy.io/?",
      "https://cors-anywhere.herokuapp.com/",
    ];
    this.REQUEST_TIMEOUT = 8000;
    this.http = MockHttpClient;
  }

  normalizePostalCode(postalCode) {
    if (!postalCode) return null;

    const cleaned = postalCode.replace(/[^0-9-]/g, "");

    if (/^\d{4}-\d{3}$/.test(cleaned)) {
      return cleaned;
    }

    if (/^\d{7}$/.test(cleaned)) {
      return cleaned.substring(0, 4) + "-" + cleaned.substring(4);
    }

    return null;
  }

  async validatePostalCode(postalCode) {
    const normalizedCode = this.normalizePostalCode(postalCode);

    if (!normalizedCode) {
      return {
        isValid: false,
        error: "Formato de código postal inválido. Use XXXX-XXX",
      };
    }

    console.log("🔍 Iniciando validação para:", normalizedCode);

    try {
      // Tenta múltiplas URLs da API
      return await this.tryMultipleApiUrls(normalizedCode);
    } catch (error) {
      console.warn(
        "❌ Todas as APIs falharam, tentando proxies CORS...",
        error
      );

      try {
        return await this.tryWithCorsProxy(normalizedCode);
      } catch (proxyError) {
        console.warn(
          "❌ Proxies CORS também falharam, usando fallback offline...",
          proxyError
        );
        return this.getOfflineFallback(normalizedCode);
      }
    }
  }

  async tryMultipleApiUrls(normalizedCode) {
    const cp4 = normalizedCode.substring(0, 4);

    for (let i = 0; i < this.ALTERNATIVE_API_URLS.length; i++) {
      try {
        const baseUrl = this.ALTERNATIVE_API_URLS[i];
        const searchUrl = `${baseUrl}/search/${cp4}`;

        console.log(
          `🔄 Tentando API ${i + 1}/${
            this.ALTERNATIVE_API_URLS.length
          }: ${searchUrl}`
        );

        const response = await this.http.get(searchUrl);
        console.log(`✅ API ${i + 1} funcionou!`);

        return this.processApiResponse(response, normalizedCode);
      } catch (error) {
        console.warn(
          `❌ API ${i + 1} falhou:`,
          error.message || error.status || "Erro desconhecido"
        );
      }
    }

    throw new Error("Todas as URLs da API falharam");
  }

  async tryWithCorsProxy(normalizedCode) {
    const cp4 = normalizedCode.substring(0, 4);
    const originalUrl = `${this.API_BASE_URL}/search/${cp4}`;

    for (let i = 0; i < this.CORS_PROXY_URLS.length; i++) {
      try {
        const proxy = this.CORS_PROXY_URLS[i];
        const proxyUrl = proxy + encodeURIComponent(originalUrl);

        console.log(
          `🔄 Tentando proxy ${i + 1}/${this.CORS_PROXY_URLS.length}: ${proxy}`
        );

        const response = await this.http.get(proxyUrl);
        console.log(`✅ Proxy ${i + 1} funcionou!`);

        // Se for allorigins, desencapsula os dados
        const data = response.contents
          ? JSON.parse(response.contents)
          : response;
        return this.processApiResponse(data, normalizedCode);
      } catch (error) {
        console.warn(
          `❌ Proxy ${i + 1} falhou:`,
          error.message || error.status || "Erro desconhecido"
        );
      }
    }

    throw new Error("Todos os proxies CORS falharam");
  }

  processApiResponse(response, normalizedCode) {
    if (!Array.isArray(response) || response.length === 0) {
      return {
        isValid: false,
        error: "Código postal não encontrado na base de dados oficial",
      };
    }

    // Procura correspondência exata primeiro
    const exactMatch = response.find(
      (item) =>
        item.cp === normalizedCode ||
        `${item.cp4}-${item.cp3}` === normalizedCode
    );

    const result = exactMatch || response[0];

    return {
      isValid: true,
      postalCode: normalizedCode,
      locality: result.localidade || result.nome,
      district: result.distrito,
      municipality: result.concelho || result.municipio,
      street: result.rua || result.arteria,
    };
  }

  getOfflineFallback(postalCode) {
    console.log("🔄 Usando fallback offline para:", postalCode);

    // Base de dados offline básica
    const offlineDatabase = {
      1000: { locality: "Lisboa", district: "Lisboa", municipality: "Lisboa" },
      1100: { locality: "Lisboa", district: "Lisboa", municipality: "Lisboa" },
      1200: { locality: "Lisboa", district: "Lisboa", municipality: "Lisboa" },
      1300: { locality: "Lisboa", district: "Lisboa", municipality: "Lisboa" },
      4000: { locality: "Porto", district: "Porto", municipality: "Porto" },
      4100: { locality: "Porto", district: "Porto", municipality: "Porto" },
      4200: { locality: "Porto", district: "Porto", municipality: "Porto" },
      3000: {
        locality: "Coimbra",
        district: "Coimbra",
        municipality: "Coimbra",
      },
      3100: {
        locality: "Coimbra",
        district: "Coimbra",
        municipality: "Coimbra",
      },
      2000: {
        locality: "Santarém",
        district: "Santarém",
        municipality: "Santarém",
      },
      2100: {
        locality: "Santarém",
        district: "Santarém",
        municipality: "Santarém",
      },
      8000: { locality: "Faro", district: "Faro", municipality: "Faro" },
      8100: { locality: "Faro", district: "Faro", municipality: "Faro" },
      2970: {
        locality: "Sesimbra",
        district: "Setúbal",
        municipality: "Sesimbra",
      },
      2975: {
        locality: "Sesimbra",
        district: "Setúbal",
        municipality: "Sesimbra",
      },
    };

    const cp4 = postalCode.substring(0, 4);
    const areaInfo = offlineDatabase[cp4];

    if (areaInfo) {
      return {
        isValid: true,
        postalCode: postalCode,
        locality: areaInfo.locality,
        district: areaInfo.district,
        municipality: areaInfo.municipality,
        error: "Validação offline - API indisponível",
      };
    }

    // Se não encontrar na base offline, validar apenas formato
    const isValidFormat = /^\d{4}-\d{3}$/.test(postalCode);

    return {
      isValid: isValidFormat,
      postalCode: isValidFormat ? postalCode : undefined,
      error: isValidFormat
        ? "Formato válido mas localização desconhecida (API indisponível)"
        : "Formato inválido e API indisponível",
    };
  }
}

// Função de teste principal
async function runTests() {
  console.log(
    "🚀 Iniciando testes da validação de código postal português...\n"
  );

  const service = new TestPostalCodeService();

  const testCodes = [
    "1000-001", // Lisboa
    "4000-001", // Porto
    "3000-001", // Coimbra
    "2000-001", // Santarém
    "8000-001", // Faro
    "2970-001", // Sesimbra
    "9999-999", // Inexistente
    "1000001", // Formato sem hífen
    "XXXX-XXX", // Inválido
  ];

  for (const code of testCodes) {
    console.log(`\n📍 Testando: ${code}`);
    console.log("─".repeat(50));

    try {
      const result = await service.validatePostalCode(code);

      if (result.isValid) {
        console.log(`✅ Código válido: ${result.postalCode}`);
        if (result.locality)
          console.log(`   📍 Localidade: ${result.locality}`);
        if (result.district) console.log(`   🗺️ Distrito: ${result.district}`);
        if (result.municipality)
          console.log(`   🏛️ Concelho: ${result.municipality}`);
        if (result.error) console.log(`   ⚠️ Observação: ${result.error}`);
      } else {
        console.log(`❌ Código inválido: ${result.error}`);
      }
    } catch (error) {
      console.log(`💥 Erro durante validação: ${error.message}`);
    }

    // Pausa entre testes para visualizar melhor
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n🏁 Testes concluídos!");
  console.log("\n📋 Resumo da implementação:");
  console.log("✅ Múltiplas URLs da API (HTTPS/HTTP)");
  console.log("✅ Fallback para proxies CORS");
  console.log("✅ Base de dados offline para principais cidades");
  console.log("✅ Validação de formato robusto");
  console.log("✅ Tratamento de erros completo");
}

// Executa os testes
runTests().catch(console.error);
