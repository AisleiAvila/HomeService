// Teste das traduções para formulário de solicitação de serviço
// Este arquivo será removido após confirmar que as traduções funcionam

import { I18nService } from "./i18n.service";

// Teste simples sem Angular
const translations = {
  en: {
    newServiceRequest: "New Service Request",
    requestedDateTime: "Requested Date & Time",
    titlePlaceholder: "Enter service title...",
  },
  pt: {
    newServiceRequest: "Nova Solicitação de Serviço",
    requestedDateTime: "Data e Hora Solicitada",
    titlePlaceholder: "Digite o título do serviço...",
  },
};

console.log("=== TESTE SIMPLES DE TRADUÇÕES ===");

function testTranslate(key: string, lang: "en" | "pt") {
  return translations[lang][key] || key;
}

// Teste manual
console.log(
  "Manual EN - newServiceRequest:",
  testTranslate("newServiceRequest", "en")
);
console.log(
  "Manual PT - newServiceRequest:",
  testTranslate("newServiceRequest", "pt")
);
console.log(
  "Manual EN - requestedDateTime:",
  testTranslate("requestedDateTime", "en")
);
console.log(
  "Manual PT - requestedDateTime:",
  testTranslate("requestedDateTime", "pt")
);

console.log("=== FIM DO TESTE ===");
