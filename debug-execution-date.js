// Script de debug para verificar o sistema de aprovação de data de execução
console.log("=== DEBUG: Sistema de Aprovação de Data de Execução ===");

// Simular dados de teste
const testServiceRequest = {
  id: 1,
  status: "Data proposta pelo administrador",
  proposed_execution_date: new Date().toISOString(),
  proposed_execution_notes: "Teste de proposta de data",
  execution_date_proposed_at: new Date().toISOString(),
  client_id: "client-123",
  professional_id: "prof-456",
};

console.log("1. Request de teste:", testServiceRequest);

// Testar condições dos botões
const shouldShowApprovalButtons =
  testServiceRequest.status === "Data proposta pelo administrador" ||
  testServiceRequest.status === "Aguardando aprovação da data";

console.log("2. Deve mostrar botões de aprovação?", shouldShowApprovalButtons);

// Testar possíveis status válidos
const validStatuses = [
  "Data proposta pelo administrador",
  "Aguardando aprovação da data",
  "Data aprovada pelo cliente",
  "Data rejeitada pelo cliente",
  "Nova data solicitada pelo cliente",
];

console.log("3. Status válidos para aprovação de data:", validStatuses);

// Verificar se o status está correto
console.log("4. Status atual:", testServiceRequest.status);
console.log(
  "5. Status é válido?",
  validStatuses.includes(testServiceRequest.status)
);

// Simulação de estrutura de dados esperada pelo componente
const componentData = {
  serviceRequests: [testServiceRequest],
  currentUser: { id: "client-123", role: "client" },
  showButtons: shouldShowApprovalButtons,
};

console.log("6. Dados do componente:", componentData);

// Teste de template conditions
console.log("\n=== TESTE DE CONDIÇÕES DO TEMPLATE ===");
console.log(
  "Condição @if:",
  `request.status === 'Data proposta pelo administrador' || request.status === 'Aguardando aprovação da data'`
);
console.log("Resultado:", shouldShowApprovalButtons);

// Verificar se existem problemas de case sensitivity
const statusesToCheck = [
  "Data proposta pelo administrador",
  "data proposta pelo administrador",
  "Data Proposta Pelo Administrador",
];

statusesToCheck.forEach((status) => {
  console.log(
    `Status "${status}" === "Data proposta pelo administrador"?`,
    status === "Data proposta pelo administrador"
  );
});

console.log("\n=== CHECKLIST DE DEBUG ===");
console.log("☐ 1. Verificar se o request tem o status correto");
console.log(
  "☐ 2. Verificar se o componente service-list está recebendo os dados"
);
console.log("☐ 3. Verificar se as condições @if estão corretas");
console.log("☐ 4. Verificar se as traduções i18n estão funcionando");
console.log("☐ 5. Verificar se os outputs estão conectados no template pai");
console.log("☐ 6. Verificar se não há erros no console do browser");

console.log("\nPróximos passos para debug:");
console.log("1. Abrir Developer Tools no browser");
console.log(
  '2. Verificar se há requests com status "Data proposta pelo administrador"'
);
console.log("3. Verificar se o template está renderizando os botões");
console.log("4. Testar os outputs dos botões");
