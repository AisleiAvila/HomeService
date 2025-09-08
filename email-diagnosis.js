/**
 * Script para diagnosticar configuração de email no Supabase
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseEmailSettings() {
  console.log("🔍 DIAGNÓSTICO COMPLETO DE EMAIL\n");

  const testEmail = `diagnostic-${Date.now()}@example.com`;

  console.log("1. Testando signUp normal...");

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: "TestPassword123!",
    });

    if (error) {
      console.error("❌ Erro:", error.message);
      return;
    }

    console.log("📊 ANÁLISE DOS RESULTADOS:");
    console.log("  - Usuário ID:", data.user?.id);
    console.log("  - Email:", data.user?.email);
    console.log(
      "  - Confirmado em:",
      data.user?.email_confirmed_at || "NÃO CONFIRMADO"
    );
    console.log("  - Session ativa:", !!data.session);

    if (data.session && data.user?.email_confirmed_at) {
      console.log("\n❌ PROBLEMA: AUTO-CONFIRMAÇÃO ATIVA");
      console.log("   Status: Usuário automaticamente confirmado e logado");
      console.log("   Causa: Email confirmation está DESABILITADO");

      console.log("\n🔧 ONDE PROCURAR NO SUPABASE:");
      console.log("   1. Authentication > Settings > Auth");
      console.log(
        "   2. Procure por uma seção sobre 'Email' ou 'Verification'"
      );
      console.log("   3. Deve haver uma opção como:");
      console.log("      - 'Confirm email before allowing sign in'");
      console.log("      - 'Email confirmation required'");
      console.log("      - 'Verify email on signup'");
      console.log("   4. Marque essa opção e salve");
    } else if (!data.session && !data.user?.email_confirmed_at) {
      console.log("\n✅ CONFIGURAÇÃO CORRETA");
      console.log("   Status: Usuário criado mas não confirmado");
      console.log("   Email de confirmação deveria ter sido enviado");
    } else {
      console.log("\n⚠️  SITUAÇÃO INTERMEDIÁRIA");
      console.log("   Status: Configuração parcial");
      console.log("   Verifique todas as configurações de email");
    }

    // Testar resend functionality
    console.log("\n2. Testando função de reenvio...");

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: testEmail,
    });

    if (resendError) {
      console.log("❌ Erro no reenvio:", resendError.message);
      if (resendError.message.includes("already confirmed")) {
        console.log("   Confirma que auto-confirmação está ativa");
      }
    } else {
      console.log("✅ Reenvio funcionou - email deveria ser enviado");
    }

    // Limpar
    await supabase.auth.signOut();
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

async function checkSpecificSettings() {
  console.log("\n3. Verificações específicas...");

  // Tentar diferentes métodos para detectar as configurações
  const testEmail2 = `settings-test-${Date.now()}@example.com`;

  console.log("\n📋 CHECKLIST DE CONFIGURAÇÕES:");
  console.log("   No painel do Supabase, verifique:");
  console.log("   □ Authentication > Settings > Auth");
  console.log("   □ Authentication > Settings > Email Templates");
  console.log("   □ Authentication > Settings > SMTP");
  console.log("   □ Authentication > URL Configuration");
  console.log("   ");
  console.log("   Procure por opções como:");
  console.log("   □ 'Enable email confirmations'");
  console.log("   □ 'Confirm email before sign in'");
  console.log("   □ 'Require email verification'");
  console.log("   □ 'Email confirmation'");
  console.log("   □ 'Double opt-in'");

  console.log("\n💡 DICA IMPORTANTE:");
  console.log("   Se você não encontrar essas opções nas configurações,");
  console.log("   pode ser que sua versão do Supabase tenha o email");
  console.log("   confirmation desabilitado por padrão.");
  console.log("   ");
  console.log("   Nesse caso, você pode forçar o comportamento via código:");
  console.log("   - Usar signInWithOtp() em vez de signUp()");
  console.log("   - Implementar verificação customizada");
}

async function runDiagnosis() {
  await diagnoseEmailSettings();
  await checkSpecificSettings();
}

runDiagnosis();
