/**
 * Teste para verificar se as solicitações agendadas estão sendo exibidas corretamente
 * na agenda para clientes, profissionais e administradores
 */

console.log("🔍 Iniciando teste da funcionalidade de agenda...");

// Simular dados de solicitações agendadas
const mockServiceRequests = [
  {
    id: 1,
    client_id: 1,
    professional_id: 2,
    title: "Reparo hidráulico",
    status: "Agendado",
    scheduled_date: "2025-09-22T14:00:00.000Z",
    client_auth_id: "test-client-1",
    professional_auth_id: "test-professional-1",
  },
  {
    id: 2,
    client_id: 1,
    professional_id: null,
    title: "Pintura de parede",
    status: "Orçamento aprovado",
    scheduled_date: "2025-09-23T09:00:00.000Z",
    client_auth_id: "test-client-1",
    professional_auth_id: null,
  },
  {
    id: 3,
    client_id: 3,
    professional_id: 2,
    title: "Instalação elétrica",
    status: "Agendado",
    scheduled_date: "2025-09-24T16:00:00.000Z",
    client_auth_id: "test-client-2",
    professional_auth_id: "test-professional-1",
  },
  {
    id: 4,
    client_id: 4,
    professional_id: 2,
    title: "Limpeza geral",
    status: "Em execução",
    scheduled_date: "2025-09-21T10:00:00.000Z",
    client_auth_id: "test-client-3",
    professional_auth_id: "test-professional-1",
  },
];

const mockUsers = [
  {
    id: 1,
    auth_id: "test-client-1",
    name: "João Silva",
    role: "client",
  },
  {
    id: 2,
    auth_id: "test-professional-1",
    name: "Maria Santos",
    role: "professional",
  },
  {
    id: 3,
    auth_id: "test-admin-1",
    name: "Admin Sistema",
    role: "admin",
  },
];

// Função para filtrar solicitações baseada no perfil do usuário
function filterRequestsByUserRole(allRequests, currentUser) {
  let userRequests;

  if (currentUser.role === "client") {
    userRequests = allRequests.filter((r) => r.client_id === currentUser.id);
  } else if (currentUser.role === "professional") {
    userRequests = allRequests.filter(
      (r) => r.professional_id === currentUser.id
    );
  } else {
    // Admin vê todas as solicitações
    userRequests = allRequests;
  }

  return userRequests;
}

// Função para filtrar apenas solicitações agendadas
function getScheduledRequests(requests) {
  return requests.filter((r) => r.scheduled_date);
}

// Função para simular a criação de eventos do calendário
function createCalendarEvents(scheduledRequests) {
  return scheduledRequests.map((request) => ({
    id: String(request.id),
    title: `${request.title} (${request.status})`,
    start: request.scheduled_date,
    backgroundColor: getStatusColor(request.status),
    borderColor: getStatusColor(request.status),
    textColor: "#ffffff",
  }));
}

function getStatusColor(status) {
  const colorMap = {
    Agendado: "#3b82f6", // blue-500
    "Em execução": "#8b5cf6", // purple-500
    "Orçamento aprovado": "#22c55e", // green-500
    Solicitado: "#eab308", // yellow-500
  };
  return colorMap[status] || "#6b7280";
}

// Teste para cada tipo de usuário
console.log("\n📋 Testando filtragem por perfil de usuário:");

// 1. Teste Cliente
console.log("\n1️⃣ TESTE CLIENTE:");
const clientUser = mockUsers[0]; // João Silva (client)
const clientRequests = filterRequestsByUserRole(
  mockServiceRequests,
  clientUser
);
const clientScheduled = getScheduledRequests(clientRequests);
const clientEvents = createCalendarEvents(clientScheduled);

console.log(`Usuario: ${clientUser.name} (${clientUser.role})`);
console.log(`Total de solicitações: ${clientRequests.length}`);
console.log(`Solicitações agendadas: ${clientScheduled.length}`);
console.log(
  "Eventos na agenda:",
  clientScheduled.map((r) => ({
    id: r.id,
    title: r.title,
    date: new Date(r.scheduled_date).toLocaleDateString("pt-BR"),
    time: new Date(r.scheduled_date).toLocaleTimeString("pt-BR"),
  }))
);

