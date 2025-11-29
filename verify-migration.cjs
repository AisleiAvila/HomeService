// Script para verificar a migração dos dados no banco Supabase
// Verifica se os 7 registros foram migrados corretamente para o novo sistema de 11 status

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dzhcdbxkkqwgvvzbxbve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aGNkYnhra3F3Z3Z2emJ4YnZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2OTQ0MjcsImV4cCI6MjA0NzI3MDQyN30.fk1MwY_TW2xNhBLxKOEhPFWWQzl8nZHTwqx-Py7k1NI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('🔍 Verificando migração de dados...\n');

  try {
    // 1. Consultar todos os registros
    const { data: allRequests, error: allError } = await supabase
      .from('service_requests')
      .select('id, status, created_at')
      .order('created_at', { ascending: true });

    if (allError) {
      console.error('❌ Erro ao consultar registros:', allError);
      return;
    }

    console.log(`📊 Total de registros encontrados: ${allRequests.length}\n`);

    // 2. Verificar distribuição de status
    const statusCount = {};
    const validStatuses = [
      'Solicitado',
      'Atribuído',
      'Aguardando Confirmação',
      'Aceito',
      'Recusado',
      'Data Definida',
      'Em Progresso',
      'Aguardando Finalização',
      'Pagamento Feito',
      'Concluído',
      'Cancelado'
    ];

    allRequests.forEach(req => {
      statusCount[req.status] = (statusCount[req.status] || 0) + 1;
    });

    console.log('📈 Distribuição de Status:');
    console.log('─'.repeat(50));
    Object.entries(statusCount).forEach(([status, count]) => {
      const isValid = validStatuses.includes(status);
      const icon = isValid ? '✅' : '⚠️';
      console.log(`${icon} ${status}: ${count} registro(s)`);
    });
    console.log('─'.repeat(50));

    // 3. Verificar se há status deprecated
    const deprecatedStatuses = allRequests.filter(
      req => !validStatuses.includes(req.status)
    );

    if (deprecatedStatuses.length > 0) {
      console.log('\n⚠️ ATENÇÃO: Encontrados status não migrados:');
      deprecatedStatuses.forEach(req => {
        console.log(`   - ID: ${req.id}, Status: "${req.status}"`);
      });
    } else {
      console.log('\n✅ Todos os registros estão usando o novo sistema de status!');
    }

    // 4. Detalhar cada registro
    console.log('\n📋 Detalhamento dos Registros:');
    console.log('─'.repeat(50));
    allRequests.forEach((req, index) => {
      const isValid = validStatuses.includes(req.status);
      const icon = isValid ? '✅' : '❌';
      console.log(`${icon} Registro ${index + 1}:`);
      console.log(`   ID: ${req.id}`);
      console.log(`   Status: "${req.status}"`);
      console.log(`   Criado em: ${new Date(req.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    });

    // 5. Resumo final
    console.log('═'.repeat(50));
    console.log('📊 RESUMO DA MIGRAÇÃO:');
    console.log(`   Total de registros: ${allRequests.length}`);
    console.log(`   Status válidos: ${allRequests.length - deprecatedStatuses.length}`);
    console.log(`   Status deprecated: ${deprecatedStatuses.length}`);
    console.log(`   Taxa de sucesso: ${((allRequests.length - deprecatedStatuses.length) / allRequests.length * 100).toFixed(1)}%`);
    console.log('═'.repeat(50));

    if (deprecatedStatuses.length === 0) {
      console.log('\n🎉 MIGRAÇÃO 100% COMPLETA! Todos os registros estão usando o novo sistema de 11 status.');
    } else {
      console.log(`\n⚠️ ATENÇÃO: ${deprecatedStatuses.length} registro(s) precisam ser migrados manualmente.`);
    }

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

verifyMigration();
