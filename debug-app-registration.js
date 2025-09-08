/**
 * Teste rápido para verificar se a nova implementação está funcionando
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickOTPTest() {
  console.log("🧪 Teste rápido da implementação OTP\n");

  const testEmail = `quick-otp-test-${Date.now()}@example.com`;

  console.log("📧 Tentando enviar OTP para:", testEmail);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        shouldCreateUser: true,
        data: {
          name: "Teste Rápido",
          role: "client",
          password: "Teste123!",
        },
      },
    });

    if (error) {
      console.error("❌ Erro:", error.message);

      if (error.message.includes("rate limit")) {
        console.log("\n⚠️ RATE LIMIT AINDA ATIVO");
        console.log(
          "   Aguarde mais alguns minutos antes de testar na aplicação"
        );
        console.log(
          "   O rate limit do Supabase está bloqueando envios de email"
        );
      } else if (error.message.includes("Signup is disabled")) {
        console.log("\n❌ SIGNUP DESABILITADO");
        console.log(
          "   A criação de novos usuários está desabilitada no Supabase"
        );
        console.log("   Verifique Authentication > Settings no painel");
      } else {
        console.log("\n❌ OUTRO ERRO:", error.message);
      }
    } else {
      console.log("✅ OTP enviado com sucesso!");
      console.log("📧 Verifique o Mailtrap para o email");
      console.log("   A implementação está funcionando!");
    }
  } catch (e) {
    console.error("❌ Erro inesperado:", e.message);
  }
}

async function checkApplicationFlow() {
  console.log("\n\n🔍 DEBUGANDO FLUXO DA APLICAÇÃO\n");

  console.log("📋 Verificações necessárias:");
  console.log("   1. A aplicação foi recompilada após as alterações?");
  console.log("   2. O browser cache foi limpo?");
  console.log("   3. O rate limit do Supabase passou?");
  console.log("   4. As configurações do Supabase estão corretas?");

  console.log("\n🔧 Passos para debugar:");
  console.log("   1. Abra o Developer Tools (F12)");
  console.log("   2. Vá para a aba Console");
  console.log("   3. Tente registrar um usuário");
  console.log("   4. Veja as mensagens no console");
  console.log(
    "   5. Procure por logs que começam com '🚀 AuthService.register()'"
  );

  console.log("\n📧 O que deve aparecer no console:");
  console.log("   ✅ '🚀 AuthService.register() iniciado para: [email]'");
  console.log("   ✅ '🎯 SOLUÇÃO ALTERNATIVA: Usando OTP em vez de signUp'");
  console.log("   ✅ '📧 Enviando código de verificação via OTP...'");
  console.log("   ✅ 'Um código de verificação foi enviado para seu e-mail'");

  console.log("\n❌ Se aparecer erro de rate limit:");
  console.log("   - Aguarde 10-15 minutos");
  console.log("   - Ou use um domínio de email diferente");

  console.log("\n❌ Se não aparecer os logs:");
  console.log("   - A aplicação não foi recompilada");
  console.log("   - Ou há erro de compilação");
  console.log("   - Verifique o terminal onde roda ng serve");
}

async function runQuickDiagnosis() {
  await quickOTPTest();
  await checkApplicationFlow();

  console.log("\n\n🎯 PRÓXIMOS PASSOS:");
  console.log("   1. Execute este teste e veja o resultado");
  console.log("   2. Se rate limit, aguarde e teste na aplicação depois");
  console.log("   3. Se funcionou aqui, o problema pode ser na aplicação");
  console.log("   4. Verifique os logs do browser na aplicação");
}

runQuickDiagnosis();
