/**
 * Verificação rápida do status atual - SEM criar novos usuários
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickStatusCheck() {
  console.log("⚡ VERIFICAÇÃO RÁPIDA DE STATUS\n");

  console.log("📊 RESUMO DOS TESTES EXECUTADOS:");
  console.log("   ✅ SMTP configurado e funcionando");
  console.log("   ✅ Emails de OTP são enviados");
  console.log("   ✅ Emails de recuperação de senha funcionam");
  console.log("   ❌ Emails de confirmação de registro NÃO são enviados");
  console.log("   ❌ Usuários são automaticamente confirmados");

  console.log("\n🔍 DIAGNÓSTICO:");
  console.log("   Problema: Email confirmation está DESABILITADO no Supabase");
  console.log("   Resultado: Novos usuários acessam sem confirmar email");
  console.log("   Rate Limit: Ativo devido aos muitos testes");

  console.log("\n📧 VERIFICAR MAILTRAP AGORA:");
  console.log("   1. Acesse: https://mailtrap.io");
  console.log("   2. Vá para Email Sandbox");
  console.log("   3. Verifique emails dos últimos 30 minutos");
  console.log("   ");
  console.log("   ESPERADO encontrar:");
  console.log("   ✅ Emails de OTP (vários)");
  console.log("   ✅ Emails de recuperação de senha");
  console.log("   ❌ ZERO emails de confirmação de registro");

  console.log("\n🎯 CONFIGURAÇÃO NECESSÁRIA:");
  console.log("   No Supabase, procure e ATIVE:");
  console.log("   ☐ 'Email confirmation required'");
  console.log("   ☐ 'Confirm email before sign in'");
  console.log("   ☐ Ou DESATIVE 'Auto-confirm users'");

  console.log("\n🚀 TESTE FINAL:");
  console.log("   Após encontrar e ativar a configuração:");
  console.log("   1. Aguarde 5 minutos (rate limit)");
  console.log("   2. Execute: node quick-test.js");
  console.log("   3. Deve mostrar: Session criada: false");
  console.log("   4. E email deve chegar no Mailtrap");

  // Verificar usuários recentes na tabela
  try {
    console.log("\n👥 USUÁRIOS DE TESTE CRIADOS:");
    const { data: users, error } = await supabase
      .from("users")
      .select("email, email_verified, created_at")
      .like("email", "%test-%")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.log("   ❌ Erro ao buscar usuários:", error.message);
    } else if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      Email verificado: ${user.email_verified}`);
        console.log(
          `      Criado em: ${new Date(user.created_at).toLocaleString()}`
        );
      });
    } else {
      console.log("   Nenhum usuário de teste encontrado");
    }
  } catch (e) {
    console.log("   ❌ Erro ao verificar usuários:", e.message);
  }
}

quickStatusCheck();
