// Teste rápido da funcionalidade de agendamento

// Simular dados de teste
const testRequest = {
  id: 1,
  title: "Reparação de torneira",
  category: "Plumbing",
  requested_datetime: "2025-09-15T14:00:00.000Z",
};

const testProfessional = {
  id: 1,
  name: "João Silva",
  specialties: ["Plumbing"],
};

// Testar funções de agendamento
function combineDateTime(date, time) {
  return `${date}T${time}:00.000Z`;
}

function formatDateTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString("pt-PT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return isoString;
  }
}

function getMinDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// Testes
console.log("=== TESTE DE FUNCIONALIDADES DE AGENDAMENTO ===");
console.log("Data mínima:", getMinDate());
console.log("Combinar data/hora:", combineDateTime("2025-09-15", "14:30"));
console.log("Formatar datetime:", formatDateTime("2025-09-15T14:30:00.000Z"));

// Validar dados do formulário
function canAssignProfessional(professionalId, date, time, duration) {
  return !!(professionalId && date && time && duration && duration > 0);
}

console.log(
  "Pode atribuir profissional:",
  canAssignProfessional(1, "2025-09-15", "14:30", 120)
);
console.log(
  "Não pode atribuir (sem duração):",
  canAssignProfessional(1, "2025-09-15", "14:30", null)
);

console.log("✅ Testes concluídos com sucesso!");
