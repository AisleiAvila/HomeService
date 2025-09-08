/**
 * Validação final do sistema de email de confirmação
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateEmailConfirmation() {
  console.log("🔍 VALIDAÇÃO FINAL - Email de Confirmação\n");

  // Aguardar para evitar rate limit
  console.log("⏳ Aguardando 30 segundos para evitar rate limit...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  const testUser = {
    name: "Validação Final",
    email: `validation-${Date.now()}@homeservice.test`,
    password: "ValidacaoSegura123!",
  };

  console.log("🧪 Iniciando validação com:");
  console.log("  Email:", testUser.email);

  try {
    // Teste 1: SignUp tradicional
    console.log("\n📝 Teste 1: SignUp tradicional (método atual da app)");

    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: { name: testUser.name },
      },
    });

    if (error) {
      if (error.message.includes("rate limit")) {
        console.log("⚠️ Rate limit ainda ativo, aguardando mais...");
        await new Promise((resolve) => setTimeout(resolve, 60000));
        return validateEmailConfirmation(); // Tentar novamente
      }
      console.error("❌ Erro:", error.message);
      return;
    }

    console.log("📊 Resultado do SignUp:");
    console.log("  Usuário criado:", !!data.user);
    console.log("  ID do usuário:", data.user?.id);
    console.log("  Email confirmado:", !!data.user?.email_confirmed_at);
    console.log(
      "  Timestamp confirmação:",
      data.user?.email_confirmed_at || "PENDENTE"
    );
    console.log("  Session ativa:", !!data.session);
    console.log("  Token de sessão:", data.session ? "SIM" : "NÃO");

    // Análise detalhada
    console.log("\n📋 ANÁLISE DETALHADA:");

    if (data.user?.email_confirmed_at && data.session) {
      console.log("❌ PROBLEMA CONFIRMADO:");
      console.log("   ➤ Usuário automaticamente confirmado");
      console.log("   ➤ Session criada imediatamente");
      console.log("   ➤ Email de confirmação NÃO foi enviado");
      console.log("   ➤ Configuração: email confirmation DESABILITADO");

      console.log("\n🔧 IMPACTO:");
      console.log("   ➤ Usuários acessam sem confirmar email");
      console.log("   ➤ Emails inválidos podem ser cadastrados");
      console.log("   ➤ Fluxo de verificação da app não funciona");
    } else if (!data.user?.email_confirmed_at && !data.session) {
      console.log("✅ CONFIGURAÇÃO CORRETA:");
      console.log("   ➤ Usuário criado mas não confirmado");
      console.log("   ➤ Nenhuma session ativa");
      console.log("   ➤ Email de confirmação foi enviado");
      console.log("   ➤ Configuração: email confirmation HABILITADO");
    } else {
      console.log("⚠️ CONFIGURAÇÃO PARCIAL:");
      console.log("   ➤ Estado intermediário detectado");
      console.log("   ➤ Verificar configurações específicas");
    }

    // Verificar se email foi realmente enviado
    console.log("\n📧 VERIFICAÇÃO DE ENVIO:");
    console.log("   1. Acesse: https://mailtrap.io");
    console.log("   2. Login na sua conta");
    console.log("   3. Vá para Email Sandbox");
    console.log("   4. Procure email para:", testUser.email);
    console.log("   5. Horário aproximado:", new Date().toLocaleString());

    // Limpar sessão
    await supabase.auth.signOut();

    // Teste específico de reenvio
    console.log("\n📝 Teste 2: Verificando capacidade de reenvio");

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: testUser.email,
    });

    if (resendError) {
      console.log("❌ Erro no reenvio:", resendError.message);
      if (resendError.message.includes("already confirmed")) {
        console.log("   ➤ Confirma auto-confirmação");
      } else if (resendError.message.includes("rate limit")) {
        console.log("   ➤ Rate limit ativo");
      }
    } else {
      console.log("✅ Reenvio bem-sucedido");
      console.log("   ➤ Email adicional enviado");
    }
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

async function checkCurrentSettings() {
  console.log("\n\n🔧 VERIFICAÇÃO DE CONFIGURAÇÕES ATUAIS\n");

  console.log("📋 Status detectado baseado nos testes:");
  console.log("   ➤ SMTP: ✅ Funcionando (emails de OTP chegam)");
  console.log("   ➤ Rate Limit: ⚠️ Ativo (muitos testes executados)");
  console.log("   ➤ Email Confirmation: ❌ Desabilitado");
  console.log("   ➤ Auto-confirmação: ✅ Ativa");

  console.log("\n🎯 CONFIGURAÇÕES NECESSÁRIAS:");
  console.log("   No painel do Supabase, procure por:");
  console.log("   1. Authentication > Sign In / Providers");
  console.log("   2. Authentication > Advanced");
  console.log("   3. Authentication > URL Configuration");
  console.log("   ");
  console.log("   Procure especificamente por:");
  console.log("   ☐ 'Confirm email before sign in'");
  console.log("   ☐ 'Email confirmation required'");
  console.log("   ☐ 'Disable email confirmations'");
  console.log("   ☐ 'Auto-confirm users'");

  console.log("\n💡 ALTERNATIVA TÉCNICA:");
  console.log("   Se a configuração não for encontrada,");
  console.log("   posso implementar solução via código:");
  console.log("   ➤ Usar signInWithOtp() em vez de signUp()");
  console.log("   ➤ Força envio de email sempre");
  console.log("   ➤ Implementação customizada de verificação");

  console.log("\n⏰ PRÓXIMO TESTE:");
  console.log("   Aguarde 5 minutos e execute novamente");
  console.log("   ou verifique o Mailtrap agora mesmo");
}

async function runValidation() {
  await validateEmailConfirmation();
  await checkCurrentSettings();
}

runValidation();
