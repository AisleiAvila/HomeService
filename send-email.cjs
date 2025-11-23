// ...existing code...

// ...existing code...
// send-email.cjs
// Endpoint Node.js/Express para envio de e-mail via SendGrid
// Instale as dependências: npm install express @sendgrid/mail cors

const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 4001;

// Substitua pela sua chave da SendGrid
require('dotenv').config({ path: './.env' });


const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

// Log para depuração: mostra início e tamanho da chave usada
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY);
console.log('FROM_EMAIL:', process.env.FROM_EMAIL);

// Diagnóstico: logar variáveis de ambiente (parcialmente mascarado)
if (SENDGRID_API_KEY) {
  console.log('SENDGRID_API_KEY começa com:', SENDGRID_API_KEY.substring(0, 10), '... (tamanho:', SENDGRID_API_KEY.length, ')');
} else {
  console.error('ERRO: SENDGRID_API_KEY não definida!');
}
if (FROM_EMAIL) {
  console.log('FROM_EMAIL:', FROM_EMAIL);
} else {
  console.error('ERRO: FROM_EMAIL não definida!');
}

sgMail.setApiKey(SENDGRID_API_KEY);

// CORS explícito para frontend Angular local e Vercel (função para múltiplos domínios)
const allowedOrigins = new Set([
  'http://localhost:4200',
  'https://home-service-nu.vercel.app',
  'http://localhost:4001/api/send-email'
]);
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: ferramentas locais, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.post('/api/send-email', async (req, res) => {
  console.log('Corpo recebido:', req.body);
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
  }
  try {
    // Gera link de confirmação
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const confirmLink = `${baseUrl}/confirmar-email?email=${encodeURIComponent(to)}`;
    // Adiciona link ao corpo do e-mail
    const htmlWithLink = `${html}<br><br><a href='${confirmLink}' style='display:inline-block;padding:12px 24px;background:#22c55e;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;'>Confirmar cadastro</a><br><br>Ou copie e cole este link no navegador: ${confirmLink}`;
    await sgMail.send({
      to,
      from: FROM_EMAIL,
      subject,
      html: htmlWithLink,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    if (error.response && error.response.body) {
      console.error('Detalhe do erro:', error.response.body);
    }
    res.status(500).json({ error: 'Erro ao enviar e-mail.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de e-mail rodando na porta ${PORT}`);
});