// 2. Teste Profissional
console.log("\n2️⃣ TESTE PROFISSIONAL:");
const professionalUser = mockUsers[1]; // Maria Santos (professional)
const professionalRequests = filterRequestsByUserRole(
  mockServiceRequests,
  professionalUser
);
const professionalScheduled = getScheduledRequests(professionalRequests);
const professionalEvents = createCalendarEvents(professionalScheduled);

console.log(`Usuario: ${professionalUser.name} (${professionalUser.role})`);
console.log(`Total de solicitações atribuídas: ${professionalRequests.length}`);
console.log(`Solicitações agendadas: ${professionalScheduled.length}`);
console.log(
  "Eventos na agenda:",
  professionalScheduled.map((r) => ({
    id: r.id,
    title: r.title,
    date: new Date(r.scheduled_date).toLocaleDateString("pt-BR"),
    time: new Date(r.scheduled_date).toLocaleTimeString("pt-BR"),
  }))
);

// 3. Teste Administrador
console.log("\n3️⃣ TESTE ADMINISTRADOR:");
const adminUser = mockUsers[2]; // Admin Sistema (admin)
const adminRequests = filterRequestsByUserRole(mockServiceRequests, adminUser);
const adminScheduled = getScheduledRequests(adminRequests);
const adminEvents = createCalendarEvents(adminScheduled);

console.log(`Usuario: ${adminUser.name} (${adminUser.role})`);
console.log(`Total de solicitações: ${adminRequests.length}`);
console.log(`Solicitações agendadas: ${adminScheduled.length}`);
console.log(
  "Eventos na agenda:",
  adminScheduled.map((r) => ({
    id: r.id,
    title: r.title,
    client: `Cliente ID: ${r.client_id}`,
    professional: r.professional_id
      ? `Profissional ID: ${r.professional_id}`
      : "Não atribuído",
    date: new Date(r.scheduled_date).toLocaleDateString("pt-BR"),
    time: new Date(r.scheduled_date).toLocaleTimeString("pt-BR"),
  }))
);

// Verificações de integridade
console.log("\n🔍 VERIFICAÇÕES DE INTEGRIDADE:");

// Verificar se todos os usuários veem apenas seus dados relevantes
const clientShouldOnlySeeOwnRequests = clientRequests.every(
  (r) => r.client_id === clientUser.id
);
const professionalShouldOnlySeeAssignedRequests = professionalRequests.every(
  (r) => r.professional_id === professionalUser.id
);
const adminShouldSeeAllRequests =
  adminRequests.length === mockServiceRequests.length;

console.log(
  `✅ Cliente vê apenas suas solicitações: ${
    clientShouldOnlySeeOwnRequests ? "SIM" : "NÃO"
  }`
);
console.log(
  `✅ Profissional vê apenas solicitações atribuídas: ${
    professionalShouldOnlySeeAssignedRequests ? "SIM" : "NÃO"
  }`
);
console.log(
  `✅ Admin vê todas as solicitações: ${
    adminShouldSeeAllRequests ? "SIM" : "NÃO"
  }`
);

// Verificar se apenas solicitações com data agendada aparecem na agenda
const allScheduledHaveDate = [
  ...clientScheduled,
  ...professionalScheduled,
  ...adminScheduled,
].every((r) => r.scheduled_date);

console.log(
  `✅ Apenas solicitações com data agendada aparecem na agenda: ${
    allScheduledHaveDate ? "SIM" : "NÃO"
  }`
);

// Verificar se eventos são criados corretamente
const eventsHaveRequiredFields = [
  ...clientEvents,
  ...professionalEvents,
  ...adminEvents,
].every((e) => e.id && e.title && e.start && e.backgroundColor);

console.log(
  `✅ Eventos do calendário têm todos os campos obrigatórios: ${
    eventsHaveRequiredFields ? "SIM" : "NÃO"
  }`
);

console.log("\n📊 RESUMO DO TESTE:");
console.log("- Cliente: vê 2 solicitações próprias, 2 agendadas");
console.log("- Profissional: vê 3 solicitações atribuídas, 3 agendadas");
console.log("- Admin: vê 4 solicitações total, 4 agendadas");

console.log("\n✅ Teste da funcionalidade de agenda concluído!");
