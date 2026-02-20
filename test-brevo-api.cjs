// test-brevo-api.js
// Teste direto da API do Brevo para verificar se a chave API está funcionando

require('dotenv').config({ path: './.env', quiet: true });

const SibApiV3Sdk = require('sib-api-v3-sdk');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

console.log('Testando API do Brevo...');
console.log('BREVO_API_KEY:', BREVO_API_KEY ? 'definida' : 'não definida');
console.log('FROM_EMAIL:', FROM_EMAIL);

if (!BREVO_API_KEY) {
  console.error('ERRO: BREVO_API_KEY não definida!');
  process.exit(1);
}

if (!FROM_EMAIL) {
  console.error('ERRO: FROM_EMAIL não definida!');
  process.exit(1);
}

// Inicializar Brevo
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
sendSmtpEmail.subject = "Teste de API Brevo";
sendSmtpEmail.htmlContent = "<p>Este é um teste da API do Brevo.</p>";
sendSmtpEmail.sender = { name: "Natan General Service", email: FROM_EMAIL };
sendSmtpEmail.to = [{ email: "aislei@outlook.com.br" }];

console.log('Enviando e-mail de teste...');

apiInstance.sendTransacEmail(sendSmtpEmail)
  .then((data) => {
    console.log('SUCESSO: E-mail enviado!', data);
  })
  .catch((error) => {
    console.error('ERRO ao enviar e-mail:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Corpo:', error.response.body);
    }
  });