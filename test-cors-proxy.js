const https = require("https");

// Testar CORS proxy
const corsProxies = [
  "https://api.allorigins.win/get?url=",
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/",
];

const testUrl = "https://www.codigo-postal.pt/ws/v1/ptcp/search/1000-001";

console.log("🔍 Testando CORS proxies para API portuguesa...\n");

let completedTests = 0;
const totalTests = corsProxies.length;

corsProxies.forEach((proxy, index) => {
  const proxyUrl = proxy + encodeURIComponent(testUrl);
  console.log(`${index + 1}. Testando: ${proxy}`);
  console.log(`   URL completa: ${proxyUrl}`);

  const request = https
    .get(proxyUrl, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(
        `   Headers CORS: ${
          res.headers["access-control-allow-origin"] || "Não encontrado"
        }`
      );

      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        completedTests++;

        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log(`   Tamanho da resposta: ${data.length} chars`);

            // Verificar se é o formato esperado do allorigins
            if (parsed.contents) {
              console.log(`   ✅ AllOrigins proxy - dados encapsulados!`);
              try {
                const innerData = JSON.parse(parsed.contents);
                if (Array.isArray(innerData) && innerData.length > 0) {
                  console.log(`   ✅ Dados da API portuguesa encontrados!`);
                  console.log(
                    `   📍 Primeira localidade: ${
                      innerData[0].nome || innerData[0].localidade
                    }`
                  );
                }
              } catch (e) {
                console.log(`   ⚠️ Dados encapsulados mas formato inesperado`);
              }
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`   ✅ Proxy direto - dados da API!`);
              console.log(
                `   📍 Primeira localidade: ${
                  parsed[0].nome || parsed[0].localidade
                }`
              );
            } else {
              console.log(`   ⚠️ Resposta válida mas formato inesperado`);
              console.log(
                `   📝 Preview: ${JSON.stringify(parsed).substring(0, 200)}...`
              );
            }
          } catch (e) {
            console.log(`   ❌ Erro ao parsear JSON: ${e.message}`);
            console.log(
              `   📝 Preview da resposta: ${data.substring(0, 200)}...`
            );
          }
        } else {
          console.log(`   ❌ Erro HTTP ${res.statusCode}`);
          if (data) {
            console.log(`   📝 Erro: ${data.substring(0, 200)}...`);
          }
        }
        console.log("");

        if (completedTests === totalTests) {
          console.log("🏁 Teste de proxies CORS concluído!");
        }
      });
    })
    .on("error", (err) => {
      completedTests++;
      console.log(`   ❌ Erro de conexão: ${err.message}`);
      console.log("");

      if (completedTests === totalTests) {
        console.log("🏁 Teste de proxies CORS concluído!");
      }
    });

  request.setTimeout(10000, () => {
    completedTests++;
    console.log(`   ⏱️ Timeout após 10s`);
    console.log("");
    request.destroy();

    if (completedTests === totalTests) {
      console.log("🏁 Teste de proxies CORS concluído!");
    }
  });
});
