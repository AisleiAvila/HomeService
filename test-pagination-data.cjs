/**
 * Script para testar a paginação adicionando dados de exemplo
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uqrvenklquhelajuvegvv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Dados de exemplo para testar paginação
const sampleRequests = [
  {
    title: "Conserto de torneira",
    description: "Torneira da cozinha está vazando",
    category: "Plumbing",
    street: "Rua das Flores, 123",
    city: "São Paulo",
    state: "SP",
    zip_code: "01234-567",
    status: "Pending"
  },
  {
    title: "Instalação elétrica",
    description: "Instalar tomadas no quarto",
    category: "Electrical",
    street: "Av. Paulista, 456",
    city: "São Paulo",
    state: "SP",
    zip_code: "01310-100",
    status: "Quoted",
    cost: 150.00
  },
  {
    title: "Limpeza completa",
    description: "Limpeza de apartamento completo",
    category: "Cleaning",
    street: "Rua Augusta, 789",
    city: "São Paulo",
    state: "SP",
    zip_code: "01305-000",
    status: "Approved",
    cost: 200.00
  },
  {
    title: "Poda de jardim",
    description: "Poda de árvores e manutenção do jardim",
    category: "Gardening",
    street: "Rua do Jardim, 321",
    city: "São Paulo",
    state: "SP",
    zip_code: "04567-890",
    status: "Completed",
    cost: 180.00,
    payment_status: "Paid"
  },
  {
    title: "Pintura de parede",
    description: "Pintar sala e cozinha",
    category: "Painting",
    street: "Rua das Cores, 654",
    city: "São Paulo",
    state: "SP",
    zip_code: "05678-901",
    status: "In Progress",
    cost: 300.00
  },
  {
    title: "Reparo de chuveiro",
    description: "Chuveiro não está aquecendo",
    category: "Plumbing",
    street: "Rua da Água, 987",
    city: "Rio de Janeiro",
    state: "RJ",
    zip_code: "20000-123",
    status: "Pending"
  },
  {
    title: "Troca de lâmpadas",
    description: "Trocar todas as lâmpadas por LED",
    category: "Electrical",
    street: "Rua da Luz, 159",
    city: "Rio de Janeiro",
    state: "RJ",
    zip_code: "20001-456",
    status: "Quoted",
    cost: 80.00
  },
  {
    title: "Limpeza pós-obra",
    description: "Limpeza após reforma",
    category: "Cleaning",
    street: "Av. Rio Branco, 753",
    city: "Rio de Janeiro",
    state: "RJ",
    zip_code: "20002-789",
    status: "Approved",
    cost: 350.00
  },
  {
    title: "Manutenção do gramado",
    description: "Cortar grama e regar plantas",
    category: "Gardening",
    street: "Rua Verde, 246",
    city: "Belo Horizonte",
    state: "MG",
    zip_code: "30000-111",
    status: "Completed",
    cost: 120.00,
    payment_status: "Paid"
  },
  {
    title: "Pintura de fachada",
    description: "Renovar pintura externa da casa",
    category: "Painting",
    street: "Rua Colorida, 135",
    city: "Belo Horizonte",
    state: "MG",
    zip_code: "30001-222",
    status: "Pending"
  },
  {
    title: "Desentupimento de pia",
    description: "Pia da cozinha entupida",
    category: "Plumbing",
    street: "Rua do Encanamento, 369",
    city: "Brasília",
    state: "DF",
    zip_code: "70000-333",
    status: "Quoted",
    cost: 90.00
  },
  {
    title: "Instalação de ventilador",
    description: "Instalar ventilador de teto no quarto",
    category: "Electrical",
    street: "Quadra 10, Bloco A",
    city: "Brasília",
    state: "DF",
    zip_code: "70001-444",
    status: "Approved",
    cost: 120.00
  },
  {
    title: "Limpeza de escritório",
    description: "Limpeza semanal do escritório",
    category: "Cleaning",
    street: "SCS Quadra 2",
    city: "Brasília",
    state: "DF",
    zip_code: "70002-555",
    status: "In Progress",
    cost: 250.00
  },
  {
    title: "Plantio de flores",
    description: "Plantar flores no jardim frontal",
    category: "Gardening",
    street: "Rua das Flores, 741",
    city: "Salvador",
    state: "BA",
    zip_code: "40000-666",
    status: "Completed",
    cost: 160.00,
    payment_status: "Unpaid"
  },
  {
    title: "Pintura de portão",
    description: "Pintar portão de entrada",
    category: "Painting",
    street: "Rua do Portão, 852",
    city: "Salvador",
    state: "BA",
    zip_code: "40001-777",
    status: "Pending"
  }
];

async function addSampleRequests() {
  console.log('🚀 Iniciando criação de dados de exemplo para paginação...');

  try {
    // Primeiro, vamos buscar um usuário cliente para usar como client_id
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .limit(1);

    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ Nenhum usuário cliente encontrado. Criando um usuário de exemplo...');
      
      // Criar um usuário cliente de exemplo
      const { data: newUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          name: 'Cliente Teste',
          email: 'cliente.teste@example.com',
          role: 'client',
          status: 'Active',
          auth_id: 'test-client-auth-id'
        })
        .select()
        .single();

      if (createUserError) {
        console.error('❌ Erro ao criar usuário:', createUserError);
        return;
      }

      console.log('✅ Usuário cliente criado:', newUser);
      users.push(newUser);
    }

    const clientUser = users[0];
    console.log('👤 Usando cliente:', clientUser.name);

    // Preparar requests com dados do cliente
    const requestsToInsert = sampleRequests.map(request => ({
      ...request,
      client_id: clientUser.id,
      client_auth_id: clientUser.auth_id,
      requested_date: new Date().toISOString(),
      payment_status: request.payment_status || 'Unpaid'
    }));

    // Inserir requests em lotes para evitar timeout
    const batchSize = 5;
    let inserted = 0;

    for (let i = 0; i < requestsToInsert.length; i += batchSize) {
      const batch = requestsToInsert.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('service_requests')
        .insert(batch);

      if (insertError) {
        console.error('❌ Erro ao inserir lote:', insertError);
        continue;
      }

      inserted += batch.length;
      console.log(`✅ Inserido lote ${Math.floor(i/batchSize) + 1}: ${batch.length} requests`);
    }

    console.log(`🎉 Processo concluído! ${inserted} service requests criadas.`);
    console.log('📋 Agora você pode testar a paginação no admin dashboard!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

async function clearSampleData() {
  console.log('🧹 Limpando dados de exemplo...');
  
  try {
    const { error } = await supabase
      .from('service_requests')
      .delete()
      .in('title', sampleRequests.map(r => r.title));

    if (error) {
      console.error('❌ Erro ao limpar dados:', error);
    } else {
      console.log('✅ Dados de exemplo removidos!');
    }
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar baseado no argumento da linha de comando
const action = process.argv[2];

if (action === 'clear') {
  clearSampleData();
} else {
  addSampleRequests();
}
