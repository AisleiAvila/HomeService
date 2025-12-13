// Script para testar inserção na tabela service_requests_status
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://mhcuwdpfazlzvdebztlb.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oY3V3ZHBmYXpsendkZWJ6dGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMzc2MDMsImV4cCI6MjAwNjYxMzYwM30.p0Yp-Bk1z8GmCEjfJ-V8_aZWlDm-D4S7n-UcS6Y5O7I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertStatus() {
  try {
    console.log('🔍 Testando inserção na tabela service_requests_status...\n');

    // 1. Buscar uma solicitação existente
    console.log('📋 1. Buscando solicitações existentes...');
    const { data: requests, error: reqError } = await supabase
      .from('service_requests')
      .select('id, status')
      .limit(1);

    if (reqError) {
      console.error('❌ Erro ao buscar solicitações:', reqError);
      return;
    }

    if (!requests || requests.length === 0) {
      console.log('⚠️  Nenhuma solicitação encontrada. Criando uma para teste...');
      
      const { data: newReq, error: createError } = await supabase
        .from('service_requests')
        .insert([{
          service_type: 'Limpeza',
          client_id: 1,
          status: 'Solicitado',
          created_by_admin_id: 1,
          created_at: new Date().toISOString(),
          isPaid: false
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar solicitação:', createError);
        return;
      }
      requests.push(newReq);
    }

    const requestId = requests[0].id;
    console.log(`✅ Solicitação encontrada: ID ${requestId}, Status: ${requests[0].status}\n`);

    // 2. Tentar inserir um registro no histórico
    console.log(`📝 2. Inserindo registro de histórico para ID ${requestId}...`);
    
    const statusEntry = {
      service_request_id: requestId,
      status: 'Teste',
      changed_by: 1,
      changed_at: new Date().toISOString(),
      notes: 'Teste de inserção automática'
    };

    console.log('Dados:', JSON.stringify(statusEntry, null, 2));

    const { data: historyData, error: historyError } = await supabase
      .from('service_requests_status')
      .insert([statusEntry])
      .select();

    if (historyError) {
      console.error('❌ Erro ao inserir histórico:', historyError);
      console.error('Detalhes:', historyError.details || 'Sem detalhes');
      console.error('Hint:', historyError.hint || 'Sem dica');
      return;
    }

    console.log(`✅ Histórico inserido com sucesso:`, historyData);

    // 3. Verificar o que foi inserido
    console.log(`\n📊 3. Verificando registros para ID ${requestId}...`);
    const { data: history, error: selectError } = await supabase
      .from('service_requests_status')
      .select('*')
      .eq('service_request_id', requestId);

    if (selectError) {
      console.error('❌ Erro ao buscar histórico:', selectError);
      return;
    }

    console.log(`✅ Encontrados ${history.length} registros:`);
    history.forEach(h => {
      console.log(`  - Status: ${h.status}, Criado: ${h.changed_at}`);
    });

    // 4. Verificar contagem total
    console.log(`\n📈 4. Contagem total de registros na tabela...`);
    const { count, error: countError } = await supabase
      .from('service_requests_status')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar:', countError);
    } else {
      console.log(`✅ Total de registros: ${count}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testInsertStatus();
