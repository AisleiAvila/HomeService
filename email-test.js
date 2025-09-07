/**
 * Script de teste para validar configuração de e-mail
 * Este arquivo pode ser usado para testar se os e-mails estão sendo enviados corretamente
 */

import { createClient } from "@supabase/supabase-js";

// Configurações do Supabase
const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Testa o envio de e-mail de registro
 */
async function testSignUpEmail() {
  console.log("🧪 Testando e-mail de registro...");

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: "Usuário Teste",
        },
      },
    });

    if (error) {
      console.error("❌ Erro no registro:", error.message);
      return false;
    }

    console.log("✅ E-mail de registro enviado para:", testEmail);
    console.log("📧 Verifique o Mailtrap para o e-mail de confirmação");
    return true;
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
    return false;
  }
}

/**
 * Testa o envio de e-mail de recuperação de senha
 */
async function testPasswordResetEmail() {
  console.log("🧪 Testando e-mail de recuperação de senha...");

  const testEmail = "admin@homeservice.com"; // Use um e-mail existente

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: "http://localhost:4200/reset-password",
    });

    if (error) {
      console.error("❌ Erro na recuperação:", error.message);
      return false;
    }

    console.log("✅ E-mail de recuperação enviado para:", testEmail);
    console.log("📧 Verifique o Mailtrap para o e-mail de recuperação");
    return true;
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
    return false;
  }
}

/**
 * Testa o envio de OTP por e-mail
 */
async function testOTPEmail() {
  console.log("🧪 Testando envio de OTP por e-mail...");

  const testEmail = `otp-test-${Date.now()}@example.com`;

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
      console.error("❌ Erro no OTP:", error.message);
      return false;
    }

    console.log("✅ E-mail OTP enviado para:", testEmail);
    console.log("📧 Verifique o Mailtrap para o código OTP");
    return true;
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
    return false;
  }
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log("🚀 Iniciando testes de configuração de e-mail...\n");

  const tests = [
    { name: "Registro", fn: testSignUpEmail },
    { name: "Recuperação de Senha", fn: testPasswordResetEmail },
    { name: "OTP por E-mail", fn: testOTPEmail },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n--- Teste: ${test.name} ---`);
    const result = await test.fn();
    results.push({ name: test.name, success: result });

    // Aguarda um pouco entre os testes
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n📊 Resultados dos Testes:");
  console.log("========================");

  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
  });

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n${successCount}/${results.length} testes passaram`);

  if (successCount === results.length) {
    console.log(
      "\n🎉 Todos os testes passaram! A configuração de e-mail está funcionando."
    );
  } else {
    console.log(
      "\n⚠️  Alguns testes falharam. Verifique a configuração do SMTP no Supabase."
    );
  }

  console.log("\n💡 Instruções:");
  console.log("1. Acesse https://mailtrap.io");
  console.log("2. Vá para Email Sandbox");
  console.log("3. Verifique se os e-mails foram recebidos");
}

// Executa os testes se o arquivo for executado diretamente
if (typeof window === "undefined") {
  // Node.js environment
  runAllTests().catch(console.error);
}

// Exporta as funções para uso em outros lugares
export { testSignUpEmail, testPasswordResetEmail, testOTPEmail, runAllTests };
