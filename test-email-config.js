/**
 * Script de teste para verificar configuração de e-mail do Supabase
 * Execute: node test-email-config.js
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailConfiguration() {
  console.log("🔍 Testando configuração de e-mail do Supabase...\n");

  const testEmail = `test-professional-${Date.now()}@natangeneralservice.test`;

  try {
    console.log("📧 Enviando e-mail de teste para:", testEmail);
    console.log("🎯 Tipo: Cadastro de Profissional");
    console.log("⏳ Aguarde...\n");

    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail,
      options: {
        shouldCreateUser: true,
        data: {
          name: "Profissional Teste",
          role: "professional",
        },
      },
    });

    if (error) {
      console.error("❌ ERRO ao enviar e-mail:");
      console.error("   Mensagem:", error.message);
      console.error("   Status:", error.status);
      console.log("\n📋 Possíveis causas:");
      console.log("   1. Email confirmation desabilitado no Supabase");
      console.log("   2. SMTP não configurado");
      console.log("   3. Rate limit atingido");
      console.log("\n🔧 Como verificar:");
      console.log("   1. Acesse: https://supabase.com/dashboard/project/uqrvenlkquheajuveggv");
      console.log("   2. Vá em: Authentication > Email Templates");
      console.log("   3. Verifique: Settings > Authentication > Email Settings");
      console.log("   4. Confirme que 'Enable email confirmations' está ATIVO");
      return;
    }

    console.log("✅ E-MAIL ENVIADO COM SUCESSO!");
    console.log("\n📊 Detalhes:");
    console.log("   User ID:", data.user?.id || "Não criado ainda");
    console.log("   Email:", testEmail);
    console.log("   Session criada:", !!data.session);
    console.log("   Email confirmado:", !!data.user?.email_confirmed_at);

    if (!data.session && !data.user?.email_confirmed_at) {
      console.log("\n✅ CONFIGURAÇÃO CORRETA!");
      console.log("   → Email confirmation está HABILITADO");
      console.log("   → E-mail de verificação foi enviado");
      console.log("   → Sistema funcionando conforme esperado");
      console.log("\n📧 IMPORTANTE:");
      console.log("   Para testar com e-mail real, use:");
      console.log("   - Gmail, Outlook ou outro provedor real");
      console.log("   - Verifique a pasta de spam");
      console.log("   - Aguarde até 2 minutos");
    } else if (data.session || data.user?.email_confirmed_at) {
      console.log("\n⚠️ ATENÇÃO: Confirmação automática detectada!");
      console.log("   → Email confirmation pode estar DESABILITADO");
      console.log("   → Usuários não precisam confirmar e-mail");
      console.log("\n🔧 Para corrigir:");
      console.log("   1. Acesse o dashboard do Supabase");
      console.log("   2. Settings > Authentication");
      console.log("   3. Habilite 'Enable email confirmations'");
    }

    // Cleanup
    await supabase.auth.signOut();
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

testEmailConfiguration();
