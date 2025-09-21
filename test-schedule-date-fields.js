/**
 * Teste específico para verificar campos de data usados na agenda
 * Análise detalhada dos campos scheduled_date vs scheduled_start_datetime
 */

console.log("🔍 Verificando campos de data na implementação da agenda...");

// Simular dados como estão sendo gerados no DataService
const sampleDataFromDataService = [
  {
    id: 1,
    title: "Trocar encanamento danificado",
    status: "Agendado",
    scheduled_date: "2025-09-25T14:00:00.000Z", // Campo usado no ScheduleComponent
    scheduled_start_datetime: "2025-09-25T14:00:00.000Z", // Campo mais específico
    client_id: 1,
    professional_id: 2,
  },
  {
    id: 2,
    title: "Cortar grama",
    status: "Orçamento aprovado",
    scheduled_date: null, // Sem agendamento ainda
    scheduled_start_datetime: null,
    client_id: 1,
    professional_id: null,
  },
  {
    id: 3,
    title: "Instalação elétrica",
    status: "Agendado",
    scheduled_date: "2025-09-26T09:00:00.000Z",
    scheduled_start_datetime: "2025-09-26T09:00:00.000Z",
    client_id: 2,
    professional_id: 2,
  },
];

console.log("\n📊 Análise dos campos de data:");

sampleDataFromDataService.forEach((request, index) => {
  console.log(`\n${index + 1}. ${request.title}:`);
  console.log(`   Status: ${request.status}`);
  console.log(`   scheduled_date: ${request.scheduled_date}`);
  console.log(
    `   scheduled_start_datetime: ${request.scheduled_start_datetime}`
  );

  // Verificar se seria exibido na agenda (baseado no código atual)
  const wouldShowInSchedule = !!request.scheduled_date;
  console.log(
    `   ✓ Apareceria na agenda: ${wouldShowInSchedule ? "SIM" : "NÃO"}`
  );
});

// Simular o filtro como está implementado no ScheduleComponent
console.log("\n🔎 Simulando filtro do ScheduleComponent:");

function simulateScheduleFilter(requests) {
  return requests
    .filter((r) => r.scheduled_date) // Linha 165 do ScheduleComponent
    .map((request) => ({
      id: String(request.id),
      title: `${request.title} (${request.status})`,
      start: request.scheduled_date, // Usando scheduled_date
      backgroundColor: "#3b82f6",
      borderColor: "#3b82f6",
      textColor: "#ffffff",
    }));
}

const scheduledEvents = simulateScheduleFilter(sampleDataFromDataService);

console.log("Eventos que apareceriam no calendário:");
scheduledEvents.forEach((event) => {
  console.log(`- ID: ${event.id}, Título: ${event.title}`);
  console.log(`  Data/Hora: ${new Date(event.start).toLocaleString("pt-BR")}`);
});

console.log(`\nTotal de eventos na agenda: ${scheduledEvents.length}`);

// Verificar se há inconsistências entre os campos de data
console.log("\n⚠️  Verificando possíveis inconsistências:");

const inconsistencies = sampleDataFromDataService.filter((request) => {
  return (
    (request.scheduled_date && !request.scheduled_start_datetime) ||
    (!request.scheduled_date && request.scheduled_start_datetime)
  );
});

if (inconsistencies.length > 0) {
  console.log("❌ Encontradas inconsistências entre campos de data:");
  inconsistencies.forEach((request) => {
    console.log(
      `- ID ${request.id}: scheduled_date=${request.scheduled_date}, scheduled_start_datetime=${request.scheduled_start_datetime}`
    );
  });
} else {
  console.log("✅ Não há inconsistências entre os campos de data");
}

// Verificar se a aplicação está usando o campo correto
console.log("\n📋 Recomendações:");

const hasNewDateTimeField = sampleDataFromDataService.some(
  (r) => r.scheduled_start_datetime
);
const hasOldDateField = sampleDataFromDataService.some((r) => r.scheduled_date);

if (hasNewDateTimeField && hasOldDateField) {
  console.log(
    "⚠️  A aplicação está usando tanto 'scheduled_date' quanto 'scheduled_start_datetime'"
  );
  console.log(
    "📝 Recomendação: Padronizar para usar apenas 'scheduled_start_datetime' (mais específico)"
  );
  console.log(
    "📝 O ScheduleComponent atualmente usa 'scheduled_date' (linha 165)"
  );
} else if (hasNewDateTimeField) {
  console.log("✅ Usando apenas 'scheduled_start_datetime' (campo correto)");
} else {
  console.log("✅ Usando apenas 'scheduled_date' (campo legado)");
}

console.log("\n✅ Verificação de campos de data concluída!");
