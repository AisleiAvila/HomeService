/**
 * Script para diagnosticar e corrigir problema de confirmação de email para profissionais
 * Execute no console do navegador na aplicação
 */

import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugEmailConfirmation() {
  console.log("🔍 DIAGNÓSTICO: Confirmação de Email para Profissionais\n");

  try {
    // Verificar usuário atual autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("❌ Erro ao obter usuário:", userError);
      return;
    }

    if (!user) {
      console.log("❌ Nenhum usuário autenticado");
      console.log("👉 Para testar:");
      console.log("   1. Registre um profissional");
      console.log("   2. Clique no link do email");
      console.log("   3. Execute este script novamente");
      return;
    }

    console.log("📊 DADOS DO USUÁRIO AUTENTICADO:");
    console.log("  - ID:", user.id);
    console.log("  - Email:", user.email);
    console.log("  - Email confirmado no Supabase:", !!user.email_confirmed_at);
    console.log("  - Data de confirmação:", user.email_confirmed_at);

    // Verificar dados na tabela users personalizada
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        console.log("\n❌ PROBLEMA IDENTIFICADO:");
        console.log("   Usuário não tem perfil na tabela 'users'");
        console.log("   Isso pode acontecer quando:");
        console.log("   1. Usuário confirma email via link (não via OTP)");
        console.log("   2. Dados temporários foram perdidos");
        console.log("   3. Erro durante criação do perfil");

        console.log("\n🔧 TENTANDO CORRIGIR...");
        await createMissingProfile(user);
        return;
      } else {
        console.error("❌ Erro ao buscar perfil:", profileError);
        return;
      }
    }

    console.log("\n📊 DADOS DO PERFIL NA TABELA USERS:");
    console.log("  - ID:", userData.id);
    console.log("  - Nome:", userData.name);
    console.log("  - Email:", userData.email);
    console.log("  - Role:", userData.role);
    console.log("  - Status:", userData.status);
    console.log("  - Email verificado:", userData.email_verified);

    // Análise do problema
    if (user.email_confirmed_at && !userData.email_verified) {
      console.log("\n❌ PROBLEMA CONFIRMADO:");
      console.log("   ✅ Email confirmado no Supabase (auth.users)");
      console.log("   ❌ Email NÃO verificado na tabela personalizada (users)");
      console.log("\n💡 CAUSA PROVÁVEL:");
      console.log(
        "   Usuário confirmou email via link, mas sistema não atualizou"
      );
      console.log("   o campo 'email_verified' na tabela 'users'");

      console.log("\n🔧 TENTANDO CORRIGIR...");
      await fixEmailVerification(user.id, userData);
    } else if (!user.email_confirmed_at) {
      console.log("\n⚠️ Email ainda não confirmado no Supabase");
      console.log("   Usuário precisa clicar no link do email");
    } else if (userData.email_verified) {
      console.log("\n✅ TUDO OK:");
      console.log(
        "   Email confirmado tanto no Supabase quanto na tabela users"
      );
    }
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

async function createMissingProfile(user) {
  console.log("📝 Criando perfil faltante para usuário:", user.email);

  try {
    // Verificar se há dados temporários
    const tempData = localStorage.getItem("tempUserData");
    let profileData;

    if (tempData) {
      const tempUserData = JSON.parse(tempData);
      console.log("📦 Dados temporários encontrados:", tempUserData);

      profileData = {
        auth_id: user.id,
        name: tempUserData.name,
        email: tempUserData.email || user.email,
        role: tempUserData.role,
        status: tempUserData.role === "professional" ? "Pending" : "Active",
        avatar_url: `https://i.pravatar.cc/150?u=${user.id}`,
        email_verified: true,
      };

      // Limpar dados temporários
      localStorage.removeItem("tempUserData");
    } else {
      console.log(
        "📦 Dados temporários não encontrados, usando valores padrão"
      );

      profileData = {
        auth_id: user.id,
        name: user.user_metadata?.name || "Usuário",
        email: user.email,
        role: user.user_metadata?.role || "client",
        status:
          user.user_metadata?.role === "professional" ? "Pending" : "Active",
        avatar_url: `https://i.pravatar.cc/150?u=${user.id}`,
        email_verified: true,
      };
    }

    console.log("📝 Criando perfil com dados:", profileData);

    const { data, error } = await supabase
      .from("users")
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao criar perfil:", error);
    } else {
      console.log("✅ Perfil criado com sucesso:", data);
      console.log("\n🎉 PROBLEMA RESOLVIDO!");
      console.log("   Usuário agora pode acessar a aplicação normalmente");
    }
  } catch (error) {
    console.error("❌ Erro ao criar perfil:", error);
  }
}

async function fixEmailVerification(authId, userData) {
  try {
    const { data, error } = await supabase
      .from("users")
      .update({ email_verified: true })
      .eq("auth_id", authId)
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao atualizar email_verified:", error);
    } else {
      console.log("✅ Campo email_verified atualizado com sucesso");
      console.log("✅ Dados atualizados:", data);
      console.log("\n🎉 PROBLEMA RESOLVIDO!");
      console.log("   Usuário agora pode acessar a aplicação normalmente");
      console.log("   Recarregue a página para ver as mudanças");
    }
  } catch (error) {
    console.error("❌ Erro ao corrigir verificação:", error);
  }
}

// Executar diagnóstico
debugEmailConfirmation();

// Também disponibilizar funções globalmente para uso manual
window.debugEmailConfirmation = debugEmailConfirmation;
window.fixEmailVerification = fixEmailVerification;

console.log("🔧 FUNÇÕES DISPONÍVEIS:");
console.log("  - debugEmailConfirmation() - Executar diagnóstico completo");
console.log(
  "  - fixEmailVerification(authId, userData) - Corrigir manualmente"
);
