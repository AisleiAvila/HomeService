/**
 * Teste específico para confirmação de registro como na aplicação
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegistrationEmail() {
  console.log("🎯 Teste de Email de Confirmação de Registro\n");

  const testUser = {
    name: "Usuário Teste",
    email: `test-registro-${Date.now()}@example.com`,
    password: "SenhaSegura123!",
  };

  console.log("👤 Dados do teste:");
  console.log("  Nome:", testUser.name);
  console.log("  Email:", testUser.email);
  console.log("  Senha:", testUser.password);

  try {
    // Passo 1: Registrar usuário (como AuthService.register faz)
    console.log("\n📝 Passo 1: Executando signUp...");

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: testUser.email,
        password: testUser.password,
        options: {
          data: {
            name: testUser.name,
          },
        },
      }
    );

    if (signUpError) {
      console.error("❌ Erro no signUp:", signUpError.message);
      return;
    }

    console.log("✅ SignUp executado com sucesso");
    console.log("📊 Detalhes do usuário criado:");
    console.log("  ID:", signUpData.user?.id);
    console.log("  Email:", signUpData.user?.email);
    console.log(
      "  Email confirmado:",
      signUpData.user?.email_confirmed_at || "NÃO"
    );
    console.log("  Session ativa:", !!signUpData.session);

    // Passo 2: Criar perfil na tabela users (como AuthService faz)
    console.log("\n📝 Passo 2: Criando perfil na tabela users...");

    const { error: insertError } = await supabase.from("users").insert({
      auth_id: signUpData.user.id,
      name: testUser.name,
      email: testUser.email,
      role: "client",
      status: "Active",
      avatar_url: `https://i.pravatar.cc/150?u=${signUpData.user.id}`,
      email_verified: false,
    });

    if (insertError) {
      if (insertError.message.includes("duplicate key")) {
        console.log("⚠️  Usuário já existe na tabela, atualizando...");

        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: testUser.name,
            email_verified: false,
          })
          .eq("auth_id", signUpData.user.id);

        if (updateError) {
          console.error("❌ Erro no update:", updateError);
        } else {
          console.log("✅ Perfil atualizado");
        }
      } else {
        console.error("❌ Erro ao criar perfil:", insertError.message);
      }
    } else {
      console.log("✅ Perfil criado na tabela users");
    }

    // Passo 3: Fazer logout (como AuthService faz)
    console.log("\n📝 Passo 3: Fazendo logout...");
    await supabase.auth.signOut();
    console.log("✅ Logout executado");

    // Análise do resultado
    console.log("\n📊 ANÁLISE DO RESULTADO:");

    if (signUpData.user?.email_confirmed_at) {
      console.log("❌ PROBLEMA: Usuário foi automaticamente confirmado");
      console.log("   O Supabase não está enviando email de confirmação");
      console.log("   Configuração 'email confirmation' está DESABILITADA");
    } else if (signUpData.session) {
      console.log("⚠️  PARCIAL: Usuário tem session mas email não confirmado");
      console.log("   Pode ser configuração intermediária");
    } else {
      console.log("✅ IDEAL: Usuário criado sem session e sem confirmação");
      console.log("   Email de confirmação deveria ter sido enviado");
    }

    // Passo 4: Testar reenvio
    console.log("\n📝 Passo 4: Testando reenvio de email...");

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: testUser.email,
    });

    if (resendError) {
      console.log("❌ Erro no reenvio:", resendError.message);
      if (resendError.message.includes("already confirmed")) {
        console.log(
          "   Confirma que usuário já foi confirmado automaticamente"
        );
      }
    } else {
      console.log("✅ Reenvio funcionou - email deveria ser enviado");
    }

    // Instruções finais
    console.log("\n📧 VERIFICAR EMAIL:");
    console.log("1. Acesse https://mailtrap.io");
    console.log("2. Vá para Email Sandbox");
    console.log("3. Procure por emails enviados para:", testUser.email);
    console.log("4. Deve haver email de confirmação com código ou link");
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

async function testOTPMethod() {
  console.log("\n\n🔄 Teste Alternativo: Método OTP\n");

  const testEmail = `otp-${Date.now()}@example.com`;

  console.log("📧 Testando signInWithOtp (método alternativo)...");
  console.log("  Email:", testEmail);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        shouldCreateUser: true,
        data: {
          name: "Teste OTP",
        },
      },
    });

    if (error) {
      console.log("❌ Erro OTP:", error.message);
    } else {
      console.log("✅ OTP enviado com sucesso!");
      console.log("📧 Verifique o Mailtrap para o código OTP");
      console.log("💡 Este método SEMPRE envia email de confirmação");
    }
  } catch (error) {
    console.error("❌ Erro no teste OTP:", error);
  }
}

async function runAllRegistrationTests() {
  await testRegistrationEmail();
  await testOTPMethod();

  console.log("\n\n🎯 RESUMO:");
  console.log("- Teste 1: Simula o fluxo atual da aplicação");
  console.log("- Teste 2: Mostra método alternativo que sempre funciona");
  console.log("- Verifique o Mailtrap para ver quais emails foram enviados");
}

runAllRegistrationTests();
