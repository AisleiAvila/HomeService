const https = require("https");

console.log("🔍 Testando API portuguesa diretamente...\n");

// Teste direto da API
const testUrl = "https://www.codigo-postal.pt/ws/v1/ptcp/search/1000-001";

console.log("1. Testando API direta:");
console.log(`   URL: ${testUrl}`);

const request = https
  .get(testUrl, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Content-Type: ${res.headers["content-type"]}`);
    console.log(
      `   CORS Headers: ${
        res.headers["access-control-allow-origin"] || "Não definido"
      }`
    );

    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`   ✅ API responde com JSON válido!`);
        console.log(`   📊 Número de resultados: ${parsed.length}`);
        if (parsed.length > 0) {
          console.log(
            `   📍 Primeira localidade: ${
              parsed[0].localidade || parsed[0].nome
            }`
          );
          console.log(`   🗺️ Distrito: ${parsed[0].distrito}`);
          console.log(`   🏛️ Concelho: ${parsed[0].concelho}`);
          console.log(`   📝 Dados completos do primeiro resultado:`);
          console.log(JSON.stringify(parsed[0], null, 2));
        }
      } catch (e) {
        console.log(`   ❌ Erro ao parsear JSON: ${e.message}`);
        console.log(`   📝 Resposta recebida: ${data.substring(0, 500)}...`);
      }
    });
  })
  .on("error", (err) => {
    console.log(`   ❌ Erro de conexão: ${err.message}`);
  });

request.setTimeout(10000, () => {
  console.log(`   ⏱️ Timeout após 10s`);
  request.destroy();
});

// Teste de diferentes códigos postais
setTimeout(() => {
  console.log("\n2. Testando códigos postais diversos:");

  const testCodes = [
    "1000-001",
    "4000-001",
    "3000-001",
    "2000-001",
    "8000-001",
  ];

  testCodes.forEach((code, index) => {
    setTimeout(() => {
      const url = `https://www.codigo-postal.pt/ws/v1/ptcp/search/${code}`;
      console.log(`   ${index + 1}. Testando: ${code}`);

      https
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.length > 0) {
                console.log(
                  `      ✅ ${code}: ${parsed[0].localidade}, ${parsed[0].distrito}`
                );
              } else {
                console.log(`      ❌ ${code}: Nenhum resultado`);
              }
            } catch (e) {
              console.log(`      ❌ ${code}: Erro JSON`);
            }
          });
        })
        .on("error", (err) => {
          console.log(`      ❌ ${code}: ${err.message}`);
        })
        .setTimeout(5000, function () {
          console.log(`      ⏱️ ${code}: Timeout`);
          this.destroy();
        });
    }, index * 1000);
  });
}, 3000);
