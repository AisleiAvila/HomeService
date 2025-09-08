/**
 * Teste específico para confirmação de email de profissionais
 * Execute este script no terminal do projeto
 */

import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase (substitua pelas suas credenciais)
const supabaseUrl = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProfessionalEmailConfirmation() {
  console.log("🧪 TESTE: Confirmação de Email para Profissionais\n");

  const testEmail = `profissional-teste-${Date.now()}@teste.com`;
  const testPassword = "TesteSeguro123!";

  try {
    console.log("📝 Passo 1: Registrando profissional...");
    console.log("  Email:", testEmail);

    // Simular registro via OTP (como a aplicação faz)
    const { data: signUpData, error: signUpError } =
      await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          shouldCreateUser: true,
          data: {
            name: "Profissional Teste",
            role: "professional",
            password: testPassword,
          },
        },
      });

    if (signUpError) {
      console.error("❌ Erro no registro:", signUpError.message);
      return;
    }

    console.log("✅ Email de confirmação enviado");
    console.log("📧 Verifique o Mailtrap para o código OTP");

    console.log("\n📝 Passo 2: Para testar o link de confirmação:");
    console.log("  1. Acesse o Mailtrap");
    console.log("  2. Encontre o email para:", testEmail);
    console.log("  3. Clique no link de confirmação");
    console.log("  4. Execute: testUserAfterConfirmation()");

    // Disponibilizar função para testar após confirmação
    global.testUserAfterConfirmation = async () => {
      console.log("\n🔍 Verificando usuário após confirmação...");

      // Verificar se existe usuário autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log("❌ Usuário não autenticado. Tentando login...");

        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

        if (loginError) {
          console.error("❌ Erro no login:", loginError.message);
          return;
        }

        console.log("✅ Login bem-sucedido");
      }

      // Verificar dados na tabela users
      const { data: userData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("email", testEmail)
        .single();

      if (profileError) {
        console.error("❌ Erro ao buscar perfil:", profileError.message);
        console.log(
          "💡 Isso pode indicar que o perfil não foi criado corretamente"
        );
        return;
      }

      console.log("\n📊 RESULTADO DO TESTE:");
      console.log("  - Nome:", userData.name);
      console.log("  - Email:", userData.email);
      console.log("  - Role:", userData.role);
      console.log("  - Status:", userData.status);
      console.log("  - Email verificado:", userData.email_verified);

      if (userData.email_verified) {
        console.log("\n✅ TESTE PASSOU!");
        console.log("   Campo email_verified foi atualizado corretamente");
      } else {
        console.log("\n❌ TESTE FALHOU!");
        console.log("   Campo email_verified ainda é false");
        console.log("   A correção pode não estar funcionando");
      }

      // Limpar usuário de teste
      console.log("\n🧹 Limpando dados de teste...");
      await supabase.auth.signOut();

      // Opcionalmente, remover da tabela users (descomente se necessário)
      // await supabase.from('users').delete().eq('email', testEmail);
    };

    console.log("\n💡 PRÓXIMOS PASSOS:");
    console.log("  1. Confirme o email via link no Mailtrap");
    console.log("  2. Execute: testUserAfterConfirmation()");
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

// Função para testar usuário existente
async function testExistingUser(email) {
  console.log("🔍 Testando usuário existente:", email);

  try {
    // Verificar dados na tabela users
    const { data: userData, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (profileError) {
      console.error("❌ Usuário não encontrado:", profileError.message);
      return;
    }

    console.log("\n📊 DADOS ATUAIS:");
    console.log("  - Nome:", userData.name);
    console.log("  - Email:", userData.email);
    console.log("  - Role:", userData.role);
    console.log("  - Status:", userData.status);
    console.log("  - Email verificado:", userData.email_verified);

    // Verificar se usuário está autenticado no Supabase
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (user && user.email === email) {
      console.log("\n📧 DADOS DO SUPABASE AUTH:");
      console.log("  - Email confirmado:", !!user.email_confirmed_at);
      console.log("  - Data confirmação:", user.email_confirmed_at);

      if (user.email_confirmed_at && !userData.email_verified) {
        console.log("\n🔧 CORRIGINDO campo email_verified...");

        const { error: updateError } = await supabase
          .from("users")
          .update({ email_verified: true })
          .eq("email", email);

        if (updateError) {
          console.error("❌ Erro ao atualizar:", updateError.message);
        } else {
          console.log("✅ Campo email_verified atualizado para true");
        }
      }
    } else {
      console.log("❌ Usuário não está autenticado no Supabase Auth");
    }
  } catch (error) {
    console.error("❌ Erro:", error);
  }
}

// Disponibilizar funções globalmente
global.testProfessionalEmailConfirmation = testProfessionalEmailConfirmation;
global.testExistingUser = testExistingUser;

console.log("🔧 FUNÇÕES DE TESTE DISPONÍVEIS:");
console.log(
  "  - testProfessionalEmailConfirmation() - Testar com novo usuário"
);
console.log(
  "  - testExistingUser('email@exemplo.com') - Testar usuário existente"
);
console.log("  - testUserAfterConfirmation() - Executar após confirmar email");

// Executar teste principal
testProfessionalEmailConfirmation();
