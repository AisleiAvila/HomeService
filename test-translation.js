// Teste simples de tradução
console.log("Testando tradução diretamente...");

// Simular o objeto de traduções
const allTranslations = {
  en: {
    landingDescription: "Professional home services.",
    testKey: "Test works",
  },
  pt: {
    landingDescription: "Serviços domésticos profissionais.",
    testKey: "Teste funciona",
  },
};

function testTranslate(key, lang) {
  console.log(`\n=== Testing ${key} in ${lang} ===`);
  console.log("allTranslations object:", typeof allTranslations);
  console.log("Language object exists:", !!allTranslations[lang]);
  console.log("Key exists:", key in allTranslations[lang]);
  console.log("Direct access:", allTranslations[lang][key]);
  console.log("Result:", allTranslations[lang][key] || key);
}

// Testar ambas as linguagens
testTranslate("landingDescription", "en");
testTranslate("landingDescription", "pt");
testTranslate("testKey", "en");
testTranslate("testKey", "pt");

// Verificar estrutura do objeto
console.log("\n=== Object Structure ===");
console.log("EN keys:", Object.keys(allTranslations.en));
console.log("PT keys:", Object.keys(allTranslations.pt));
console.log(
  "Keys with 'landing':",
  Object.keys(allTranslations.en).filter((k) => k.includes("landing"))
);
