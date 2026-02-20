// diagnose-email-flow.cjs
// Script completo de diagnóstico do fluxo de e-mail de reset de senha

require('dotenv').config({ path: './.env' });
const SibApiV3Sdk = require('sib-api-v3-sdk');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   DIAGNÓSTICO COMPLETO DO SISTEMA DE E-MAIL - Natan General Service  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ========== ETAPA 1: Verificar variáveis de ambiente ==========
console.log('📋 ETAPA 1: Verificando configurações de ambiente\n');

let hasErrors = false;

if (!BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY não encontrada no arquivo .env');
  hasErrors = true;
} else {
  console.log('✓ BREVO_API_KEY encontrada');
  console.log('  Comprimento:', BREVO_API_KEY.length, 'caracteres');
  console.log('  Primeiros 10 caracteres:', BREVO_API_KEY.substring(0, 10) + '...');
  
  // Verificar formato da chave
  if (BREVO_API_KEY.startsWith('xkeysib-')) {
    console.log('✓ Formato da chave parece correto (começa com xkeysib-)');
  } else {
    console.log('⚠️  ATENÇÃO: A chave não começa com "xkeysib-" - pode estar incorreta');
  }
}

if (!FROM_EMAIL) {
  console.error('❌ FROM_EMAIL não encontrada no arquivo .env');
  hasErrors = true;
} else {
  console.log('✓ FROM_EMAIL encontrada:', FROM_EMAIL);
  
  // Validar formato do e-mail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(FROM_EMAIL)) {
    console.log('✓ Formato do e-mail é válido');
  } else {
    console.log('❌ Formato do e-mail parece inválido');
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log('\n❌ Corrija os erros acima antes de continuar.\n');
  process.exit(1);
}

// ========== ETAPA 2: Testar conectividade com Brevo ==========
console.log('\n📡 ETAPA 2: Testando conectividade com Brevo API\n');

let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function testBrevoConnection() {
  try {
    // Tentar enviar um e-mail de teste
    const testEmail = FROM_EMAIL; // Enviar para o próprio remetente
    
    console.log('Enviando e-mail de teste para:', testEmail);
    console.log('Assunto: Teste de Reset de Senha - Natan General Service\n');
    
    const subject = 'Teste de Reset de Senha - Natan General Service';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #22c55e;">✅ Teste de E-mail - Natan General Service</h2>
        
        <p>Olá,</p>
        
        <p>Este é um e-mail de teste do sistema de reset de senha do Natan General Service.</p>
        
        <p>Você solicitou a redefinição de sua senha. Use o código abaixo:</p>
        
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0; color: #1e293b;">123456</h1>
        </div>
        
        <p><strong style="color: #dc2626;">Este código expira em 15 minutos.</strong></p>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
          Se você não solicitou esta redefinição, ignore este e-mail.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="color: #94a3b8; font-size: 12px;">
          <strong>Informações de diagnóstico:</strong><br>
          Data/Hora: ${new Date().toLocaleString('pt-BR')}<br>
          Servidor: Teste Local<br>
          Versão: 1.0.0
        </p>
      </div>
    `;

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = { name: "Natan General Service", email: FROM_EMAIL };
    sendSmtpEmail.to = [{ email: testEmail }];

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ E-mail enviado com sucesso!\n');
    console.log('📊 Detalhes da resposta:');
    console.log('  Status Code:', response.response?.statusCode || 'N/A');
    console.log('  Message ID:', response.body?.messageId || 'N/A');
    
    return true;
  } catch (error) {
    console.error('\n❌ ERRO ao enviar e-mail:\n');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    
    if (error.response) {
      console.error('\n📋 Detalhes do erro do Brevo:');
      console.error('  Status Code:', error.response.statusCode);
      console.error('  Body:', JSON.stringify(error.response.body, null, 2));
      
      // Interpretar erros comuns
      const statusCode = error.response.statusCode;
      const errors = error.response.body?.errors || [];
      
      console.log('\n🔍 Análise do erro:\n');
      
      if (statusCode === 401) {
        console.log('❌ Erro de Autenticação (401)');
        console.log('   Possíveis causas:');
        console.log('   • BREVO_API_KEY está incorreta ou expirada');
        console.log('   • A chave não tem permissões adequadas');
        console.log('\n   Solução:');
        console.log('   1. Acesse: https://app.brevo.com/settings/keys/api');
        console.log('   2. Gere uma nova API Key');
        console.log('   3. Atualize BREVO_API_KEY no arquivo .env');
      } else if (statusCode === 403) {
        console.log('❌ Acesso Negado (403)');
        console.log('   Possíveis causas:');
        console.log('   • Sender Email não verificado');
        console.log('   • Conta Brevo suspensa ou limitada');
        console.log('\n   Solução:');
        console.log('   1. Acesse: https://app.brevo.com/senders');
        console.log('   2. Verifique se', FROM_EMAIL, 'está verificado');
        console.log('   3. Se não, complete o processo de verificação');
      } else if (statusCode === 413) {
        console.log('⚠️  E-mail muito grande (413)');
        console.log('   Reduza o tamanho do conteúdo HTML');
      } else {
        console.log('❌ Erro desconhecido:', statusCode);
      }
      
      if (errors.length > 0) {
        console.log('\n📝 Erros específicos reportados pelo Brevo:');
        errors.forEach((err, index) => {
          console.log(`   ${index + 1}. ${err.message}`);
          if (err.field) console.log(`      Campo: ${err.field}`);
          if (err.help) console.log(`      Ajuda: ${err.help}`);
        });
      }
    }
    
    return false;
  }
}

// ========== ETAPA 3: Verificar configuração do servidor local ==========
async function checkLocalServer() {
  console.log('\n🖥️  ETAPA 3: Verificando servidor local de e-mail\n');
  
  try {
    const response = await fetch('http://localhost:4001/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: FROM_EMAIL,
        subject: 'Teste via servidor local',
        html: '<p>Teste de envio via servidor Express local</p>'
      })
    });
    
    if (response.ok) {
      console.log('✅ Servidor local está rodando e respondendo');
      const result = await response.json();
      console.log('   Resposta:', result);
    } else {
      console.log('⚠️  Servidor local respondeu com erro');
      console.log('   Status:', response.status);
      const text = await response.text();
      console.log('   Resposta:', text);
    }
  } catch (error) {
    console.log('❌ Servidor local NÃO está acessível');
    console.log('   Erro:', error.message);
    console.log('\n   💡 Para iniciar o servidor:');
    console.log('   node send-email.cjs');
  }
}

// ========== Executar todos os testes ==========
async function runDiagnostics() {
  const success = await testBrevoConnection();
  
  await checkLocalServer();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RESUMO DO DIAGNÓSTICO                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (success) {
    console.log('✅ Brevo está configurado corretamente!');
    console.log('✅ E-mails estão sendo enviados com sucesso!');
    console.log('\n📧 Verifique sua caixa de entrada (e pasta de spam) em:', FROM_EMAIL);
    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique se o e-mail chegou');
    console.log('   2. Se não chegou, verifique a pasta de spam');
    console.log('   3. Verifique o Activity Feed do Brevo:');
    console.log('      https://app.brevo.com/campaigns/reports');
  } else {
    console.log('❌ Há problemas com a configuração do Brevo');
    console.log('\n🔧 Ações recomendadas:');
    console.log('   1. Revise os erros acima');
    console.log('   2. Verifique as credenciais no arquivo .env');
    console.log('   3. Acesse o dashboard do Brevo para mais detalhes');
  }
  
  console.log('\n');
}

runDiagnostics();
