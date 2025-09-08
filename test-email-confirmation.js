/**
 * Script para testar se email confirmation foi habilitado
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailConfirmationEnabled() {
  console.log("🧪 Testando se email confirmation foi habilitado...\n");

  const testEmail = `confirmation-test-${Date.now()}@example.com`;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: "TestPassword123!",
    });

    if (error) {
      console.error("❌ Erro:", error.message);
      return;
    }

    console.log("📊 Resultado do teste:");
    console.log("  - Usuário criado:", !!data.user);
    console.log("  - Email confirmado:", !!data.user?.email_confirmed_at);
    console.log("  - Session criada:", !!data.session);

    if (!data.session && !data.user?.email_confirmed_at) {
      console.log("\n✅ SUCESSO!");
      console.log("   Email confirmation está HABILITADO");
      console.log("   O usuário precisa confirmar o email antes de acessar");
      console.log("   📧 Verifique o Mailtrap para o email de confirmação");
    } else {
      console.log("\n❌ AINDA NÃO CORRIGIDO!");
      console.log("   Email confirmation ainda está DESABILITADO");
      console.log("   Verifique se você salvou as configurações no Supabase");
    }

    // Limpar usuário de teste
    await supabase.auth.signOut();
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

testEmailConfirmationEnabled();
