/**
 * Script de Diagnóstico: Detectar e Corrigir Solicitações Agendadas sem Profissional
 *
 * Simula a situação atual onde há solicitações com status "Agendado"
 * mas sem profissional atribuído
 */

console.log("🔍 Diagnóstico: Solicitações Agendadas sem Profissional");
console.log("=".repeat(70));

// Simular dados atuais do sistema (baseado no que o usuário mostrou)
const serviceRequests = [
  {
    id: 1,
    title: "Pintura da casa",
    client: "Cliente 01",
    professional_id: 101,
    professional_name: "Profissional 01",
    status: "Profissional selecionado",
    cost: 200.0,
    category: "Painting",
  },
  {
    id: 2,
    title: "Trocar encanamento danificado",
    client: "Cliente 01",
    professional_id: null, // 🚨 PROBLEMA: Status "Agendado" sem profissional!
    professional_name: "Não atribuído",
    status: "Agendado",
    cost: 100.0,
    category: "Plumbing",
    scheduled_start_datetime: "2025-09-22T09:00:00Z",
  },
  {
    id: 3,
    title: "Cortar grama",
    client: "Cliente 01",
    professional_id: null,
    professional_name: "Não atribuído",
    status: "Pending",
    cost: null,
    category: "Gardening",
  },
  {
    id: 4,
    title: "Trocar encanamento danificado",
    client: "Cliente 01",
    professional_id: 101,
    professional_name: "Profissional 01",
    status: "Assigned",
    cost: 100.0,
    category: "Plumbing",
  },
  {
    id: 5,
    title: "Aparar árvores",
    client: "Cliente 01",
    professional_id: 101,
    professional_name: "Profissional 01",
    status: "Assigned",
    cost: 10.0,
    category: "Gardening",
  },
];

const professionals = [
  {
    id: 101,
    name: "Profissional 01",
    role: "professional",
    specialties: ["Painting", "Plumbing", "Gardening"],
    active: true,
    current_workload: 3,
  },
  {
    id: 102,
    name: "João Silva",
    role: "professional",
    specialties: ["Plumbing", "Electrical"],
    active: true,
    current_workload: 1,
  },
  {
    id: 103,
    name: "Maria Santos",
    role: "professional",
    specialties: ["Gardening", "Cleaning"],
    active: true,
    current_workload: 0,
  },
];

// Função para detectar inconsistências
function detectInconsistencies() {
  console.log("\n🔍 DETECTANDO INCONSISTÊNCIAS:");
  console.log("-".repeat(50));

  const inconsistentServices = serviceRequests.filter(
    (service) => service.status === "Agendado" && !service.professional_id
  );

  console.log(`📊 Total de serviços: ${serviceRequests.length}`);
  console.log(
    `🚨 Serviços com status "Agendado" sem profissional: ${inconsistentServices.length}`
  );

  if (inconsistentServices.length > 0) {
    console.log("\n❌ INCONSISTÊNCIAS ENCONTRADAS:");
    inconsistentServices.forEach((service) => {
      console.log(`  - ID ${service.id}: "${service.title}"`);
      console.log(
        `    Status: ${service.status} | Profissional: ${service.professional_name}`
      );
      console.log(
        `    Categoria: ${service.category} | Custo: €${service.cost}`
      );
      if (service.scheduled_start_datetime) {
        console.log(`    Data agendada: ${service.scheduled_start_datetime}`);
      }
      console.log("");
    });
    return inconsistentServices;
  } else {
    console.log("✅ Nenhuma inconsistência encontrada!");
    return [];
  }
}

// Função para auto-atribuir profissional
function autoAssignProfessional(serviceCategory) {
  console.log(`🔍 Buscando profissional para categoria: ${serviceCategory}`);

  // Filtrar profissionais especializados na categoria
  const specialists = professionals.filter(
    (p) =>
      p.role === "professional" &&
      p.active &&
      p.specialties.includes(serviceCategory)
  );

  if (specialists.length > 0) {
    // Ordenar por menor carga de trabalho
    specialists.sort((a, b) => a.current_workload - b.current_workload);
    const selected = specialists[0];
    console.log(
      `✅ Especialista selecionado: ${selected.name} (ID: ${selected.id}) - Carga: ${selected.current_workload}`
    );
    return selected;
  }

  // Fallback: qualquer profissional disponível
  const availableProfessionals = professionals.filter(
    (p) => p.role === "professional" && p.active
  );

  if (availableProfessionals.length > 0) {
    availableProfessionals.sort(
      (a, b) => a.current_workload - b.current_workload
    );
    const selected = availableProfessionals[0];
    console.log(
      `⚠️  Nenhum especialista. Selecionado: ${selected.name} (ID: ${selected.id}) - Carga: ${selected.current_workload}`
    );
    return selected;
  }

  console.log("❌ Nenhum profissional disponível");
  return null;
}

