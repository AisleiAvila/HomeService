/**
 * Teste rápido para verificar se email confirmation foi habilitado
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickTest() {
  console.log("🧪 Teste rápido após alteração...\n");

  const testEmail = `quick-test-${Date.now()}@example.com`;

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: "TestPassword123!",
  });

  if (error) {
    console.error("❌ Erro:", error.message);
    return;
  }

  console.log("📊 Resultado:");
  console.log("  Session criada:", !!data.session);
  console.log("  Email confirmado:", !!data.user?.email_confirmed_at);

  if (!data.session && !data.user?.email_confirmed_at) {
    console.log("\n✅ SUCESSO! Email confirmation está habilitado!");
    console.log(
      "📧 Verifique o Mailtrap para confirmar que o email foi enviado"
    );
  } else {
    console.log("\n❌ Ainda não funcionou. Tente outras configurações.");
  }

  await supabase.auth.signOut();
}

quickTest();
