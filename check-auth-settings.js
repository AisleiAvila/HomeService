/**
 * Script para verificar configurações disponíveis via API
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthSettings() {
  console.log("🔍 Verificando configurações de autenticação...\n");

  // Teste 1: Verificar se podemos forçar confirmação via opções
  console.log("1. Testando signUp com opções de confirmação...");

  const testEmail1 = `force-confirm-${Date.now()}@example.com`;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail1,
      password: "TestPassword123!",
      options: {
        emailRedirectTo: "http://localhost:4200",
        data: {
          email_confirm: true,
        },
      },
    });

    console.log("Resultado com opções:", {
      session: !!data.session,
      confirmed: !!data.user?.email_confirmed_at,
      error: error?.message,
    });
  } catch (e) {
    console.log("Erro:", e.message);
  }

  // Teste 2: Verificar signInWithOtp
  console.log("\n2. Testando signInWithOtp (alternativa)...");

  const testEmail2 = `otp-${Date.now()}@example.com`;

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: testEmail2,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "http://localhost:4200",
      },
    });

    console.log("Resultado OTP:", {
      error: error?.message || "Sucesso - email deveria ser enviado",
    });
  } catch (e) {
    console.log("Erro OTP:", e.message);
  }

  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("   Por favor, verifique estas seções no Supabase:");
  console.log("   1. Authentication > Emails");
  console.log("   2. Authentication > Sign In / Providers");
  console.log("   3. Authentication > Advanced");
  console.log("   4. Authentication > URL Configuration");

  console.log("\n   E me informe quais opções você encontra em cada uma.");
}

checkAuthSettings();
