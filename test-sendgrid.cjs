// test-sendgrid.cjs
// Script para testar configuração do SendGrid

require('dotenv').config({ path: './.env' });
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

console.log('=== TESTE DE CONFIGURAÇÃO SENDGRID ===\n');

// Verificar variáveis de ambiente
if (!SENDGRID_API_KEY) {
  console.error('❌ ERRO: SENDGRID_API_KEY não está definida no arquivo .env');
  process.exit(1);
}

if (!FROM_EMAIL) {
  console.error('❌ ERRO: FROM_EMAIL não está definida no arquivo .env');
  process.exit(1);
}

console.log('✓ SENDGRID_API_KEY encontrada (comprimento:', SENDGRID_API_KEY.length, ')');
console.log('✓ FROM_EMAIL:', FROM_EMAIL);
console.log('\n--- Iniciando teste de envio ---\n');

sgMail.setApiKey(SENDGRID_API_KEY);

// Substitua pelo seu e-mail para receber o teste
const TEST_EMAIL = FROM_EMAIL; // ou substitua por seu e-mail pessoal

const msg = {
  to: TEST_EMAIL,
  from: FROM_EMAIL,
  subject: 'Teste SendGrid - HomeService',
  html: `
    <h2>Teste de Envio SendGrid</h2>
    <p>Este é um e-mail de teste para verificar se o SendGrid está configurado corretamente.</p>
    <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    <p>Se você recebeu este e-mail, o SendGrid está funcionando corretamente.</p>
  `,
};

async function testSendGrid() {
  try {
    console.log('Enviando e-mail de teste para:', TEST_EMAIL);
    const response = await sgMail.send(msg);
    
    console.log('\n✓ E-mail enviado com sucesso!');
    console.log('Status Code:', response[0].statusCode);
    console.log('Headers:', JSON.stringify(response[0].headers, null, 2));
    console.log('\nVerifique sua caixa de entrada (e também a pasta de spam).');
    
  } catch (error) {
    console.error('\n❌ ERRO ao enviar e-mail:');
    console.error('Mensagem:', error.message);
    
    if (error.response) {
      console.error('\nDetalhes do erro:');
      console.error('Status Code:', error.response.statusCode);
      console.error('Body:', JSON.stringify(error.response.body, null, 2));
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      
      // Interpretar erros comuns
      if (error.response.statusCode === 401) {
        console.error('\n⚠️  Problema de autenticação: Verifique se a SENDGRID_API_KEY está correta');
      } else if (error.response.statusCode === 403) {
        console.error('\n⚠️  Acesso negado: Verifique permissões da API Key ou sender verification');
      } else if (error.response.body?.errors) {
        console.error('\n⚠️  Erros específicos:');
        error.response.body.errors.forEach((err, i) => {
          console.error(`  ${i + 1}. ${err.message}`);
          if (err.field) console.error(`     Campo: ${err.field}`);
        });
      }
    }
  }
}

testSendGrid();