// Função para corrigir inconsistências
function fixInconsistencies(inconsistentServices) {
  if (inconsistentServices.length === 0) {
    console.log("ℹ️  Nenhuma correção necessária.");
    return;
  }

  console.log("\n🔧 CORRIGINDO INCONSISTÊNCIAS:");
  console.log("-".repeat(50));

  let fixedCount = 0;

  inconsistentServices.forEach((service) => {
    console.log(
      `\n⚙️  Processando serviço ID ${service.id}: "${service.title}"`
    );

    const assignedProfessional = autoAssignProfessional(service.category);

    if (assignedProfessional) {
      // Atualizar serviço
      service.professional_id = assignedProfessional.id;
      service.professional_name = assignedProfessional.name;

      // Aumentar carga de trabalho do profissional
      assignedProfessional.current_workload++;

      console.log(
        `✅ Profissional atribuído: ${assignedProfessional.name} (ID: ${assignedProfessional.id})`
      );
      console.log(
        `🔔 NOTIFICAÇÃO: ${assignedProfessional.name} foi atribuído ao serviço "${service.title}"`
      );

      fixedCount++;
    } else {
      // Mudar status se não conseguir atribuir
      service.status = "Buscando profissional";
      console.log(
        `⚠️  Status alterado para "Buscando profissional" (nenhum profissional disponível)`
      );
    }
  });

  console.log(
    `\n🎯 Correções aplicadas: ${fixedCount} de ${inconsistentServices.length}`
  );
}

// Função para mostrar relatório final
function generateFinalReport() {
  console.log("\n📊 RELATÓRIO FINAL:");
  console.log("=".repeat(70));

  const agendadoServices = serviceRequests.filter(
    (s) => s.status === "Agendado"
  );
  const agendadoWithProfessional = agendadoServices.filter(
    (s) => s.professional_id
  );
  const agendadoWithoutProfessional = agendadoServices.filter(
    (s) => !s.professional_id
  );

  console.log(
    `📋 Total de serviços com status "Agendado": ${agendadoServices.length}`
  );
  console.log(
    `✅ Com profissional atribuído: ${agendadoWithProfessional.length}`
  );
  console.log(
    `❌ Sem profissional atribuído: ${agendadoWithoutProfessional.length}`
  );

  if (agendadoWithoutProfessional.length === 0) {
    console.log(
      "\n🎉 SUCESSO: Todos os serviços agendados têm profissional atribuído!"
    );
  } else {
    console.log(
      `\n⚠️  ATENÇÃO: ${agendadoWithoutProfessional.length} serviços ainda precisam de profissional`
    );
  }

  console.log("\n📋 ESTADO ATUAL DE TODOS OS SERVIÇOS:");
  console.table(
    serviceRequests.map((s) => ({
      ID: s.id,
      Título: s.title.substring(0, 25) + (s.title.length > 25 ? "..." : ""),
      Cliente: s.client,
      Profissional: s.professional_name,
      Status: s.status,
      Custo: s.cost ? `€${s.cost}` : "N/A",
    }))
  );

  console.log("\n📊 CARGA DE TRABALHO DOS PROFISSIONAIS:");
  console.table(
    professionals.map((p) => ({
      ID: p.id,
      Nome: p.name,
      Especialidades: p.specialties.join(", "),
      "Carga Atual": p.current_workload,
      Status: p.active ? "Ativo" : "Inativo",
    }))
  );
}

// EXECUTAR DIAGNÓSTICO COMPLETO
console.log("\n🚀 INICIANDO DIAGNÓSTICO COMPLETO");
console.log("=".repeat(70));

// Passo 1: Detectar inconsistências
const inconsistencies = detectInconsistencies();

// Passo 2: Corrigir inconsistências
fixInconsistencies(inconsistencies);

// Passo 3: Verificar resultado
const remainingInconsistencies = serviceRequests.filter(
  (service) => service.status === "Agendado" && !service.professional_id
);

if (remainingInconsistencies.length === 0) {
  console.log("\n✅ TODAS AS INCONSISTÊNCIAS FORAM CORRIGIDAS!");
} else {
  console.log(
    `\n⚠️  AINDA RESTAM ${remainingInconsistencies.length} INCONSISTÊNCIAS`
  );
}

// Passo 4: Relatório final
generateFinalReport();

console.log("\n🎯 RECOMENDAÇÕES:");
console.log("1. Executar migration 25_fix_scheduled_without_professional.sql");
console.log("2. Implementar trigger de prevenção");
console.log(
  "3. Verificar se as funções auto_assign_professional estão sendo usadas"
);
console.log("4. Revisar fluxo no frontend para garantir atribuição automática");

console.log("\n" + "=".repeat(70));
console.log("🔧 DIAGNÓSTICO CONCLUÍDO");
