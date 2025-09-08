/**
 * Teste da nova implementação OTP para registro
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewOTPImplementation() {
  console.log("🚀 TESTANDO NOVA IMPLEMENTAÇÃO OTP\n");

  // Aguardar para evitar rate limit
  console.log("⏳ Aguardando para evitar rate limit...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  const testUser = {
    name: "Teste Nova Implementação",
    email: `nova-impl-${Date.now()}@homeservice.test`,
    password: "NovaImplementacao123!",
    role: "client",
  };

  console.log("👤 Dados do teste:");
  console.log("  Nome:", testUser.name);
  console.log("  Email:", testUser.email);
  console.log("  Role:", testUser.role);

  try {
    // Simular o novo fluxo: usar signInWithOtp
    console.log("\n📧 Passo 1: Enviando código OTP (novo método)...");

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: testUser.email,
      options: {
        shouldCreateUser: true,
        data: {
          name: testUser.name,
          role: testUser.role,
          password: testUser.password,
        },
      },
    });

    if (otpError) {
      if (otpError.message.includes("rate limit")) {
        console.log("⚠️ Rate limit ainda ativo. Aguarde mais alguns minutos.");
        return;
      }
      console.error("❌ Erro ao enviar OTP:", otpError.message);
      return;
    }

    console.log("✅ Código OTP enviado com sucesso!");

    console.log("\n📊 RESULTADO ESPERADO:");
    console.log("   ✅ Email enviado para:", testUser.email);
    console.log("   ✅ Usuário NÃO logado automaticamente");
    console.log("   ✅ Código de 6 dígitos no Mailtrap");
    console.log("   ✅ Usuário vai para tela de verificação");

    console.log("\n📧 VERIFICAR MAILTRAP:");
    console.log("   1. Acesse: https://mailtrap.io");
    console.log("   2. Vá para Email Sandbox");
    console.log("   3. Procure email com código OTP");
    console.log("   4. Horário:", new Date().toLocaleString());

    console.log("\n🎯 PRÓXIMOS PASSOS:");
    console.log("   1. Verifique se email chegou no Mailtrap");
    console.log("   2. Teste o registro na aplicação");
    console.log("   3. Insira o código na tela de verificação");
    console.log("   4. Confirme se usuário consegue acessar");

    // Verificar se foi criado algum registro na auth
    console.log("\n🔍 Verificando estado da autenticação...");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user) {
      console.log("⚠️ Usuário está logado (não deveria estar):");
      console.log("   ID:", user.id);
      console.log("   Email:", user.email);
      console.log("   Confirmado:", !!user.email_confirmed_at);
    } else {
      console.log("✅ Nenhum usuário logado (correto!)");
    }
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

async function compareMethods() {
  console.log("\n\n📋 COMPARAÇÃO DOS MÉTODOS\n");

  console.log("❌ MÉTODO ANTIGO (signUp):");
  console.log("   - Usuário automaticamente confirmado");
  console.log("   - Session criada imediatamente");
  console.log("   - NENHUM email enviado");
  console.log("   - Problema de configuração do Supabase");

  console.log("\n✅ MÉTODO NOVO (signInWithOtp):");
  console.log("   - Email SEMPRE enviado");
  console.log("   - Usuário deve inserir código");
  console.log("   - Perfil criado após verificação");
  console.log("   - Independe da configuração do Supabase");

  console.log("\n🔧 VANTAGENS DA NOVA IMPLEMENTAÇÃO:");
  console.log("   ✅ Funciona independente das configurações");
  console.log("   ✅ Sempre envia email de confirmação");
  console.log("   ✅ Melhor segurança");
  console.log("   ✅ Experiência consistente");

  console.log("\n📱 FLUXO ATUALIZADO:");
  console.log("   1. Usuário preenche formulário");
  console.log("   2. Sistema envia código OTP");
  console.log("   3. Usuário vai para tela de verificação");
  console.log("   4. Insere código recebido por email");
  console.log("   5. Sistema cria perfil completo");
  console.log("   6. Usuário acessa aplicação");
}

async function runTest() {
  await testNewOTPImplementation();
  await compareMethods();
}

runTest();
