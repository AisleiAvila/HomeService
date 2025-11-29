/**
 * Script para verificar usuário criado e status de confirmação
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserStatus() {
  console.log("🔍 Verificando status do usuário criado...\n");

  const email = "aisleiavilademedeiros@gmail.com";

  try {
    // Verificar se usuário existe na tabela users
    console.log("📋 Buscando usuário na tabela 'users'...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (usersError) {
      console.error("❌ Erro ao buscar usuário:", usersError.message);
    } else if (users && users.length > 0) {
      console.log("✅ Usuário encontrado na tabela 'users':");
      console.log("   ID:", users[0].id);
      console.log("   Nome:", users[0].name);
      console.log("   E-mail:", users[0].email);
      console.log("   Role:", users[0].role);
      console.log("   Status:", users[0].status);
      console.log("   Email Verificado:", users[0].email_verified);
      console.log("\n");

      console.log("ℹ️  Informação:");
      console.log("   A aplicação não usa mais Supabase Auth");
      console.log("   Autenticação é gerenciada pelo backend customizado");
    } else {
      console.log("❌ Usuário não encontrado na tabela 'users'");
      console.log("⚠️  Isso significa que o OTP foi enviado mas o perfil");
      console.log("   ainda não foi criado (aguardando verificação)");
    }

    console.log("\n📧 Status do E-mail:");
    console.log("   Se o e-mail NÃO chegou, possíveis causas:");
    console.log("   1. SMTP não configurado no Supabase");
    console.log("   2. E-mail foi para SPAM");
    console.log("   3. Auto-confirm habilitado (usuário criado sem código)");
    console.log("   4. Provedor de e-mail bloqueou");

    console.log("\n🔧 Próximas ações:");
    console.log(
      "   1. Verifique SPAM na caixa de entrada de: " + email
    );
    console.log(
      "   2. Acesse o dashboard do Supabase para verificar configurações"
    );
    console.log("   3. Configure SMTP seguindo o guia: CONFIGURAR_EMAIL_SUPABASE.md");
    console.log("   4. Teste com Mailtrap para desenvolvimento");
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

await checkUserStatus();
