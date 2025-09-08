/**
 * Script para debugar o problema de email de confirmação
 */

import { createClient } from "@supabase/supabase-js";

// Configurações do Supabase
const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRegistration() {
  console.log("🔍 Debugando fluxo de registro...\n");

  // Primeiro, vamos verificar a configuração atual
  console.log("1. Verificando configuração do Supabase...");

  const testEmail = `debug-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  const testName = "Usuário Debug";

  try {
    // Simular exatamente o que o AuthService faz
    console.log("2. Executando signUp...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: testEmail,
        password: testPassword,
      }
    );

    if (signUpError) {
      console.error("❌ Erro no signUp:", signUpError);
      return;
    }

    console.log("✅ SignUp bem-sucedido!");
    console.log("📊 Dados do usuário criado:");
    console.log("  - ID:", signUpData.user?.id);
    console.log("  - Email:", signUpData.user?.email);
    console.log("  - Email confirmado:", signUpData.user?.email_confirmed_at);
    console.log("  - Session criada:", !!signUpData.session);

    // Verificar se o usuário foi automaticamente confirmado
    if (signUpData.user?.email_confirmed_at) {
      console.log(
        "⚠️  PROBLEMA IDENTIFICADO: Usuário foi automaticamente confirmado!"
      );
      console.log(
        "   O Supabase está configurado para confirmar emails automaticamente."
      );
      console.log("   Isso explica por que não há email sendo enviado.");
    } else {
      console.log(
        "✅ Usuário criado sem confirmação automática - email deveria ser enviado"
      );
    }

    // Tentar criar o perfil na tabela users (como o AuthService faz)
    console.log("\n3. Criando perfil na tabela users...");
    const { error: insertError } = await supabase.from("users").insert({
      auth_id: signUpData.user.id,
      name: testName,
      email: testEmail,
      role: "client",
      status: "Active",
      avatar_url: `https://i.pravatar.cc/150?u=${signUpData.user.id}`,
      email_verified: false,
    });

    if (insertError) {
      console.error("❌ Erro ao criar perfil:", insertError);

      // Se erro de constraint, tentar update
      if (
        insertError.message.includes("duplicate key") ||
        insertError.message.includes("already exists")
      ) {
        console.log("⚠️  Usuário já existe, tentando update...");
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: testName,
            role: "client",
            status: "Active",
            email_verified: false,
          })
          .eq("auth_id", signUpData.user.id);

        if (updateError) {
          console.error("❌ Erro no update:", updateError);
        } else {
          console.log("✅ Perfil atualizado com sucesso");
        }
      }
    } else {
      console.log("✅ Perfil criado com sucesso");
    }

    // Fazer logout como o AuthService faz
    console.log("\n4. Fazendo logout...");
    await supabase.auth.signOut();
    console.log("✅ Logout executado");

    // Verificar configurações de auth
    console.log("\n5. Verificando configurações de autenticação...");
    console.log("   Para verificar se email confirmation está habilitado:");
    console.log("   1. Acesse o painel do Supabase");
    console.log("   2. Vá para Authentication > Settings");
    console.log("   3. Verifique se 'Enable email confirmations' está marcado");
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

async function checkEmailConfirmationSettings() {
  console.log("\n🔧 Verificando se há problemas de configuração...");

  // Tentar registrar um usuário e ver se recebe session imediatamente
  const testEmail = `config-test-${Date.now()}@example.com`;

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: "TestPassword123!",
  });

  if (error) {
    console.error("❌ Erro no teste:", error);
    return;
  }

  if (data.session) {
    console.log("❌ PROBLEMA CONFIRMADO:");
    console.log(
      "   O usuário recebeu uma session imediatamente após o registro"
    );
    console.log("   Isso significa que email confirmation está DESABILITADO");
    console.log("   ");
    console.log("🔧 SOLUÇÃO DETALHADA:");
    console.log("   1. Acesse https://supabase.com");
    console.log("   2. Entre no projeto HomeService");
    console.log("   3. Vá para Authentication > Settings");
    console.log("   4. Procure por uma das seguintes seções:");
    console.log("      - 'Email Confirmations'");
    console.log("      - 'User Verification'");
    console.log("      - 'Signup Settings'");
    console.log("   5. Marque a opção:");
    console.log("      ✅ 'Enable email confirmations' ou");
    console.log("      ✅ 'Require email confirmation for sign up' ou");
    console.log("      ✅ 'Confirm email before sign up'");
    console.log("   6. Salve as configurações");
    console.log("   ");
    console.log("   💡 Se não encontrar essas opções, verifique também em:");
    console.log("      - Authentication > Settings > Email");
    console.log("      - Authentication > URL Configuration");
  } else {
    console.log("✅ Email confirmation está habilitado");
    console.log("   O usuário NÃO recebeu session imediatamente");
    console.log("   Um email de confirmação deveria ter sido enviado");
  }

  // Limpar o usuário de teste
  await supabase.auth.signOut();
}

// Executar ambos os testes
async function runDebug() {
  await debugRegistration();
  await checkEmailConfirmationSettings();
}

runDebug().catch(console.error);
